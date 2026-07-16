import CDP from 'chrome-remote-interface';

async function run() {
  const targets = await CDP.List({ port: 9222 });
  const page = targets.find((t) => t.type === 'page' && /coupang\.com/.test(t.url));
  const client = await CDP({ target: page.webSocketDebuggerUrl });
  const { Runtime } = client;
  await Runtime.enable();

  const res = await Runtime.evaluate({
    expression: `(async () => {
      const ids = { productId: 4359588351, itemId: 5126006052, vendorItemId: 72435480433 };
      const vidArr = [String(ids.vendorItemId) + ':1'];
      const baseBodies = [
        { productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 },
        { productId: ids.productId, vendorItemId: vidArr },
        { cartItemRequests: [{ productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId, quantity: 1 }] },
      ];
      const urls = [
        'https://www.coupang.com/vp/cart/addCart',
        'https://www.coupang.com/vp/cart/add-cart',
        'https://www.coupang.com/vp/cart/add',
        'https://www.coupang.com/vp/cart/item/add',
        'https://www.coupang.com/vp/cart/items',
      ];
      const methods = ['POST', 'PUT', 'PATCH', 'GET'];
      const out = [];
      for (const url of urls) {
        for (const method of methods) {
          for (const body of baseBodies) {
            const headers = { Accept: 'application/json, text/plain, */*', 'X-Requested-With': 'XMLHttpRequest' };
            let reqUrl = url;
            let reqBody;
            if (method === 'GET') {
              const q = new URLSearchParams({ productId: String(ids.productId), itemId: String(ids.itemId), vendorItemId: String(ids.vendorItemId), quantity: '1' });
              reqUrl = url + '?' + q.toString();
            } else {
              headers['Content-Type'] = 'application/json';
              reqBody = JSON.stringify(body);
            }
            try {
              const res = await fetch(reqUrl, { method, credentials: 'include', headers, body: reqBody });
              const text = await res.text();
              if (res.status !== 404 && res.status !== 405) {
                out.push({ method, url, body, status: res.status, text: text.slice(0, 300) });
              }
            } catch (e) {}
          }
        }
      }

      const scriptHits = [];
      for (const s of document.scripts) {
        const src = s.src;
        if (!src || !/coupangcdn|coupang\.com/.test(src)) continue;
        try {
          const r = await fetch(src, { credentials: 'omit' });
          const t = await r.text();
          const re = /["']([^"']*(?:cart|Cart)[^"']{0,80})["']/g;
          let m;
          while ((m = re.exec(t)) && scriptHits.length < 80) {
            const v = m[1];
            if (/add|cart|pang|api/i.test(v) && v.length < 120) scriptHits.push({ src: src.split('/').pop(), v });
          }
        } catch {}
      }

      const productApi = await fetch('https://www.coupang.com/vp/products/product', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ productId: ids.productId, itemId: ids.itemId, vendorItemId: ids.vendorItemId })
      }).then(async r => ({ status: r.status, text: (await r.text()).slice(0, 500) })).catch(e => ({ error: String(e) }));

      return { interesting: out, scriptHits: [...new Map(scriptHits.map(x => [x.v, x])).values()].slice(0, 40), productApi };
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log(JSON.stringify(res.result.value, null, 2));
  await client.close();
}
run().catch(console.error);
