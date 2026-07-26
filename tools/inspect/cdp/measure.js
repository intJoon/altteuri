const CDP = require('chrome-remote-interface');

const SELECTORS = [
  ["div.coupang-top-banner", "검색결과 상단 배너"],
  ["#product-list > li:has(button[aria-label='Ad information'])", "검색결과 그리드 광고 상품"],
  ["li.limited-time-offer", "한정 시간 특가 상품"],
  ["#srp-bottom-carousel-dco-container", "같이 보면 좋은 상품"],
  ["div.jikgu-promo", "전세계 핫딜 로켓직구 글로벌특가"],
  ["div.also-viewed", "이 상품을 검색한 다른 분들이 함께 본 상품"],
  ["li.best-seller", "최근 다른 고객이 많이 구매한 상품"]
];

(async () => {
  let client;
  try {
    const targets = await CDP.List({ port: 9222 });
    const page = targets.find(t => t.type === 'page' && /coupang\.com\/np\/search/.test(t.url)) || targets.find(t => t.type === 'page');
    if (!page) { console.log('NO_PAGE'); process.exit(1); }
    console.log('URL:', page.url);
    client = await CDP({ target: page.webSocketDebuggerUrl });
    const { Runtime } = client;
    await Runtime.enable();

    const expr = `(async () => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const H = document.body.scrollHeight;
      for (let y = 0; y <= document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await sleep(120); }
      window.scrollTo(0, document.body.scrollHeight); await sleep(400);
      window.scrollTo(0, 0); await sleep(200);
      const sels = ${JSON.stringify(SELECTORS)};
      const out = [];
      for (const [sel, name] of sels) {
        let top = null, count = 0;
        try {
          const els = document.querySelectorAll(sel);
          count = els.length;
          els.forEach(el => {
            const r = el.getBoundingClientRect();
            const y = r.top + window.scrollY;
            if (r.width > 0 && r.height > 0 && (top === null || y < top)) top = Math.round(y);
          });
        } catch (e) { out.push({ sel, name, error: String(e) }); continue; }
        out.push({ sel, name, count, top });
      }
      return out;
    })()`;

    const res = await Runtime.evaluate({ expression: expr, awaitPromise: true, returnByValue: true });
    if (res.exceptionDetails) { console.log('EXC', JSON.stringify(res.exceptionDetails)); }
    const arr = res.result.value || [];
    arr.sort((a, b) => ((a.top ?? 1e9) - (b.top ?? 1e9)));
    console.log('\n=== 세로 위치 순 (top px) ===');
    for (const r of arr) {
      console.log(String(r.top).padStart(7), '| count=' + r.count, '|', r.name, '|', r.sel);
    }
  } catch (e) {
    console.log('ERR', String(e));
  } finally {
    if (client) await client.close();
  }
})();
