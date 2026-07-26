# 알뜰이

[쿠팡](https://www.coupang.com) 검색 결과를 정렬·필터·표시 조정으로 더 알뜰하게 보는 Chrome 확장입니다. 모든 기능은 opt-in입니다.

## 설치

[altteuri.vercel.app](https://altteuri.vercel.app/)

1. `chrome://extensions` → **개발자 모드** 켜기
2. **압축해제된 확장 프로그램을 로드** → `apps/extension/` 선택

스토어 등록: [`docs/CHROME_WEB_STORE.md`](docs/CHROME_WEB_STORE.md) · zip: `npm run build:extension`

## 개발

[`CONTRIBUTING.md`](CONTRIBUTING.md) 참고.

```bash
npm ci && npm ci --prefix apps/web && npm run generate:extension-lib && npm test && npm run lint && npm run build:extension
```

## 구조

| 폴더 | 용도 |
|------|------|
| `apps/extension/` | Chrome 확장 |
| `apps/web/` | 소개 사이트 + 의견 API (Vercel Root: `apps/web`) |
| `assets/` | 브랜드·스토어·숏폼 에셋 |
| `shared/` | 공유 상수·순수 로직 |
| `docs/` | 운영 문서·법적 원본 |
| `tools/` | 스크립트·테스트 |

## 개인정보

설정은 브라우저에만 저장됩니다. [개인정보처리방침](docs/개인정보처리방침.md) · [이용약관](docs/이용약관.md)

쿠팡 비제휴 · [MIT](LICENSE)
