(() => {
  function isDevBuild() {
    try {
      return !("update_url" in chrome.runtime.getManifest());
    } catch {
      return false;
    }
  }

  function logWarn(scope, detail) {
    if (!isDevBuild()) return;
    console.warn("[Altteuri:" + scope + "]", detail);
  }

  function lastError(scope) {
    const err = chrome.runtime.lastError;
    if (err) logWarn(scope, err);
    return err || null;
  }

  function runSafe(scope, fn) {
    try {
      return fn();
    } catch (err) {
      logWarn(scope, err);
      return undefined;
    }
  }

  function syncGet(keys, callback, fallback) {
    if (!globalThis.chrome?.storage?.sync) {
      callback(fallback ?? {});
      return;
    }
    runSafe("storage.sync.get", () => {
      chrome.storage.sync.get(keys, (result) => {
        lastError("storage.sync.get");
        callback(result ?? fallback ?? {});
      });
    });
  }

  function syncSet(values, callback) {
    if (!globalThis.chrome?.storage?.sync) {
      if (typeof callback === "function") callback(lastError("storage.sync.set") || new Error("storage_unavailable"));
      return;
    }
    runSafe("storage.sync.set", () => {
      chrome.storage.sync.set(values, () => {
        const err = lastError("storage.sync.set");
        if (typeof callback === "function") callback(err);
      });
    });
  }

  function localGet(keys, callback, fallback) {
    if (!globalThis.chrome?.storage?.local) {
      callback(fallback ?? {});
      return;
    }
    runSafe("storage.local.get", () => {
      chrome.storage.local.get(keys, (result) => {
        lastError("storage.local.get");
        callback(result ?? fallback ?? {});
      });
    });
  }

  function localSet(values, callback) {
    if (!globalThis.chrome?.storage?.local) {
      if (typeof callback === "function") callback(lastError("storage.local.set") || new Error("storage_unavailable"));
      return;
    }
    runSafe("storage.local.set", () => {
      chrome.storage.local.set(values, () => {
        const err = lastError("storage.local.set");
        if (typeof callback === "function") callback(err);
      });
    });
  }

  function localRemove(keys, callback) {
    if (!globalThis.chrome?.storage?.local) {
      if (typeof callback === "function") callback(lastError("storage.local.remove") || new Error("storage_unavailable"));
      return;
    }
    runSafe("storage.local.remove", () => {
      chrome.storage.local.remove(keys, () => {
        const err = lastError("storage.local.remove");
        if (typeof callback === "function") callback(err);
      });
    });
  }

  function sessionGet(keys, callback, fallback) {
    if (!globalThis.chrome?.storage?.session) {
      callback(fallback ?? {});
      return;
    }
    runSafe("storage.session.get", () => {
      chrome.storage.session.get(keys, (result) => {
        lastError("storage.session.get");
        callback(result ?? fallback ?? {});
      });
    });
  }

  function sessionSet(values, callback) {
    if (!globalThis.chrome?.storage?.session) {
      if (typeof callback === "function") callback(lastError("storage.session.set") || new Error("storage_unavailable"));
      return;
    }
    runSafe("storage.session.set", () => {
      chrome.storage.session.set(values, () => {
        const err = lastError("storage.session.set");
        if (typeof callback === "function") callback(err);
      });
    });
  }

  function getSiteOrigin() {
    try {
      const url = chrome.runtime.getManifest().homepage_url || "";
      return String(url).replace(/\/$/, "");
    } catch (err) {
      logWarn("manifest.homepage_url", err);
      return "https://altteuri.vercel.app";
    }
  }

  globalThis.AltteuriRuntime = Object.freeze({
    isDevBuild,
    logWarn,
    runSafe,
    syncGet,
    syncSet,
    localGet,
    localSet,
    localRemove,
    sessionGet,
    sessionSet,
    getSiteOrigin,
  });
})();
