// Runs only on substack.com / *.substack.com pages the user has open themselves.
// It reads what is already rendered in the DOM for the signed-in user — the same
// information visible to their own eyes — and never touches forms, cookies, or
// authentication state. Nothing here contacts a server other than the page already
// loaded by the user's browser.

(function () {
  const EXCLUDE_PATH_PATTERNS = [
    /\/p\//i, // individual posts, not publications
    /\/api\//i,
    /\/account/i,
    /\/notes/i,
    /\/profile/i,
    /\/sign-?in/i,
    /\/subscribe$/i,
    /\/embed/i,
  ];

  function isLikelyPublicationLink(href) {
    try {
      const url = new URL(href, window.location.href);
      if (!/substack\.com$/i.test(url.hostname.replace(/^www\./, "")) && !url.hostname.endsWith(".substack.com")) {
        return false;
      }
      if (url.hostname === "substack.com" && url.pathname === "/") return false;
      if (EXCLUDE_PATH_PATTERNS.some((re) => re.test(url.pathname))) return false;
      return true;
    } catch {
      return false;
    }
  }

  function guessNameFromLink(anchor, url) {
    const text = (anchor.textContent || "").trim();
    if (text && text.length > 1 && text.length < 80) return text;
    const sub = url.hostname.split(".")[0];
    return sub.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function scrapeVisibleSubscriptions() {
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    const found = new Map();

    for (const a of anchors) {
      const href = a.getAttribute("href");
      if (!href) continue;
      let url;
      try {
        url = new URL(href, window.location.href);
      } catch {
        continue;
      }
      if (!isLikelyPublicationLink(url.href)) continue;

      const key = url.hostname.toLowerCase();
      if (found.has(key)) continue;

      found.set(key, {
        name: guessNameFromLink(a, url),
        author: "",
        url: `${url.protocol}//${url.hostname}`,
        description: "",
        category: "Uncategorized",
        status: "free",
      });
    }

    return Array.from(found.values());
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message && message.type === "QUIRE_REQUEST_SCRAPE") {
      try {
        const newsletters = scrapeVisibleSubscriptions();
        sendResponse({ ok: true, newsletters });
      } catch {
        sendResponse({ ok: false, newsletters: [] });
      }
      return true;
    }
    return false;
  });
})();
