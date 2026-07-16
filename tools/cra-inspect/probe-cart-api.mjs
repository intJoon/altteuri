import CDP from 'chrome-remote-interface';

async function run() {
  const targets = await CDP.List({ port: 9222 });
  let page = targets.find((t) => t.type === 'page' && /coupang\.com\/np\/search/.test(t.url));
  if (!page) {
    page = targets.find((t) => t.type === 'page' && /coupang\.com/.test(t.url));
  }
  if (!page) throw new Error('no coupang tab');
  const client = await CDP({ target: page.webSocketDebuggerUrl });
  const { Runtime, Page } = client;
  await Runtime.enable();
  await Page.enable();

  if (!/np\/search/.test(page.url)) {
    await Page.navigate({ url: 'https://www.coupang.com/np/search?q=%EA%B3%84%EB%9E%80&listSize=36' });
    await new Promise((r) => setTimeout(r, 5000));
  }

  const res = await Runtime.evaluate({
    expression: `(() => {
      const items = [...document.querySelectorAll('li[class*="ProductUnit_productUnit"]')].slice(0, 8);
      return items.map(li => {
        const a = li.querySelector('a[href*="/vp/products/"]');
        const href = a?.getAttribute('href') || a?.href || '';
        let url; try { url = new URL(href, location.origin); } catch { url = null; }
        return {
          href: href.slice(0, 180),
          productId: (url?.pathname.match(/\\/vp\\/products\\/(\\d+)/) || [])[1] || null,
          itemId: url?.searchParams.get('itemId') || li.getAttribute('data-item-id'),
          vendorItemId: url?.searchParams.get('vendorItemId') || li.getAttribute('data-vendor-item-id'),
          dataAttrs: [...li.attributes].filter(x => /item|vendor|product/i.test(x.name)).map(x => [x.name, x.value])
        };
      });
    })()`,
    returnByValue: true
  });
  console.log('SRP_LINKS', JSON.stringify(res.result.value, null, 2));

  const apiProbe = await Runtime.evaluate({
    expression: `(async () => {
      const ids = { productId: 4359588351, itemId: 5126006052, vendorItemId: 72435480433 };
      const vidArr = [String(ids.vendorItemId) + ':1'];
      const tries = [
        ['POST', 'https://www.coupang.com/vp/cart/addCart', { productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }],
        ['POST', 'https://www.coupang.com/vp/cart/addCart', { productId: ids.productId, vendorItemId: vidArr, quantity: 1 }],
        ['POST', 'https://www.coupang.com/vp/cart/addCart', { productId: String(ids.productId), vendorItemId: vidArr }],
        ['POST', 'https://www.coupang.com/vp/cart/addCartItem', { productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }],
        ['POST', 'https://www.coupang.com/vp/cart/add-cart-item', { productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }],
        ['POST', 'https://www.coupang.com/next-api/v1/cart/add-cart-item', { productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }],
        ['POST', 'https://www.coupang.com/next-api/v1/cart/add', { items: [{ productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }] }],
        ['POST', 'https://www.coupang.com/next-api/cart/add', { productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }],
        ['POST', 'https://www.coupang.com/next-api/cart/addCartItem', { productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }],
        ['POST', 'https://cart.coupang.com/cart/addCartItem.pang', new URLSearchParams({ productId: String(ids.productId), itemId: String(ids.itemId), vendorItemId: String(ids.vendorItemId), quantity: '1' }).toString(), 'form'],
        ['POST', 'https://cart.coupang.com/cart/add.pang', new URLSearchParams({ productId: String(ids.productId), vendorItemId: JSON.stringify(vidArr) }).toString(), 'form'],
        ['POST', 'https://www.coupang.com/vp/products/cart/add', { productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }],
      ];
      const out = [];
      for (const [method, url, body, kind] of tries) {
        const headers = { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json, text/plain, */*' };
        let reqBody = body;
        if (kind === 'form') headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
        else { headers['Content-Type'] = 'application/json'; reqBody = JSON.stringify(body); }
        try {
          const res = await fetch(url, { method, credentials: 'include', headers, body: reqBody });
          const text = await res.text();
          out.push({ method, url, status: res.status, text: text.slice(0, 250) });
        } catch (e) { out.push({ method, url, error: String(e) }); }
      }
      return out;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('API_PROBE', JSON.stringify(apiProbe.result.value, null, 2));

  await client.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
