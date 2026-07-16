import CDP from 'chrome-remote-interface';
const SRP = 'https://www.coupang.com/np/search?q=%EB%AC%B4%EC%84%A0%20%EC%B2%AD%EC%86%8C%EA%B8%B0&channel=user&listSize=72';

const SRP_SELS = [
  ['div.coupang-top-banner', '검색결과 상단 배너'],
  ['#product-list > li:has(button[aria-label="Ad information"])', '그리드 스폰서 광고 상품'],
  ['li.limited-time-offer', '한정 시간 특가 상품'],
  ['#srp-bottom-carousel-dco-container', '같이 보면 좋은 상품'],
  ['div.jikgu-promo', '로켓직구 글로벌특가 프로모션'],
  ['div.also-viewed', '다른 고객이 함께 본 상품']
];
const PDP_SELS = [
  ['div.twc-relative.twc-flex.twc-items-center.twc-justify-between.twc-border.twc-border-bluegray-300.twc-min-w-0', "'이런건 어때요?' 광고 추천 박스"],
  ['div.sdp-ads.impression-log:not(.twc-pt-\\[35px\\])', '연관 추천 상품 (광고)'],
  ['div.sdp-ads.impression-log.twc-pt-\\[35px\\]', '함께 비교하면 좋을 상품 (광고)'],
  ['div.product-btf-container div.carousel-widget-container.gw_promotion:not(.seven-items-promotion)', '오늘의 판매자 특가 (광고)'],
  ['div.product-btf-container div.carousel-widget-container.gw_promotion.seven-items-promotion', '로켓직구 글로벌특가 (광고)'],
  ['div.also-view.twc-my-0.twc-mx-auto', '다른 고객이 함께 본 상품'],
  ['#midCarousel2', "'이런 상품은 어때요?' 광고 캐러셀"],
  ['#midCarousel3', "'4점 이상 리뷰 좋은 상품' 광고 캐러셀"],
  ['div.also-bought', '다른 고객이 함께 구매한 상품'],
  ['#brandOtherProducts', '브랜드의 다른 상품들'],
  ['div.sdp-bottom-banner-191126', "'고르고 골랐어요' 하단 배너 (광고)"]
];
function measure(sels) {
  const topOf = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.top + window.scrollY); };
  return sels.map(([sel, label]) => { let els = []; try { els = Array.from(document.querySelectorAll(sel)); } catch (e) { return { label, sel, err: e.message }; } const tops = els.map(topOf).filter(t => t > 0).sort((a, b) => a - b); return { label, sel, count: els.length, top: tops[0] ?? null }; }).sort((a, b) => (a.top ?? 1e9) - (b.top ?? 1e9));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function nav(P, R, u, ms = 9000) { await P.navigate({ url: u }); const t = Date.now(); while (Date.now() - t < ms) { await sleep(500); try { if ((await R.evaluate({ expression: 'document.readyState', returnByValue: true })).result.value === 'complete') { await sleep(1500); break; } } catch {} } }
async function scr(R) { try { await R.evaluate({ expression: `(async()=>{const H=document.body.scrollHeight;for(let y=0;y<H;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,110));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,700));})()`, awaitPromise: true }); } catch {} }
async function ej(R, fn, a) { return JSON.parse((await R.evaluate({ expression: `JSON.stringify((${fn.toString()})(${JSON.stringify(a)}))`, returnByValue: true })).result.value); }
async function run() { const c = await CDP({ port: 9222 }); const { Page, Runtime } = c; await Page.enable(); await Runtime.enable(); const o = {}; await nav(Page, Runtime, SRP); await scr(Runtime); await sleep(400); o.SRP = await ej(Runtime, measure, SRP_SELS); const link = (await Runtime.evaluate({ expression: `(()=>{const a=document.querySelector('a[href*="/vp/products/"]');return a?a.href:'';})()`, returnByValue: true })).result.value; await nav(Page, Runtime, link); await scr(Runtime); await sleep(400); o.PDP = { url: link, order: await ej(Runtime, measure, PDP_SELS) }; await c.close(); console.log(JSON.stringify(o, null, 2)); }
run().catch(e => { console.error('ERR', e); process.exit(1); });
