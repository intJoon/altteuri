# Chrome 웹 스토어 등록 — 알뜰이

스토어 제출 체크리스트와 등록 문구. `apps/extension/manifest.json`, [`README.md`](../README.md)와 맞춥니다.

## 업로드 패키지 빌드

```bash
npm run build:extension
```

산출물: `dist/altteuri-extension-v{version}.zip` (manifest가 zip 루트).

## 필수 에셋

| 에셋 | 크기 | 파일 / 출처 |
| --- | --- | --- |
| 아이콘 | 128×128 | `apps/extension/assets/icons/icon128.png` (원본: `assets/brand/`) |
| 스크린샷 | 1280×800 (최소 1, 최대 5) | `assets/store/screenshots/*.html` 또는 실제 확장 캡처 |
| 프로모 타일(선택) | 440×280 | `assets/store/promo-tile.svg` → PNG 내보내기 |
| 소형 프로모(선택) | 440×280 | 프로모 타일과 동일 |

`assets/store/screenshots/` 아래 HTML을 Chrome 100% 줌으로 연 뒤 DevTools → 전체 크기 스크린샷, 또는 OS 스크린샷 1280×800.

## 등록 문구 (한국어)

**이름:** 알뜰이

**요약(132자 이내):**  
쿠팡 검색에서 단위가격·할인율·가격 정렬, 키워드 필터, 표시 항목 조정. 모든 기능은 꺼진 채로 시작하며 사용자가 켭니다.

**설명:**

```
쿠팡 검색 결과를 더 알뜰하게 비교하는 Chrome 확장입니다.

■ 모든 기능은 opt-in
설치만으로 페이지가 바뀌지 않습니다. 확장 팝업에서 원하는 기능만 켜세요.

■ 정렬
단위가격순, 할인율순, 가격순으로 검색 결과를 재정렬합니다.

■ 키워드 필터
제외할 키워드를 추가하면 해당 상품을 숨깁니다. 검색어를 바꾸면 제외 목록이 초기화됩니다.

■ 페이지 표시 항목 조정
광고·배너 등 표시할 요소를 선택합니다. 체크 해제한 항목만 숨깁니다.

■ 검색 개수 고정
36·48·60·72개 중 선택한 개수로 검색 URL을 맞춥니다.

■ 의견 보내기 (선택)
확장에서 제출한 의견은 공개 목록에 표시될 수 있습니다. 개인정보는 넣지 마세요.

알뜰이는 쿠팡과 제휴하지 않은 독립 오픈소스 프로젝트입니다.
소스 코드: https://github.com/intJoon/altteuri
홈페이지: https://altteuri.vercel.app/
```

**카테고리:** Shopping

**언어:** Korean

**개인정보처리방침 URL:** https://altteuri.vercel.app/legal.html#privacy

**홈페이지 URL:** https://altteuri.vercel.app/ (manifest에도 동일)

## 권한·호스트 사유 (심사용)

| 권한 / 호스트 | 사용자 대면 사유 |
| --- | --- |
| `storage` | 기능별 설정을 로컬에 저장 |
| `tabs` | 설정 마이그레이션 후 쿠팡 탭 새로고침, 법적·의견 링크 열기 |
| `https://www.coupang.com/*` | 쿠팡 검색·관련 페이지에서 동작 |
| `https://cart.coupang.com/*`, `https://mc.coupang.com/*` | 장바구니·주문 페이지 표시 프리셋 |
| `https://altteuri.vercel.app/*` | 선택적 공개 의견 제출·목록 |

## 단일 목적

사용자가 이미 방문하는 쿠팡 페이지에서 정렬·필터·표시 프리셋 등 선택적 쇼핑 보조. 무관한 브라우징 변경 없음.

## 데이터 사용

- 설정: `chrome.storage.sync`만 사용, 서버로 전송하지 않음.
- 의견(선택): 텍스트 + 확장 버전을 Vercel API로 전송, 공개 목록에 표시될 수 있음. 개인정보처리방침 참고.

## 제출 전 QA

1. `npm run build:extension` — zip을 `chrome://extensions`에서 로드 가능한지 확인.
2. [`docs/QC.md`](QC.md) 수동 체크리스트를 빌드에 실행.
3. `minimum_chrome_version` **105** 확인 (`:has()` 프리셋).
4. 기능 전부 꺼짐 → 회색 아이콘, 하나라도 켜짐 → 컬러 아이콘.

## 게시 후

- `apps/web/public/index.html` 설치 CTA에 Chrome 웹 스토어 URL 추가.
- `README.md` 설치 섹션에 스토어 링크 추가.
- manifest 버전과 맞는 GitHub 릴리스 태그.
