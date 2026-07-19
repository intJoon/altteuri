const API = "/api/comments";
const PAGE_SIZE = 5;

const feed = document.querySelector(".feedback-feed");
const loading = document.querySelector("#feedback-loading");
const errorState = document.querySelector("#feedback-error");
const empty = document.querySelector("#feedback-empty");
const list = document.querySelector("#feedback-list");
const retryButton = document.querySelector("#feedback-retry");
const loadMoreWrap = document.querySelector("#load-more-wrap");
const loadMoreButton = document.querySelector("#feedback-load-more");

let comments = [];
let total = 0;
let hasMore = false;
let isLoadingMore = false;
const commentClamps = [];

function setVisible(element, visible) {
  element.hidden = !visible;
}

function setFeedState(state) {
  setVisible(loading, state === "loading");
  setVisible(errorState, state === "error");
  setVisible(empty, state === "empty");
  setVisible(list, state === "ready");
  if (state !== "ready") setVisible(loadMoreWrap, false);
  feed.setAttribute("aria-busy", String(state === "loading" || isLoadingMore));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(date);
}

function remountCommentClamps() {
  for (let i = commentClamps.length - 1; i >= 0; i -= 1) {
    const entry = commentClamps[i];
    if (!entry.bodyEl.isConnected) {
      commentClamps.splice(i, 1);
      continue;
    }
    entry.sync();
  }
}

function wireCommentBodyClamp(bodyEl, toggleEl) {
  const sync = () => {
    const expanded = bodyEl.classList.contains("is-expanded");
    bodyEl.classList.remove("is-expanded");
    bodyEl.classList.add("is-clamped");
    const needsToggle = bodyEl.scrollHeight > bodyEl.clientHeight + 1;
    if (!needsToggle) {
      bodyEl.classList.remove("is-clamped");
      toggleEl.hidden = true;
      return;
    }
    toggleEl.hidden = false;
    if (expanded) {
      bodyEl.classList.remove("is-clamped");
      bodyEl.classList.add("is-expanded");
      toggleEl.textContent = "접기";
    } else {
      toggleEl.textContent = "펼치기";
    }
  };
  toggleEl.addEventListener("click", () => {
    const expanded = bodyEl.classList.toggle("is-expanded");
    bodyEl.classList.toggle("is-clamped", !expanded);
    toggleEl.textContent = expanded ? "접기" : "펼치기";
  });
  commentClamps.push({ bodyEl, sync });
  requestAnimationFrame(() => requestAnimationFrame(sync));
}

function createComment(item) {
  const comment = document.createElement("li");
  comment.className = "comment";

  const body = document.createElement("p");
  body.className = "comment-body";
  body.textContent = typeof item.body === "string" ? item.body : "";
  comment.append(body);

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "comment-expand";
  toggle.hidden = true;
  comment.append(toggle);
  wireCommentBodyClamp(body, toggle);

  const meta = document.createElement("div");
  meta.className = "comment-meta";

  if (item.version) {
    const version = document.createElement("span");
    version.className = "comment-version";
    version.textContent = `확장 ${item.version}`;
    meta.append(version);
  }

  const time = document.createElement("time");
  time.dateTime = item.createdAt || "";
  time.textContent = formatDate(item.createdAt);
  meta.append(time);
  comment.append(meta);

  return comment;
}

function renderComments() {
  list.replaceChildren(...comments.map((comment) => createComment(comment)));
  setFeedState(comments.length ? "ready" : "empty");
  setVisible(loadMoreWrap, comments.length > 0 && hasMore);
}

async function fetchPage(offset = 0) {
  const response = await fetch(`${API}?limit=${PAGE_SIZE}&offset=${offset}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("load_failed");
  const data = await response.json();
  return {
    comments: Array.isArray(data.comments) ? data.comments : [],
    total: Number.isFinite(data.total) ? data.total : 0,
    hasMore: Boolean(data.hasMore),
  };
}

async function loadInitial() {
  setFeedState("loading");
  try {
    const page = await fetchPage();
    comments = page.comments;
    total = page.total;
    hasMore = page.hasMore;
    renderComments();
  } catch {
    setFeedState("error");
  }
}

async function loadMore() {
  if (!hasMore || isLoadingMore) return;
  isLoadingMore = true;
  loadMoreButton.disabled = true;
  loadMoreButton.textContent = "불러오는 중";
  feed.setAttribute("aria-busy", "true");

  try {
    const page = await fetchPage(comments.length);
    comments = [...comments, ...page.comments];
    total = page.total;
    hasMore = comments.length < total;
    renderComments();
  } catch {
    setVisible(loadMoreWrap, true);
  } finally {
    isLoadingMore = false;
    loadMoreButton.disabled = false;
    loadMoreButton.textContent = "더 보기";
    feed.setAttribute("aria-busy", "false");
  }
}

retryButton.addEventListener("click", loadInitial);
loadMoreButton.addEventListener("click", loadMore);
window.addEventListener("resize", remountCommentClamps);
if (document.fonts?.ready) {
  document.fonts.ready.then(remountCommentClamps).catch(() => {});
}

loadInitial();
