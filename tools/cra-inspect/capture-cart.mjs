import CDP from 'chrome-remote-interface';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const targets = await CDP.List({ port: 9222 });
  const page = targets.find((t) => t.type === 'page' && /coupang\.com\/vp\/products/.test(t.url));
  const client = await CDP({ target: page.webSocketDebuggerUrl });
  const { Runtime } = client;
  await Runtime.enable();

  const res = await Runtime.evaluate({
    expression: `(() => {
      const out = {};
      try {
        const nd = document.getElementById('__NEXT_DATA__');
        if (nd) {
          const j = JSON.parse(nd.textContent);
          const s = JSON.stringify(j);
          const hits = [];
          for (const key of ['add-cart', 'addCart', 'cart/add', 'next-api/cart', 'vendorItemId', 'addCartItem']) {
            let i = 0; while ((i = s.indexOf(key, i)) >= 0 && hits.length < 5) { hits.push(s.slice(Math.max(0,i-80), i+120)); i++; }
          }
          out.nextHits = hits;
        }
      } catch (e) { out.nextErr = String(e); }
      const keys = Object.keys(window).filter(k => /cart|buy|sdp|product/i.test(k)).slice(0, 40);
      out.winKeys = keys;
      for (const k of keys) {
        try {
          const v = window[k];
          if (v && typeof v === 'object') {
            const s = JSON.stringify(v);
            if (/addCart|cart\\/add|next-api\\/cart/i.test(s)) out[k] = s.slice(0, 500);
          }
        } catch {}
      }
      const html = document.documentElement.innerHTML;
      const apiHits = [];
      for (const re of [/next-api\\/cart[^"'\\s]*/g, /cart\\/add[^"'\\s]*/g, /addCartItem[^"'\\s]*/g]) {
        const m = html.match(re);
        if (m) apiHits.push(...m.slice(0, 10));
      }
      out.apiHits = [...new Set(apiHits)].slice(0, 20);
      return out;
    })()`,
    returnByValue: true
  });
  console.log(JSON.stringify(res.result.value, null, 2));

  const fetchTest = await Runtime.evaluate({
    expression: `(async () => {
      const ids = { productId: 4359588351, itemId: 5126006052, vendorItemId: 72435480433 };
      const attempts = [];
      const tries = [
        ['https://www.coupang.com/next-api/cart/add-cart-item', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({...ids, quantity:1}) }],
        ['https://www.coupang.com/next-api/cart/add-cart-item', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ cartItemRequests:[{...ids, quantity:1}] }) }],
        ['https://www.coupang.com/next-api/cart/add-cart-item', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ productId: ids.productId, vendorItemId: [String(ids.vendorItemId)+':1'], itemId: ids.itemId }) }],
        ['https://cart.coupang.com/cart/add.pang', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, credentials:'include', body: new URLSearchParams({ productId:String(ids.productId), itemId:String(ids.itemId), vendorItemId:String(ids.vendorItemId), quantity:'1' }).toString() }],
        ['https://cart.coupang.com/cart/addCartItem.pang', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, credentials:'include', body: new URLSearchParams({ productId:String(ids.productId), itemId:String(ids.itemId), vendorItemId:String(ids.vendorItemId), quantity:'1' }).toString() }],
        ['https://www.coupang.com/vp/cart/addCart', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({...ids, quantity:1}) }],
      ];
      for (const [url, opts] of tries) {
        try {
          const res = await fetch(url, opts);
          const text = await res.text();
          attempts.push({ url, status: res.status, text: text.slice(0, 300) });
        } catch (e) {
          attempts.push({ url, error: String(e) });
        }
      }
      return attempts;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('FETCH_TEST', JSON.stringify(fetchTest.result.value, null, 2));
  await client.close();
}

run().catch((e) => { console.error('ERR', e); process.exit(1); });
