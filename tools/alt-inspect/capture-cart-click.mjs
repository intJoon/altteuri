import CDP from 'chrome-remote-interface';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  const targets = await CDP.List({ port: 9222 });
  const page = targets.find((t) => t.type === 'page' && /coupang\.com\/vp\/products\/4359588351/.test(t.url));
  if (!page) throw new Error('PDP tab not found');
  const client = await CDP({ target: page.webSocketDebuggerUrl });
  const { Runtime, Network, Page, DOM } = client;
  await Runtime.enable();
  await Network.enable();
  await Page.enable();
  await DOM.enable();

  const requests = [];
  Network.requestWillBeSent((params) => {
    const { request, type } = params;
    const url = request.url;
    if (/cart|add|pang|next-api/i.test(url) && request.method !== 'GET') {
      requests.push({
        url,
        method: request.method,
        headers: request.headers,
        postData: request.postData || null,
        type
      });
    }
  });

  const hook = await Runtime.evaluate({
    expression: `(() => {
      window.__altCartCaptures = [];
      if (!window.__altCartHooked) {
        window.__altCartHooked = true;
        const push = (kind, url, body, method) => {
          if (/cart|add|pang|next-api/i.test(url)) window.__altCartCaptures.push({ kind, url, body, method, t: Date.now() });
        };
        const origFetch = window.fetch;
        window.fetch = async function(...args) {
          const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
          const method = args[1]?.method || 'GET';
          const body = args[1]?.body;
          push('fetch', url, body, method);
          return origFetch.apply(this, args);
        };
        const XO = XMLHttpRequest.prototype.open;
        const XS = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url, ...rest) {
          this.__altUrl = url; this.__altMethod = method;
          return XO.call(this, method, url, ...rest);
        };
        XMLHttpRequest.prototype.send = function(body) {
          push('xhr', this.__altUrl, body, this.__altMethod);
          return XS.call(this, body);
        };
      }
      return { hooked: true };
    })()`,
    returnByValue: true
  });
  console.log('hook', hook.result.value);

  const dom = await Runtime.evaluate({
    expression: `(() => {
      const btn = document.querySelector('button.prod-cart-btn') || [...document.querySelectorAll('button')].find(b => /장바구니 담기/.test(b.textContent||''));
      if (!btn) {
        return {
          found: false,
          buttons: [...document.querySelectorAll('button')].slice(0, 30).map(b => ({ cls: b.className, text: (b.textContent||'').trim().slice(0,40) }))
        };
      }
      btn.scrollIntoView({ block: 'center' });
      return { found: true, cls: btn.className, text: btn.textContent.trim(), disabled: btn.disabled };
    })()`,
    returnByValue: true
  });
  console.log('dom', JSON.stringify(dom.result.value, null, 2));

  if (dom.result.value?.found) {
    await Runtime.evaluate({
      expression: `(() => {
        const btn = document.querySelector('button.prod-cart-btn') || [...document.querySelectorAll('button')].find(b => /장바구니 담기/.test(b.textContent||''));
        btn.click();
        return true;
      })()`
    });
    await sleep(4000);
  }

  const captures = await Runtime.evaluate({
    expression: 'window.__altCartCaptures || []',
    returnByValue: true
  });
  console.log('JS_CAPTURES', JSON.stringify(captures.result.value, null, 2));
  console.log('NET_CAPTURES', JSON.stringify(requests, null, 2));

  const scripts = await Runtime.evaluate({
    expression: `(() => {
      const hits = [];
      for (const s of document.scripts) {
        const src = s.src || '';
        if (/sdp|product|cart|buy/i.test(src)) hits.push(src);
      }
      return hits.slice(0, 30);
    })()`,
    returnByValue: true
  });
  console.log('SCRIPTS', JSON.stringify(scripts.result.value, null, 2));

  await client.close();
}

run().catch((e) => { console.error('ERR', e); process.exit(1); });
