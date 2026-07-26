# QC — 출시 전 확인

예전에 고친 버그가 **다시 안 나오는지**, 기능이 **문서대로 도는지** 확인하는 메모다. 근거: [`버전.md`](버전.md) · [`업그레이드.md`](업그레이드.md) · [`방법론.md`](방법론.md).

## 1. 자동 검사

저장소 루트:

```bash
npm ci
npm ci --prefix apps/web
npm run generate:extension-lib
npm test
npm run lint
npm run build:extension
```

**2.2.7 기준:** 위 명령이 모두 통과하면 계약·순수 로직·API·법적 고지·manifest 경로는 코드로 확인된 것이다.

## 2. 수동 검사

`apps/extension/`을 압축해제 로드한 뒤 쿠팡·팝업을 확인한다.

### 팝업

- 기능 전부 꺼짐 → 하나씩 on/off
- 「페이지 표시 항목 조정」 → 체크 해제 항목만 숨김
- 「의견 보내기」 → 제출 후 목록 표시

### 쿠팡 검색 (`/np/search`)

| 볼 것 | OK |
|--------|-----|
| 정렬 | 단위가·할인율·가격, 새로고침 후 유지 |
| 순번 UI | 커스텀 순번만, 해제 시 쿠팡 순번 복구 |
| 아이콘 | 전부 off → 회색, 하나라도 on → 기본 색 |
| 키워드 | 제외 반영, 검색어 변경 시 초기화 |
| 표시 항목 | 체크 해제만 숨김 |
| 검색 개수 | URL `listSize` 맞춤 |

### 소개 사이트

[altteuri.vercel.app](https://altteuri.vercel.app) — 「최근 의견」만 보이고 작성 칸 없음.

### 기존 설치에서 업데이트

- 설정 유지, `settingsVersion` 11, 로드 경로 `apps/extension/`
- 구버전(2.2.0 이전)은 [`업그레이드.md`](업그레이드.md) 참고

## 3. 요약

`npm test` → 팝업·쿠팡 한 바퀴 → 소개 사이트 의견 읽기 전용
