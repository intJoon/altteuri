/*
 * 한글 초성/자모 검색 유틸 (빌드리스 MV3용 순수 JS)
 *
 * 방법론·자모 매핑 출처: es-hangul (MIT License, Toss)
 *   - https://github.com/toss/es-hangul
 *   - https://es-hangul.slash.page (getChoseong / disassemble)
 * es-hangul v2 권장 레시피를 그대로 이식:
 *   - 초성 검색: getChoseong(word).includes(초성입력)
 *   - 자모 부분일치: disassemble(x).includes(disassemble(y))  // hangulIncludes
 * ESM 전용 라이브러리를 확장에 번들 없이 쓰기 위해 동일 알고리즘만 재구현.
 */
(function (root) {
  'use strict';

  var CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  var JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
  var JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

  // 겹자모 분해표 (es-hangul 상수 기반). 쌍자음(ㄲㄸㅃㅆㅉ)은 분해하지 않음.
  var SPLIT = {
    'ㄳ':'ㄱㅅ','ㄵ':'ㄴㅈ','ㄶ':'ㄴㅎ','ㄺ':'ㄹㄱ','ㄻ':'ㄹㅁ','ㄼ':'ㄹㅂ','ㄽ':'ㄹㅅ','ㄾ':'ㄹㅌ','ㄿ':'ㄹㅍ','ㅀ':'ㄹㅎ','ㅄ':'ㅂㅅ',
    'ㅘ':'ㅗㅏ','ㅙ':'ㅗㅐ','ㅚ':'ㅗㅣ','ㅝ':'ㅜㅓ','ㅞ':'ㅜㅔ','ㅟ':'ㅜㅣ','ㅢ':'ㅡㅣ'
  };
  function splitJamo(j) { return SPLIT[j] || j; }

  var BASE = 0xac00, LAST = 0xd7a3;

  // 완성형/호환 자모 문자열을 초·중·종성으로 완전 분해한 문자열을 반환한다.
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
        out += splitJamo(ch); // 호환 자모(겹자모 포함)는 분해, 그 외 문자는 그대로
      }
    }
    return out;
  }

  // 각 음절의 초성만 모은 문자열(모음·공백·기호 제외). 이미 자음인 호환 자모는 유지.
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

  // 자연스러운 한글 검색: 순수 초성 입력이면 초성 검색, 그 외에는 자모 부분일치.
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
