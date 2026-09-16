import { ensureInitialized } from "../js/storage.js";
import { escapeHtml, debounce } from "../js/utils.js";
import { applyTheme } from "../js/theme.js";

let allSubscriptions = [];

function renderStats(subs) {
  document.getElementById("statTotal").textContent = subs.length;
  document.getElementById("statFree").textContent = subs.filter((s) => s.status === "free").length;
  document.getElementById("statPaid").textContent = subs.filter((s) => s.status === "paid").length;
  document.getElementById("statFav").textContent = subs.filter((s) => s.favorite).length;
}

function renderList(subs) {
  const list = document.getElementById("recentList");
  const empty = document.getElementById("recentEmpty");

  if (!subs.length) {
    list.innerHTML = "";
    empty.hidden = false;
    return;
  }
  empty.hidden = true;

  list.innerHTML = subs
    .map(
      (s) => `
      <li>
        <a class="mini-item" href="${escapeHtml(s.url)}" target="_blank" rel="noopener">
          <span class="swatch"></span>
          <span class="info">
            <div class="name">${escapeHtml(s.name)}</div>
            <div class="author">${escapeHtml(s.author || "")}</div>
          </span>
        </a>
      </li>`
    )
    .join("");
}

function mostRecent(subs, n = 6) {
  return [...subs]
    .sort((a, b) => new Date(b.subscriptionDate || 0) - new Date(a.subscriptionDate || 0))
    .slice(0, n);
}

function handleSearch(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    renderList(mostRecent(allSubscriptions));
    return;
  }
  const filtered = allSubscriptions.filter(
    (s) => s.name.toLowerCase().includes(q) || (s.author || "").toLowerCase().includes(q)
  );
  renderList(filtered.slice(0, 8));
}

function openDashboard() {
  chrome.runtime.sendMessage({ type: "QUIRE_OPEN_DASHBOARD" });
  window.close();
}

async function init() {
  const data = await ensureInitialized();
  applyTheme(data.settings.theme || "system");
  allSubscriptions = data.subscriptions || [];

  renderStats(allSubscriptions);
  renderList(mostRecent(allSubscriptions));

  document.getElementById("quickSearch").addEventListener("input", debounce((e) => handleSearch(e.target.value), 120));
  document.getElementById("openDashboard").addEventListener("click", openDashboard);
  document.getElementById("openDashboardTop").addEventListener("click", openDashboard);
}

init().catch((err) => {
  console.error("Quire popup failed to initialize:", err);
  document.querySelector(".popup").innerHTML =
    '<p style="padding:16px;font-size:12px;color:var(--color-ink-soft)">Quire couldn\'t load your data right now. Try reopening the popup.</p>';
});
