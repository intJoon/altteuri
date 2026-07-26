# 기여 가이드

## PR 전 확인

```bash
npm ci
npm ci --prefix apps/web
npm run generate:extension-lib
npm test
npm run lint
npm run build:extension
```

- 법적 문서: `npm run generate:legal && npm test`
- 공유 로직: `npm run generate:extension-lib && npm test`

## 함께 수정할 항목

| 변경 | 함께 확인 |
|------|-----------|
| 설정 키 | `apps/extension/lib/settings-defaults.js`, 팝업 UI, `settings-bridge.js`, `docs/업그레이드.md`, 테스트 |
| 쿠팡 DOM | `content/selectors.js`, `lib/preset-data.js`, `docs/출처.md`, `docs/QC.md`, 셀렉터 스모크 |
| 온보딩 | `content/onboarding-banner.js`, e2e 스모크 |
| 브랜드 아이콘 | `assets/brand/`, `npm run sync:assets` |
| 릴리스 | `node tools/scripts/release.mjs <semver>`, `docs/버전.md` |
| 공개 origin | `shared/site-config.mjs`, manifest `homepage_url`, `npm run generate:legal` |
| 확장 버전 | manifest, `docs/버전.md`, `npm run sync:public-meta` |

구조·검증 원칙: [`docs/방법론.md`](docs/방법론.md)
