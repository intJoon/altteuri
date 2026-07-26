import CDP from 'chrome-remote-interface';
const PDPS = [
  'https://www.coupang.com/vp/products/8487676872?itemId=24564924829&vendorItemId=91577043134',
  'https://www.coupang.com/vp/products/6348180907?itemId=13347030643&vendorItemId=84884256787'
];
const SELS = [
  ['함께비교', 'div.sdp-ads.impression-log.twc-pt-\\[35px\\]'],
  ['연관추천', 'div.sdp-ads.impression-log:not(.twc-pt-\\[35px\\])'],
  ['gw-로켓직구', 'div.product-btf-container div.carousel-widget-container.gw_promotion.seven-items-promotion'],
  ['gw-판매자특가', 'div.product-btf-container div.carousel-widget-container.gw_promotion:not(.seven-items-promotion)'],
  ['mid2', '#midCarousel2'],
  ['mid3', '#midCarousel3']
];
function check(sels) {
  const clip = (s, n) => (s || '').replace(/\s+/g, ' ').trim().slice(0, 35);
  const topOf = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.top + window.scrollY); };
  return sels.map(([lab, sel]) => { let l = []; try { l = Array.from(document.querySelectorAll(sel)); } catch (e) { return { lab, err: e.message }; } return { lab, count: l.length, top: l[0] ? topOf(l[0]) : null, text: l[0] ? clip(l[0].innerText) : '' }; });
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function nav(P, R, u, ms = 9000) { await P.navigate({ url: u }); const t = Date.now(); while (Date.now() - t < ms) { await sleep(500); try { if ((await R.evaluate({ expression: 'document.readyState', returnByValue: true })).result.value === 'complete') { await sleep(1500); break; } } catch {} } }
async function scr(R) { try { await R.evaluate({ expression: `(async()=>{const H=document.body.scrollHeight;for(let y=0;y<H;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,110));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,700));})()`, awaitPromise: true }); } catch {} }
async function ej(R, fn, a) { return JSON.parse((await R.evaluate({ expression: `JSON.stringify((${fn.toString()})(${JSON.stringify(a)}))`, returnByValue: true })).result.value); }
async function run() { const c = await CDP({ port: 9222 }); const { Page, Runtime } = c; await Page.enable(); await Runtime.enable(); const o = {}; for (const u of PDPS) { await nav(Page, Runtime, u); await scr(Runtime); await sleep(400); o[u.split('/products/')[1].slice(0, 10)] = (await ej(Runtime, check, SELS)).sort((a, b) => (a.top ?? 1e9) - (b.top ?? 1e9)); } await c.close(); console.log(JSON.stringify(o, null, 2)); }
run().catch(e => { console.error('ERR', e); process.exit(1); });
