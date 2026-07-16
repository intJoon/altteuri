
(function (root) {
  'use strict';

  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  
  var SPLIT = {
    'ㄳ':'ㄱㅅ','ㄵ':'ㄴㅈ','ㄶ':'ㄴㅎ','ㄺ':'ㄹㄱ','ㄻ':'ㄹㅁ','ㄼ':'ㄹㅂ','ㄽ':'ㄹㅅ','ㄾ':'ㄹㅌ','ㄿ':'ㄹㅍ','ㅀ':'ㄹㅎ','ㅄ':'ㅂㅅ',
    'ㅘ':'ㅗㅏ','ㅙ':'ㅗㅐ','ㅚ':'ㅗㅣ','ㅝ':'ㅜㅓ','ㅞ':'ㅜㅔ','ㅟ':'ㅜㅣ','ㅢ':'ㅡㅣ'
  };
  function splitJamo(j) { return SPLIT[j] || j; }

  var BASE = 0xac00, LAST = 0xd7a3;

  
  function disassemble(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var code = ch.charCodeAt(0);
      if (code >= BASE && code <= LAST) {
        var idx = code - BASE;
        out += CHO[Math.floor(idx / 588)];
        out += splitJamo(JUNG[Math.floor((idx % 588) / 28)]);
        var jong = idx % 28;
        if (jong > 0) out += splitJamo(JONG[jong]);
      } else {
        out += splitJamo(ch); 
      }
    }
    return out;
  }

  
  function getChoseong(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      var code = ch.charCodeAt(0);
      if (code >= BASE && code <= LAST) {
        out += CHO[Math.floor((code - BASE) / 588)];
      } else if (ch >= 'ㄱ' && ch <= 'ㅎ') {
        out += ch;
      }
    }
    return out;
  }

  
  function match(name, query) {
    var n = (name || '').toLowerCase();
    var q = (query || '').toLowerCase();
    if (!q) return true;
    if (/^[ㄱ-ㅎ\s]+$/.test(q)) {
      return getChoseong(n).indexOf(q.replace(/\s+/g, '')) !== -1;
    }
    return disassemble(n).indexOf(disassemble(q)) !== -1;
  }

  root.HangulSearch = { disassemble: disassemble, getChoseong: getChoseong, match: match };
})(typeof window !== 'undefined' ? window : this);
