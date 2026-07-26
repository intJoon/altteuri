import CDP from 'chrome-remote-interface';

const SRP = 'https://www.coupang.com/np/search?q=%EB%AC%B4%EC%84%A0%20%EC%B2%AD%EC%86%8C%EA%B8%B0&channel=user&listSize=72';

function srpDump() {
  const clip = (s, n) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const topOf = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.top + window.scrollY); };
  const out = {};
  const containers = ['#product-list', '#productList', 'ul#productList', 'ul#product-list'];
  out.container = containers.find(c => document.querySelector(c)) || null;
  const listSel = out.container || '#product-list';
  const lis = Array.from(document.querySelectorAll(listSel + ' > li'));
  out.totalLi = lis.length;
  const hasAdInfo = lis.filter(li => li.querySelector('button[aria-label="Ad information"]'));
  const hasCampaign = lis.filter(li => li.querySelector('a[href*="/np/campaigns/"]'));
  const hasAdSpan = lis.filter(li => Array.from(li.querySelectorAll('span')).some(s => s.textContent.trim() === '광고'));
  out.countAdInfo = hasAdInfo.length;
  out.countCampaign = hasCampaign.length;
  out.countAdSpan = hasAdSpan.length;
  const trySel = (sel) => { try { return document.querySelectorAll(sel).length; } catch (e) { return 'ERR:' + e.message; } };
  out.hasSelCampaign = trySel(listSel + ' > li:has(a[href*="/np/campaigns/"])');
  out.hasSelAdInfo = trySel(listSel + ' > li:has(button[aria-label="Ad information"])');
  const firstSpon = hasAdInfo[0] || hasCampaign[0] || hasAdSpan[0];
  out.firstSponsoredTop = firstSpon ? topOf(firstSpon) : null;
  out.sampleSponsoredCls = firstSpon ? clip(firstSpon.className, 90) : '';
  const measure = (sel) => { try { const els = Array.from(document.querySelectorAll(sel)); const tops = els.map(topOf).filter(t => t > 0).sort((a, b) => a - b); return { count: els.length, top: tops[0] ?? null }; } catch (e) { return { err: e.message }; } };
  out.order = {
    'coupang-top-banner': measure('div.coupang-top-banner'),
    'limited-time-offer': measure('li.limited-time-offer'),
    'srp-bottom-carousel': measure('#srp-bottom-carousel-dco-container'),
    'jikgu-promo': measure('div.jikgu-promo'),
    'also-viewed': measure('div.also-viewed'),
    'grid-ads(campaign)': measure(listSel + ' > li:has(a[href*="/np/campaigns/"])')
  };
  return out;
}

function pdpDump() {
  const clip = (s, n) => (s || '').replace(/\s+/g, ' ').trim().slice(0, n);
  const clsOf = (el) => clip(el.className && el.className.baseVal !== undefined ? el.className.baseVal : (typeof el.className === 'string' ? el.className : ''), 70);
  const topOf = (el) => { const r = el.getBoundingClientRect(); return Math.round(r.top + window.scrollY); };
  const headingOf = (el) => { let n = el, h = 0; while (n && h < 4) { const t = n.querySelector && n.querySelector('h1,h2,h3,h4,[class*="title"],[class*="Title"]'); if (t && clip(t.textContent, 30)) return clip(t.textContent, 30); n = n.parentElement; h++; } return clip(el.innerText, 30); };
  const ancChain = (el) => { const out = []; let n = el.parentElement, h = 0; while (n && h < 5) { out.push((n.tagName ? n.tagName.toLowerCase() : '?') + (n.id ? '#' + n.id : '') + (n.className ? '.' + clsOf(n).split(' ').slice(0, 2).join('.') : '')); n = n.parentElement; h++; } return out; };
  const out = {};
  out.sdpAds = Array.from(document.querySelectorAll('div.sdp-ads.impression-log')).map(el => ({ top: topOf(el), heading: headingOf(el), cls: clsOf(el), anc: ancChain(el) }));
  const m2 = document.querySelector('#midCarousel2'); const m3 = document.querySelector('#midCarousel3');
  out.mid2 = m2 ? { top: topOf(m2), heading: headingOf(m2) } : null;
  out.mid3 = m3 ? { top: topOf(m3), heading: headingOf(m3) } : null;
  const measure = (sel) => { try { const els = Array.from(document.querySelectorAll(sel)); const tops = els.map(topOf).filter(t => t > 0).sort((a, b) => a - b); return { count: els.length, top: tops[0] ?? null }; } catch (e) { return { err: e.message }; } };
  out.order = {
    'twc-box': measure('div.twc-relative.twc-flex.twc-items-center.twc-justify-between.twc-border.twc-border-bluegray-300.twc-min-w-0'),
    'sdp-ads(all)': measure('div.sdp-ads.impression-log'),
    'sdp-ads(btf=함께비교)': measure('div.product-btf-container div.sdp-ads.impression-log'),
    'gw(btf)': measure('div.product-btf-container div.carousel-widget-container.gw_promotion'),
    'also-view': measure('div.also-view.twc-my-0.twc-mx-auto'),
    'mid2': measure('#midCarousel2'),
    'mid3': measure('#midCarousel3'),
    'also-bought': measure('div.also-bought'),
    'brandOtherProducts': measure('#brandOtherProducts'),
    'sdp-bottom-banner': measure('div.sdp-bottom-banner-191126')
  };
  return out;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
async function nav(P, R, u, ms = 9000) { await P.navigate({ url: u }); const t = Date.now(); while (Date.now() - t < ms) { await sleep(500); try { if ((await R.evaluate({ expression: 'document.readyState', returnByValue: true })).result.value === 'complete') { await sleep(1500); break; } } catch {} } }
async function scr(R) { try { await R.evaluate({ expression: `(async()=>{const H=document.body.scrollHeight;for(let y=0;y<H;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,110));}window.scrollTo(0,0);await new Promise(r=>setTimeout(r,700));})()`, awaitPromise: true }); } catch {} }
async function ej(R, fn) { return JSON.parse((await R.evaluate({ expression: `JSON.stringify((${fn.toString()})())`, returnByValue: true })).result.value); }

async function run() {
  const c = await CDP({ port: 9222 }); const { Page, Runtime } = c; await Page.enable(); await Runtime.enable();
  const o = {};
  await nav(Page, Runtime, SRP); await scr(Runtime); await sleep(500);
  o.SRP = await ej(Runtime, srpDump);
  const link = (await Runtime.evaluate({ expression: `(()=>{const a=document.querySelector('a[href*="/vp/products/"]');return a?a.href:'';})()`, returnByValue: true })).result.value;
  await nav(Page, Runtime, link); await scr(Runtime); await sleep(500);
  o.PDP = { url: link, ...(await ej(Runtime, pdpDump)) };
  await c.close(); console.log(JSON.stringify(o, null, 2));
}
run().catch(e => { console.error('ERR', e); process.exit(1); });
