# 알뜰이 웹 배포

Vercel **Root Directory:** `apps/web`

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `DATABASE_URL` | 예 | Neon PostgreSQL |
| `RATE_LIMIT_SECRET` | 예 | 의견 POST rate-limit (없으면 503) |
| `CRON_SECRET` | 아니오 | `/api/purge-comments` Bearer (기본: `RATE_LIMIT_SECRET`) |
| `EXTENSION_IDS` | 프로덕션 권장 | 허용 확장 ID. 비어 있으면 unpacked도 POST 가능 |

정적 파일: `public/` · API: `/api/comments` · 헬스: `/api/health` · 의견 정리 cron: UTC 03:00

배포 후 `/`, `/legal.html`, 미등록 URL 404 확인.

로컬 API 테스트: `npm run test:web` (저장소 루트)
