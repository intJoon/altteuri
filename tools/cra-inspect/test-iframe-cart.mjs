import CDP from 'chrome-remote-interface';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const targets = await CDP.List({ port: 9222 });
  const page = targets.find((t) => t.type === 'page' && /coupang\.com\/np\/search/.test(t.url));
  if (!page) throw new Error('search tab missing');
  const client = await CDP({ target: page.webSocketDebuggerUrl });
  const { Runtime } = client;
  await Runtime.enable();

  const res = await Runtime.evaluate({
    expression: `(async () => {
      const ids = { productId: '4359588351', itemId: '5126006052', vendorItemId: '72435480433' };
      const before = (() => {
        const el = document.querySelector('#headerCartCount, .cart-count, em.cart-count');
        const n = parseInt((el?.textContent || '').replace(/\\D/g, ''), 10);
        return Number.isFinite(n) ? n : null;
      })();
      const url = '/vp/products/' + ids.productId + '?itemId=' + ids.itemId + '&vendorItemId=' + ids.vendorItemId;
      const result = await new Promise((resolve) => {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;width:320px;height:480px;left:0;top:0;z-index:99999;background:#fff';
        let clickSent = false;
        let polls = 0;
        const timer = setInterval(() => {
          polls++;
          let doc; try { doc = iframe.contentDocument; } catch { return; }
          if (!doc || doc.readyState !== 'complete') return;
          const btn = doc.querySelector('button.prod-cart-btn') || [...doc.querySelectorAll('button')].find(b => /장바구니\\s*담기/.test((b.textContent||'').trim()));
          if (!clickSent && btn) {
            clickSent = true;
            btn.click();
          }
          const after = (() => {
            const el = document.querySelector('#headerCartCount, .cart-count, em.cart-count');
            const n = parseInt((el?.textContent || '').replace(/\\D/g, ''), 10);
            return Number.isFinite(n) ? n : null;
          })();
          if (polls > 40 || (clickSent && polls > 15)) {
            clearInterval(timer);
            resolve({
              before, after,
              foundBtn: !!btn,
              btnText: btn ? (btn.textContent||'').trim() : null,
              iframeHasCartText: /장바구니\\s*담기/.test(doc.body?.innerHTML || ''),
              success: before != null && after != null && after > before
            });
          }
        }, 500);
        iframe.src = url;
        document.body.appendChild(iframe);
      });
      return result;
    })()`,
    awaitPromise: true,
    returnByValue: true
  });
  console.log(JSON.stringify(res.result.value, null, 2));
  await client.close();
}
run().catch(console.error);
