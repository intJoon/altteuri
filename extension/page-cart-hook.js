(function () {
  function isCartUrl(u) {
    return /cart|addCart|add-cart|addtocart|basket|buybox|addItem/i.test(String(u || ''));
  }

  function lookOk(text, status) {
    if (!(status >= 200 && status < 300)) return false;
    if (!text) return true;
    try {
      const j = JSON.parse(text);
      if (j.success === false || j.error === true || j.rCode === 'FAIL') return false;
      if (
        j.success === true ||
        j.rCode === 'RET0000' ||
        j.result === 'SUCCESS' ||
        j.ret === 'OK' ||
        j.code === 0
      ) {
        return true;
      }
    } catch (e) {}
    if (/"ret"\s*:\s*"OK"|성공|SUCCESS|"rCode"\s*:\s*"RET0000"/i.test(text)) return true;
    return true;
  }

  function mark(ok) {
    const v = ok ? 'ok' : 'fail';
    try {
      document.documentElement.setAttribute('data-alt-cart', v);
    } catch (e) {}
    try {
      window.parent.postMessage({ __altCart: v }, '*');
    } catch (e) {}
  }

  function clickProdCart() {
    const btn =
      document.querySelector('button.prod-cart-btn') ||
      Array.from(document.querySelectorAll('button')).find((x) =>
        /장바구니\s*담기/.test((x.textContent || '').trim())
      );
    if (btn) btn.click();
  }

  function install() {
    try {
      document.documentElement.removeAttribute('data-alt-cart');
    } catch (e) {}

    if (window.__altCartWatch) return;
    window.__altCartWatch = 1;

    if (window.fetch) {
      const of = window.fetch;
      window.fetch = function () {
        const a = arguments;
        const url = typeof a[0] === 'string' ? a[0] : a[0] && a[0].url;
        return of.apply(this, a).then(function (res) {
          if (isCartUrl(url) || isCartUrl(res && res.url)) {
            res
              .clone()
              .text()
              .then(function (t) {
                mark(lookOk(t, res.status));
              })
              .catch(function () {
                mark(!!res.ok);
              });
          }
          return res;
        });
      };
    }

    const xo = XMLHttpRequest.prototype.open;
    const xs = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (m, u) {
      this.__altU = u;
      return xo.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function (b) {
      this.addEventListener('load', function () {
        if (isCartUrl(this.__altU)) mark(lookOk(this.responseText, this.status));
      });
      this.addEventListener('error', function () {
        if (isCartUrl(this.__altU)) mark(false);
      });
      return xs.apply(this, arguments);
    };

    window.addEventListener('message', function (e) {
      if (!e.data || e.data.__altCartCmd !== 'click') return;
      clickProdCart();
    });
  }

  install();
})();
