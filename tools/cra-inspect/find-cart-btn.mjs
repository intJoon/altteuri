import CDP from 'chrome-remote-interface';

async function run() {
  const targets = await CDP.List({ port: 9222 });
  const page = targets.find((t) => t.type === 'page' && /coupang\.com\/vp\/products\/4359588351/.test(t.url));
  const client = await CDP({ target: page.webSocketDebuggerUrl });
  const { Runtime } = client;
  await Runtime.enable();
  const res = await Runtime.evaluate({
    expression: `(() => {
      const all = [...document.querySelectorAll('button, [role="button"]')];
      const cartish = all.filter(b => /prod-cart|장바구니|cart/i.test((b.className||'') + ' ' + (b.outerHTML||'').slice(0,500)));
      return {
        cartish: cartish.map(b => ({ tag:b.tagName, cls:b.className, html:b.outerHTML.slice(0,300), text:(b.textContent||'').trim().slice(0,50) })),
        prodCart: document.querySelectorAll('.prod-cart-btn').length,
        buyBox: !!document.querySelector('[class*="buybox"], [class*="BuyBox"], [class*="option-bar"], [class*="OptionBar"]'),
        bodyHasCartText: /장바구니 담기/.test(document.body.innerHTML),
        htmlSnippet: (document.body.innerHTML.match(/prod-cart-btn[\\s\\S]{0,200}/) || [])[0] || null
      };
    })()`,
    returnByValue: true
  });
  console.log(JSON.stringify(res.result.value, null, 2));
  await client.close();
}
run().catch(console.error);
