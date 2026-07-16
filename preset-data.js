/*
 * 추천 프리셋(제작자 배포 구성)
 *
 * 제작자가 쿠팡 페이지에서 원하는 요소들을 제거한 뒤, 플로팅 툴의 [내보내기] 버튼으로
 * 현재 목록을 JSON 으로 추출하고, 각 항목의 name(사람이 읽는 의미)·category 를 다듬어
 * 아래 items 배열에 채워 넣는다. 사용자는 [추천 프리셋 불러오기]로 이 목록을 받아
 * 각 항목을 살펴보고 합당한 것만 남길 수 있다.
 *
 * item 형식: { selector: 'CSS 셀렉터', name: '사람이 읽는 이름', category: 'srp|pdp|cart|order|etc' }
 * category: srp(검색 결과 페이지) / pdp(상품 상세 페이지) / cart(장바구니) / order(주문목록) / etc(기타)
 * name 은 사이트에 표시되는 원본 요소 제목과 일치시키며, 제목이 없는 요소는 적절히 명명한다.
 * items 순서는 각 페이지에서 실제로 나타나는 위/아래 순서(위→아래)를 따른다.
 * 광고는 요소별로 개별 분리하고, 두 페이지에 모두 나오는 요소는 페이지 고유 조상으로 좁혀 분리한다.
 */
window.CRA_BUILTIN_PRESET = {
  name: '추천 프리셋',
  version: 6,
  items: [
    // ===== 검색 결과 페이지 (위 → 아래) =====
    { selector: "div.coupang-top-banner", name: "검색결과 상단 배너", category: "srp" },
    { selector: "#srpKeywordTopBanner", name: "검색어 상단 브랜드 배너", category: "srp" },
    { selector: "#srpKeywordProductTopBanner", name: "검색어 맞춤 상품 광고", category: "srp" },
    { selector: "#product-list > li:has(button[aria-label='Ad information'])", name: "검색결과 그리드 광고 상품", category: "srp" },
    { selector: "li.best-seller", name: "최근 다른 고객이 많이 구매한 상품", category: "srp" },
    { selector: "li.limited-time-offer", name: "한정 시간 특가 상품", category: "srp" },
    { selector: "#srp-bottom-carousel-dco-container", name: "같이 보면 좋은 상품", category: "srp" },
    { selector: "div.jikgu-promo", name: "전세계 핫딜 로켓직구 글로벌특가", category: "srp" },
    { selector: "div.also-viewed", name: "이 상품을 검색한 다른 분들이 함께 본 상품", category: "srp" },
    // ===== 상품 상세 페이지 (위 → 아래) =====
    { selector: "div.twc-relative.twc-flex.twc-items-center.twc-justify-between.twc-border.twc-border-bluegray-300.twc-min-w-0", name: "이런건 어때요?", category: "pdp" },
    { selector: "div.sdp-ads.impression-log.twc-pt-\\[35px\\]", name: "함께 비교하면 좋을 상품", category: "pdp" },
    { selector: "div.product-btf-container div.carousel-widget-container.gw_promotion:not(.seven-items-promotion)", name: "오늘의 판매자 특가", category: "pdp" },
    { selector: "div.also-view.twc-my-0.twc-mx-auto", name: "다른 고객이 함께 본 상품", category: "pdp" },
    { selector: "#midCarousel2", name: "이런 상품은 어때요?", category: "pdp" },
    { selector: "#midCarousel3", name: "4점 이상 리뷰가 좋은 상품", category: "pdp" },
    { selector: "div.also-bought", name: "다른 고객이 함께 구매한 상품", category: "pdp" },
    { selector: "#brandOtherProducts", name: "브랜드의 다른 상품들", category: "pdp" },
    { selector: "div.sdp-ads.impression-log:not(.twc-pt-\\[35px\\])", name: "연관 추천 상품", category: "pdp" },
    { selector: "div.product-btf-container div.carousel-widget-container.gw_promotion.seven-items-promotion", name: "전세계 핫딜 로켓직구 글로벌특가", category: "pdp" },
    { selector: "div.sdp-bottom-banner-191126", name: "고르고 골랐어요", category: "pdp" },
    // ===== 장바구니 (위 → 아래) =====
    { selector: "div.cart-recommendation-widget", name: "같이 보면 좋은 상품", category: "cart" },
    { selector: "#cart-reco-widget", name: "위 상품을 구매한 고객이 함께 구매한 상품", category: "cart" },
    // ===== 주문목록 (위 → 아래) =====
    { selector: "#side-bar ul.promotion-banner", name: "우측 프로모션 배너", category: "order" },
    { selector: ".my-area-contents .keen-slider", name: "주문목록 하단 프로모션 배너", category: "order" }
  ]
};
