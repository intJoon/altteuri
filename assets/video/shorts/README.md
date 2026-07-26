# 알뜰이 숏폼 영상

인스타 릴스 · 유튜브 쇼츠 · 스레드용 **세로 소개·조작 영상** (9:16).

## 파일

| 파일 | 설명 |
| --- | --- |
| [`out/altteuri-intro.mp4`](out/altteuri-intro.mp4) | 업로드용 MP4 (1080×1920 · 30fps · 29초 · UI SFX) |
| [`STORYBOARD.md`](STORYBOARD.md) | 비트·자막 구성 |
| [`index.html`](index.html) | HyperFrames 루트 (bg · 자막 · 호스트) |
| [`compositions/`](compositions/) | 씬별 서브 컴포지션 |

## 다시 렌더

```bash
cd assets/video/shorts
npm run generate:sfx   # from repo root: npm run generate:sfx
npm run check
npm run render
```

렌더 후 `out/altteuri-intro.mp4`를 `apps/web/public/intro.mp4`로 복사하면 소개 사이트에 반영됩니다.

```bash
npm run sync:intro   # repo root
```

미리보기: `npx hyperframes preview`

## 업로드 캡션 초안

```
쿠팡 검색, 아직도 하나씩 비교하세요?

알뜰이 — 단위가격·할인율·키워드 필터·표시 항목 조정
쿠팡용 Chrome 확장 · 무료

🔗 altteuri.vercel.app
📦 github.com/intJoon/altteuri

#알뜰이 #쿠팡 #Chrome확장 #단위가격 #쇼츠 #릴스
```

BGM은 각 플랫폼 라이브러리에서 추가하세요. (영상에는 짧은 UI 효과음만 포함되어 있습니다)

알뜰이는 쿠팡과 제휴하지 않은 독립 오픈소스 프로젝트입니다.
