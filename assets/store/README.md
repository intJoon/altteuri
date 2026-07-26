# Chrome 웹 스토어 에셋

등록 문구·빌드 절차: [`docs/CHROME_WEB_STORE.md`](../../docs/CHROME_WEB_STORE.md).

## 스크린샷 템플릿 (1280×800)

Chrome에서 창 1280×800(또는 DevTools 기기 모드)으로 연 뒤 캡처:

| 파일 | 장면 |
| --- | --- |
| `screenshots/01-popup.html` | 확장 팝업 — 기능 꺼짐 |
| `screenshots/02-sort.html` | 검색 결과 단위가격 정렬 |
| `screenshots/03-filter.html` | 키워드 필터 |
| `screenshots/04-display.html` | 표시 항목 조정 |

## 프로모 타일

`promo-tile.svg` — 선택 스토어 프로모용 440×280 PNG로 내보내기.

## 패키지

```bash
npm run build:extension
```
