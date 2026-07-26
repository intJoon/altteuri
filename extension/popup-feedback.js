(() => {
const R = globalThis.AltteuriRuntime;

const FEEDBACK_DRAFT_KEY = "altFeedbackDraft";
const FEEDBACK_COUNT_SHOW_AT = 450;

const feedbackBody = document.getElementById("feedback-body");
const feedbackCharCount = document.getElementById("feedback-char-count");
const feedbackSubmit = document.getElementById("btn-feedback-submit");
const feedbackHoneypot = document.getElementById("feedback-honeypot");
const feedbackList = document.getElementById("feedback-list");
const feedbackEmpty = document.getElementById("feedback-empty");
const feedbackLoading = document.getElementById("feedback-loading");
const feedbackError = document.getElementById("feedback-error");
const feedbackRetry = document.getElementById("btn-feedback-retry");
const feedbackLoadMore = document.getElementById("btn-feedback-load-more");
const feedbackPrivacyLink = document.getElementById("feedback-privacy-link");

let feedbackOffset = 0;
let feedbackHasMore = false;
let feedbackAbort = null;
let feedbackSubmitting = false;
let feedbackLoadingMore = false;
let feedbackDraftTimer = null;
const feedbackClamps = [];

function getApiBase() {
  return R.getSiteOrigin();
}

function getPageSize() {
  const cfg = globalThis.AltteuriSiteConfig;
  return cfg && cfg.FEEDBACK_PAGE_SIZE ? cfg.FEEDBACK_PAGE_SIZE : 5;
}

function getFeedbackMaxLen() {
  const cfg = globalThis.AltteuriSiteConfig;
  return cfg && cfg.FEEDBACK_MAX_LEN ? cfg.FEEDBACK_MAX_LEN : 500;
}

function abortFetch() {
  if (feedbackAbort) {
    feedbackAbort.abort();
    feedbackAbort = null;
  }
}

function formatFeedbackDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function remountFeedbackClamps() {
  for (let i = feedbackClamps.length - 1; i >= 0; i -= 1) {
    const entry = feedbackClamps[i];
    if (!entry.bodyEl.isConnected) {
      feedbackClamps.splice(i, 1);
      continue;
    }
    entry.sync();
  }
}

function wireFeedbackBodyClamp(bodyEl, toggleEl) {
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
  feedbackClamps.push({ bodyEl, sync });
  requestAnimationFrame(() => requestAnimationFrame(sync));
}

function createFeedbackItem(comment) {
  const item = document.createElement("div");
  item.className = "feedback-item";
  if (comment && comment.id != null) item.dataset.id = String(comment.id);

  const body = document.createElement("div");
  body.className = "feedback-item-body";
  body.textContent = (comment && comment.body) || "";

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "feedback-item-toggle";
  toggle.hidden = true;

  const meta = document.createElement("div");
  meta.className = "feedback-item-meta";
  const parts = [];
  const date = formatFeedbackDate(comment && comment.createdAt);
  if (date) parts.push(date);
  if (comment && comment.version) parts.push("v" + comment.version);
  meta.textContent = parts.join(" · ");

  item.appendChild(body);
  item.appendChild(toggle);
  item.appendChild(meta);
  wireFeedbackBodyClamp(body, toggle);
  return item;
}

function setFeedbackListState(state) {
  if (feedbackLoading) feedbackLoading.hidden = state !== "loading";
  if (feedbackEmpty) feedbackEmpty.hidden = state !== "empty";
  if (feedbackError) feedbackError.hidden = state !== "error";
  if (feedbackList) feedbackList.hidden = state === "loading" || state === "error";
  if (feedbackLoadMore) {
    feedbackLoadMore.hidden = state !== "list" || !feedbackHasMore;
  }
}

function updateFeedbackCharCount() {
  if (!feedbackBody || !feedbackCharCount) return;
  const len = feedbackBody.value.length;
  const maxLen = getFeedbackMaxLen();
  feedbackCharCount.textContent = len + " / " + maxLen;
  feedbackCharCount.classList.toggle("visible", len >= FEEDBACK_COUNT_SHOW_AT);
  feedbackCharCount.classList.toggle("warn", len >= maxLen);
  if (feedbackSubmit && !feedbackSubmitting) {
    feedbackSubmit.disabled = len < 1 || len > maxLen;
    feedbackSubmit.classList.remove("error");
    feedbackSubmit.textContent = "보내기";
  }
}

function saveFeedbackDraft() {
  if (!feedbackBody) return;
  R.localSet({ [FEEDBACK_DRAFT_KEY]: feedbackBody.value });
}

function restoreFeedbackDraft() {
  if (!feedbackBody) return;
  R.localGet([FEEDBACK_DRAFT_KEY], (result) => {
    const draft = result[FEEDBACK_DRAFT_KEY];
    if (typeof draft === "string" && draft) {
      feedbackBody.value = draft.slice(0, getFeedbackMaxLen());
    }
    updateFeedbackCharCount();
  });
}

function clearFeedbackDraft() {
  R.localRemove(FEEDBACK_DRAFT_KEY);
}

async function fetchFeedbackComments(reset) {
  const apiBase = getApiBase();
  if (!apiBase) return;
  if (!reset && feedbackLoadingMore) return;

  if (reset) abortFetch();
  const controller = new AbortController();
  feedbackAbort = controller;

  if (reset) {
    feedbackOffset = 0;
    feedbackHasMore = false;
    if (feedbackList) feedbackList.replaceChildren();
    setFeedbackListState("loading");
  } else {
    feedbackLoadingMore = true;
    if (feedbackLoadMore) {
      feedbackLoadMore.disabled = true;
      feedbackLoadMore.textContent = "불러오는 중…";
    }
  }

  const offset = reset ? 0 : feedbackOffset;
  const url = apiBase + "/api/comments?limit=" + getPageSize() + "&offset=" + offset;

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error("bad status");
    const data = await res.json();
    if (feedbackAbort !== controller) return;

    const comments = Array.isArray(data.comments) ? data.comments : [];
    feedbackHasMore = !!data.hasMore;
    feedbackOffset = offset + comments.length;

    if (feedbackList) {
      comments.forEach((c) => feedbackList.appendChild(createFeedbackItem(c)));
      const hasItems = feedbackList.children.length > 0;
      if (!hasItems) setFeedbackListState("empty");
      else setFeedbackListState("list");
    }
  } catch (e) {
    if (e && e.name === "AbortError") return;
    if (reset || (feedbackList && !feedbackList.children.length)) {
      setFeedbackListState("error");
    } else if (feedbackLoadMore) {
      feedbackLoadMore.hidden = false;
      feedbackLoadMore.textContent = "다시 시도";
    }
  } finally {
    if (feedbackAbort === controller) feedbackAbort = null;
    if (!reset) {
      feedbackLoadingMore = false;
      if (feedbackLoadMore) {
        feedbackLoadMore.disabled = false;
        if (feedbackLoadMore.textContent !== "다시 시도") {
          feedbackLoadMore.textContent = "더 보기";
        }
      }
    }
  }
}

function enterPage() {
  restoreFeedbackDraft();
  updateFeedbackCharCount();
  fetchFeedbackComments(true);
}

async function submitFeedback() {
  if (!feedbackBody || !feedbackSubmit || feedbackSubmitting) return;
  const maxLen = getFeedbackMaxLen();
  const body = feedbackBody.value.trim();
  if (body.length < 1 || body.length > maxLen) return;

  feedbackSubmitting = true;
  feedbackSubmit.disabled = true;
  feedbackSubmit.classList.remove("error");
  feedbackSubmit.textContent = "보내는 중…";

  let version = "";
  R.runSafe("manifest.version", () => {
    version = chrome.runtime.getManifest().version || "";
  });

  const payload = {
    body,
    version,
    website: feedbackHoneypot ? feedbackHoneypot.value : "",
  };

  try {
    const res = await fetch(getApiBase() + "/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "bad status");
    }
    const data = await res.json();
    const comment =
      data && data.comment
        ? data.comment
        : {
            id: Date.now(),
            body,
            version,
            createdAt: new Date().toISOString(),
          };

    feedbackBody.value = "";
    if (feedbackHoneypot) feedbackHoneypot.value = "";
    clearFeedbackDraft();
    updateFeedbackCharCount();

    if (feedbackList) {
      feedbackList.insertBefore(createFeedbackItem(comment), feedbackList.firstChild);
      feedbackOffset += 1;
      setFeedbackListState("list");
    }

    feedbackSubmit.textContent = "보내기";
    feedbackSubmit.disabled = true;
  } catch (e) {
    feedbackSubmit.classList.add("error");
    feedbackSubmit.textContent =
      e && e.message === "rate_limited" ? "하루에 2개까지 보낼 수 있습니다" : "실패 · 다시 시도";
    feedbackSubmit.disabled = false;
  } finally {
    feedbackSubmitting = false;
  }
}

function bindFeedback() {
  if (feedbackBody) {
    feedbackBody.addEventListener("input", () => {
      updateFeedbackCharCount();
      if (feedbackDraftTimer) clearTimeout(feedbackDraftTimer);
      feedbackDraftTimer = setTimeout(saveFeedbackDraft, 200);
    });
  }
  if (feedbackPrivacyLink) {
    feedbackPrivacyLink.addEventListener("click", (e) => {
      e.preventDefault();
      chrome.tabs.create({ url: getApiBase() + "/legal.html#privacy" });
    });
  }
  if (feedbackSubmit) feedbackSubmit.addEventListener("click", submitFeedback);
  if (feedbackRetry) feedbackRetry.addEventListener("click", () => fetchFeedbackComments(true));
  if (feedbackLoadMore) {
    feedbackLoadMore.addEventListener("click", () => fetchFeedbackComments(false));
  }
  window.addEventListener("resize", remountFeedbackClamps);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(remountFeedbackClamps).catch(() => {});
  }
}

globalThis.AltteuriPopupFeedback = Object.freeze({
  bindFeedback,
  enterPage,
  abortFetch,
});
})();
