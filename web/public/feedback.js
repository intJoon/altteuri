const API = "/api/comments";
const PAGE_SIZE = 10;
const MAX_BODY = 500;
const WARN_AT = 450;

const form = document.querySelector("#feedback-form");
const bodyInput = document.querySelector("#feedback-body");
const counter = document.querySelector("#feedback-counter");
const submitButton = document.querySelector("#feedback-submit");
const submitStatus = document.querySelector("#submit-status");
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

function setVisible(element, visible) {
  element.hidden = !visible;
}

function setFeedState(state) {
  setVisible(loading, state === "loading");
  setVisible(errorState, state === "error");
  setVisible(empty, state === "empty");
  setVisible(list, state === "ready");
  if (state !== "ready") setVisible(loadMoreWrap, false);
  feed.setAttribute("aria-busy", String(state === "loading"));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function createComment(item, isNew = false) {
  const comment = document.createElement("li");
  comment.className = isNew ? "comment new" : "comment";

  const body = document.createElement("p");
  body.className = "comment-body";
  body.textContent = typeof item.body === "string" ? item.body : "";
  comment.append(body);

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

function renderComments({ highlightFirst = false } = {}) {
  list.replaceChildren(
    ...comments.map((comment, index) => createComment(comment, highlightFirst && index === 0))
  );
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

  try {
    const page = await fetchPage(comments.length);
    comments = [...comments, ...page.comments];
    total = page.total;
    hasMore = comments.length < total;
    renderComments();
  } catch {
    submitStatus.className = "submit-status error";
    submitStatus.textContent = "추가 의견을 불러오지 못했습니다.";
  } finally {
    isLoadingMore = false;
    loadMoreButton.disabled = false;
    loadMoreButton.textContent = "더보기";
  }
}

function updateCounter() {
  const length = bodyInput.value.length;
  counter.textContent = length >= WARN_AT ? `${length}/${MAX_BODY}` : "";
  counter.classList.toggle("limit", length >= MAX_BODY);
}

function setSubmitStatus(message, type = "") {
  submitStatus.className = `submit-status${type ? ` ${type}` : ""}`;
  submitStatus.textContent = message;
}

async function submitComment(event) {
  event.preventDefault();
  const body = bodyInput.value.trim();
  if (!body) {
    bodyInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "보내는 중";
  setSubmitStatus("");

  try {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body,
        website: form.elements.website.value,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "post_failed");
    }

    const data = await response.json();
    bodyInput.value = "";
    updateCounter();
    setSubmitStatus("의견이 등록되었습니다.", "success");

    if (data.comment) {
      comments = [data.comment, ...comments];
      total += 1;
      hasMore = comments.length < total;
      renderComments({ highlightFirst: true });
    }
  } catch (error) {
    const message =
      error.message === "rate_limited"
        ? "의견은 하루에 2개까지 보낼 수 있습니다."
        : "의견을 보내지 못했습니다. 다시 시도해 주세요.";
    setSubmitStatus(message, "error");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "의견 보내기";
  }
}

bodyInput.addEventListener("input", updateCounter);
form.addEventListener("submit", submitComment);
retryButton.addEventListener("click", loadInitial);
loadMoreButton.addEventListener("click", loadMore);

updateCounter();
loadInitial();
