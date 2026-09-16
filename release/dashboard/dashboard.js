import { ensureInitialized, saveAll, mutate, logActivity, onChange, resetToMock } from "../js/storage.js";
import { generateId, escapeHtml, formatDate, formatRelativeTime, debounce } from "../js/utils.js";
import { applyTheme, watchSystemTheme } from "../js/theme.js";
import { attemptLiveSync, mergeScrapedIntoSubscriptions } from "../js/substackService.js";

let data = null;
let currentView = "dashboard";
let openCollectionId = null;

const views = ["dashboard", "subscriptions", "collections", "reading", "favorites", "insights", "settings"];

// --- bootstrap ------------------------------------------------------------

async function init() {
  data = await ensureInitialized();
  applyTheme(data.settings.theme || "system");
  watchSystemTheme(() => data.settings.theme, () => applyTheme(data.settings.theme));

  wireNav();
  wireSubscriptions();
  wireCollections();
  wireReadingList();
  wireFavorites();
  wireSettings();

  renderAll();

  onChange((next) => {
    if (!next) return;
    data = next;
    renderAll();
  });
}

function renderAll() {
  renderSidebarBadge();
  renderDashboard();
  renderSubscriptions();
  renderCollections();
  renderReadingList();
  renderFavorites();
  renderInsights();
  renderSettings();
}

async function refresh(mutator) {
  data = await mutate(mutator);
  renderAll();
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2600);
}

// --- navigation ------------------------------------------------------------

function wireNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.view));
  });
}

function setView(view) {
  if (!views.includes(view)) return;
  currentView = view;
  document.querySelectorAll(".nav-item").forEach((b) => b.classList.toggle("is-active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((s) => { s.hidden = s.id !== `view-${view}`; });
}

function renderSidebarBadge() {
  const badge = document.getElementById("dataSourceBadge");
  const isLive = data.settings.dataSource === "real";
  badge.classList.toggle("is-live", isLive);
  badge.querySelector(".label").textContent = isLive ? "Live Substack data" : "Sample data";
}

// --- Dashboard view ------------------------------------------------------------

function renderDashboard() {
  const subs = data.subscriptions;
  document.getElementById("dataUnavailableBanner").hidden = !data.meta.dataUnavailable;

  document.getElementById("dashStats").innerHTML = statBlocks([
    ["Total subscriptions", subs.length],
    ["Free", subs.filter((s) => s.status === "free").length],
    ["Paid", subs.filter((s) => s.status === "paid").length],
    ["Favorites", subs.filter((s) => s.favorite).length],
  ]);

  const recent = [...subs]
    .sort((a, b) => new Date(b.subscriptionDate || 0) - new Date(a.subscriptionDate || 0))
    .slice(0, 5);
  document.getElementById("recentlyAdded").innerHTML = recent.length
    ? recent.map((s) => subRowHtml(s, { compact: true })).join("")
    : `<li class="empty-state">No subscriptions yet.</li>`;
  bindRowActions(document.getElementById("recentlyAdded"));

  const activity = (data.activity || []).slice(0, 8);
  document.getElementById("activityList").innerHTML = activity.length
    ? activity
        .map(
          (a) => `<li><span class="dot"></span><div><div>${escapeHtml(a.message)}</div><span class="when">${formatRelativeTime(a.timestamp)}</span></div></li>`
        )
        .join("")
    : `<li class="empty-state">Nothing has happened yet.</li>`;
}

function statBlocks(pairs) {
  return pairs
    .map(([label, num]) => `<div class="stat"><span class="stat-num">${num}</span><span class="stat-label">${escapeHtml(label)}</span></div>`)
    .join("");
}

// --- Shared subscription row rendering ------------------------------------

function subRowHtml(s, { compact = false } = {}) {
  const collection = data.collections.find((c) => c.id === s.collection);
  return `
    <li class="sub-row" data-id="${s.id}">
      <div class="name-cell">
        <div class="name">${escapeHtml(s.name)}</div>
        <div class="author">${escapeHtml(s.author || "")}</div>
      </div>
      <div class="muted">${escapeHtml(s.category || "—")}</div>
      <div><span class="pill ${s.status === "paid" ? "pill-paid" : "pill-free"}">${s.status === "paid" ? "Paid" : "Free"}</span></div>
      <div class="muted">
        ${
          compact
            ? escapeHtml(collection ? collection.name : "—")
            : `<select class="collection-select" data-action="collection" data-id="${s.id}">
                <option value="">No collection</option>
                ${data.collections
                  .map((c) => `<option value="${c.id}" ${c.id === s.collection ? "selected" : ""}>${escapeHtml(c.name)}</option>`)
                  .join("")}
              </select>`
        }
      </div>
      <div class="muted">${formatRelativeTime(s.lastActivity)}</div>
      <div class="actions">
        <button class="star-toggle" data-action="favorite" data-id="${s.id}" aria-pressed="${s.favorite}" aria-label="Toggle favorite" title="Favorite">${s.favorite ? "★" : "☆"}</button>
        <a class="icon-action" href="${escapeHtml(s.url)}" target="_blank" rel="noopener" title="Open" aria-label="Open publication">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 3H3.5A1.5 1.5 0 0 0 2 4.5v8A1.5 1.5 0 0 0 3.5 14h8a1.5 1.5 0 0 0 1.5-1.5V10M10 2h4v4M13.5 2.5 7 9" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        ${!compact ? `<button class="icon-action" data-action="remove" data-id="${s.id}" title="Remove" aria-label="Remove subscription">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5 5 13a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.5-8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>` : ""}
      </div>
    </li>`;
}

function bindRowActions(container) {
  container.querySelectorAll('[data-action="favorite"]').forEach((btn) => {
    btn.addEventListener("click", () => toggleSubscriptionFavorite(btn.dataset.id));
  });
  container.querySelectorAll('[data-action="remove"]').forEach((btn) => {
    btn.addEventListener("click", () => removeSubscription(btn.dataset.id));
  });
  container.querySelectorAll('[data-action="collection"]').forEach((sel) => {
    sel.addEventListener("change", () => assignCollection(sel.dataset.id, sel.value || null));
  });
}

async function toggleSubscriptionFavorite(id) {
  await refresh((d) => {
    const sub = d.subscriptions.find((s) => s.id === id);
    if (sub) {
      sub.favorite = !sub.favorite;
      logActivity(d, "favorite", `${sub.favorite ? "Favorited" : "Unfavorited"} ${sub.name}`);
    }
    return d;
  });
}

async function removeSubscription(id) {
  const sub = data.subscriptions.find((s) => s.id === id);
  if (!sub) return;
  if (!confirm(`Remove "${sub.name}" from your subscriptions?`)) return;
  await refresh((d) => {
    d.subscriptions = d.subscriptions.filter((s) => s.id !== id);
    logActivity(d, "remove", `Removed ${sub.name}`);
    return d;
  });
  showToast("Subscription removed");
}

async function assignCollection(id, collectionId) {
  await refresh((d) => {
    const sub = d.subscriptions.find((s) => s.id === id);
    if (sub) sub.collection = collectionId;
    return d;
  });
}

// --- Subscriptions view ------------------------------------------------------------

let subFilters = { query: "", status: "", collection: "", sort: "name" };

function wireSubscriptions() {
  document.getElementById("subSearch").addEventListener(
    "input",
    debounce((e) => { subFilters.query = e.target.value; renderSubscriptions(); }, 150)
  );
  document.getElementById("subFilterStatus").addEventListener("change", (e) => { subFilters.status = e.target.value; renderSubscriptions(); });
  document.getElementById("subFilterCollection").addEventListener("change", (e) => { subFilters.collection = e.target.value; renderSubscriptions(); });
  document.getElementById("subSort").addEventListener("change", (e) => { subFilters.sort = e.target.value; renderSubscriptions(); });
}

function getFilteredSubscriptions() {
  let list = [...data.subscriptions];
  const q = subFilters.query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.author || "").toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q)
    );
  }
  if (subFilters.status) list = list.filter((s) => s.status === subFilters.status);
  if (subFilters.collection) list = list.filter((s) => s.collection === subFilters.collection);

  if (subFilters.sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
  if (subFilters.sort === "recent") list.sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
  if (subFilters.sort === "subscribed") list.sort((a, b) => new Date(b.subscriptionDate || 0) - new Date(a.subscriptionDate || 0));

  return list;
}

function renderSubscriptions() {
  const collectionSelect = document.getElementById("subFilterCollection");
  const currentVal = collectionSelect.value;
  collectionSelect.innerHTML =
    `<option value="">All collections</option>` +
    data.collections.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  collectionSelect.value = currentVal;

  const list = getFilteredSubscriptions();
  const container = document.getElementById("subscriptionList");
  const empty = document.getElementById("subEmptyState");

  if (!data.subscriptions.length) {
    container.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "You don't have any subscriptions yet. Try syncing from an open Substack tab in Settings.";
    return;
  }
  if (!list.length) {
    container.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "No subscriptions match your search or filters.";
    return;
  }
  empty.hidden = true;
  container.innerHTML = list.map((s) => subRowHtml(s)).join("");
  bindRowActions(container);
}

// --- Collections view ------------------------------------------------------------

function wireCollections() {
  document.getElementById("addCollectionBtn").addEventListener("click", addCollection);
  document.getElementById("newCollectionName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") addCollection();
  });
  document.getElementById("closeCollectionDetail").addEventListener("click", () => {
    openCollectionId = null;
    document.getElementById("collectionDetailPanel").hidden = true;
  });
}

async function addCollection() {
  const input = document.getElementById("newCollectionName");
  const name = input.value.trim();
  if (!name) return;
  await refresh((d) => {
    d.collections.push({ id: generateId("col"), name, isDefault: false });
    logActivity(d, "collection", `Created collection ${name}`);
    return d;
  });
  input.value = "";
  showToast("Collection added");
}

async function renameCollection(id) {
  const col = data.collections.find((c) => c.id === id);
  if (!col) return;
  const name = prompt("Rename collection", col.name);
  if (!name || !name.trim()) return;
  await refresh((d) => {
    const c = d.collections.find((c) => c.id === id);
    if (c) c.name = name.trim();
    return d;
  });
}

async function deleteCollection(id) {
  const col = data.collections.find((c) => c.id === id);
  if (!col) return;
  if (!confirm(`Delete "${col.name}"? Newsletters in it will become uncategorized.`)) return;
  await refresh((d) => {
    d.collections = d.collections.filter((c) => c.id !== id);
    d.subscriptions.forEach((s) => { if (s.collection === id) s.collection = null; });
    logActivity(d, "collection", `Deleted collection ${col.name}`);
    return d;
  });
  if (openCollectionId === id) {
    openCollectionId = null;
    document.getElementById("collectionDetailPanel").hidden = true;
  }
  showToast("Collection deleted");
}

function renderCollections() {
  const grid = document.getElementById("collectionGrid");
  grid.innerHTML = data.collections
    .map((c) => {
      const count = data.subscriptions.filter((s) => s.collection === c.id).length;
      return `
        <div class="collection-card" data-id="${c.id}" tabindex="0" role="button">
          <div class="name">${escapeHtml(c.name)}</div>
          <div class="count">${count} newsletter${count === 1 ? "" : "s"}</div>
          <div class="card-actions">
            <button class="btn btn-ghost" data-action="rename" data-id="${c.id}">Rename</button>
            <button class="btn btn-ghost btn-danger" data-action="delete" data-id="${c.id}">Delete</button>
          </div>
        </div>`;
    })
    .join("");

  grid.querySelectorAll(".collection-card").forEach((card) => {
    card.addEventListener("click", (e) => {
      if (e.target.closest("[data-action]")) return;
      openCollection(card.dataset.id);
    });
  });
  grid.querySelectorAll('[data-action="rename"]').forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); renameCollection(b.dataset.id); }));
  grid.querySelectorAll('[data-action="delete"]').forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); deleteCollection(b.dataset.id); }));

  if (openCollectionId) openCollection(openCollectionId, true);
}

function openCollection(id, silent = false) {
  const col = data.collections.find((c) => c.id === id);
  if (!col) return;
  openCollectionId = id;
  const panel = document.getElementById("collectionDetailPanel");
  panel.hidden = false;
  document.getElementById("collectionDetailName").textContent = col.name;
  const items = data.subscriptions.filter((s) => s.collection === id);
  const list = document.getElementById("collectionDetailList");
  list.innerHTML = items.length
    ? items.map((s) => subRowHtml(s)).join("")
    : `<li class="empty-state">No newsletters in this collection yet. Assign one from the Subscriptions tab.</li>`;
  bindRowActions(list);
  if (!silent) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

// --- Reading list view ------------------------------------------------------------

let readingFilters = { query: "", status: "all" };

function wireReadingList() {
  document.getElementById("readingSearch").addEventListener(
    "input",
    debounce((e) => { readingFilters.query = e.target.value; renderReadingList(); }, 150)
  );
  document.getElementById("readingFilter").addEventListener("change", (e) => { readingFilters.status = e.target.value; renderReadingList(); });
}

function articleRowHtml(a) {
  return `
    <li class="article-row ${a.status === "read" ? "is-read" : ""}" data-id="${a.id}">
      <div class="info">
        <div class="title"><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.title)}</a></div>
        <div class="meta">${escapeHtml(a.source)} · ${formatDate(a.publishedAt)}</div>
      </div>
      <div class="actions">
        <button class="star-toggle" data-action="fav-article" data-id="${a.id}" aria-pressed="${!!a.favorite}" title="Favorite article" aria-label="Favorite article">${a.favorite ? "★" : "☆"}</button>
        <button class="btn btn-ghost" data-action="toggle-read" data-id="${a.id}">${a.status === "read" ? "Mark unread" : "Mark read"}</button>
        <button class="icon-action" data-action="remove-article" data-id="${a.id}" title="Remove" aria-label="Remove article">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M4.5 4.5 5 13a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.5-8.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </li>`;
}

function bindArticleActions(container) {
  container.querySelectorAll('[data-action="fav-article"]').forEach((b) => b.addEventListener("click", () => toggleArticleFavorite(b.dataset.id)));
  container.querySelectorAll('[data-action="toggle-read"]').forEach((b) => b.addEventListener("click", () => toggleArticleRead(b.dataset.id)));
  container.querySelectorAll('[data-action="remove-article"]').forEach((b) => b.addEventListener("click", () => removeArticle(b.dataset.id)));
}

async function toggleArticleFavorite(id) {
  await refresh((d) => {
    const a = d.readingList.find((x) => x.id === id);
    if (a) a.favorite = !a.favorite;
    return d;
  });
}

async function toggleArticleRead(id) {
  await refresh((d) => {
    const a = d.readingList.find((x) => x.id === id);
    if (a) a.status = a.status === "read" ? "unread" : "read";
    return d;
  });
}

async function removeArticle(id) {
  await refresh((d) => {
    d.readingList = d.readingList.filter((x) => x.id !== id);
    return d;
  });
  showToast("Article removed");
}

function renderReadingList() {
  let list = [...data.readingList];
  const q = readingFilters.query.trim().toLowerCase();
  if (q) list = list.filter((a) => a.title.toLowerCase().includes(q) || a.source.toLowerCase().includes(q));
  if (readingFilters.status !== "all") list = list.filter((a) => a.status === readingFilters.status);
  list.sort((a, b) => new Date(b.savedAt || 0) - new Date(a.savedAt || 0));

  const container = document.getElementById("readingListEl");
  const empty = document.getElementById("readingEmptyState");

  if (!data.readingList.length) {
    container.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "Your reading list is empty. Saved articles will show up here.";
    return;
  }
  if (!list.length) {
    container.innerHTML = "";
    empty.hidden = false;
    empty.textContent = "No articles match your search or filter.";
    return;
  }
  empty.hidden = true;
  container.innerHTML = list.map(articleRowHtml).join("");
  bindArticleActions(container);
}

// --- Favorites view ------------------------------------------------------------

function wireFavorites() {
  document.getElementById("favSearch").addEventListener(
    "input",
    debounce(() => renderFavorites(), 150)
  );
}

function renderFavorites() {
  const q = document.getElementById("favSearch").value.trim().toLowerCase();

  const favSubs = data.subscriptions.filter((s) => s.favorite && (!q || s.name.toLowerCase().includes(q)));
  const favArticles = data.readingList.filter((a) => a.favorite && (!q || a.title.toLowerCase().includes(q)));

  const subContainer = document.getElementById("favNewsletterList");
  subContainer.innerHTML = favSubs.length ? favSubs.map((s) => subRowHtml(s)).join("") : `<li class="empty-state">No favorite newsletters yet.</li>`;
  bindRowActions(subContainer);

  const artContainer = document.getElementById("favArticleList");
  artContainer.innerHTML = favArticles.length ? favArticles.map(articleRowHtml).join("") : `<li class="empty-state">No favorite articles yet.</li>`;
  bindArticleActions(artContainer);

  document.getElementById("favEmptyState").hidden = !!(favSubs.length || favArticles.length);
  document.getElementById("favEmptyState").textContent = "Nothing favorited yet — star a newsletter or article to see it here.";
}

// --- Insights view ------------------------------------------------------------

function renderInsights() {
  const subs = data.subscriptions;
  document.getElementById("insightStats").innerHTML = statBlocks([
    ["Total subscriptions", subs.length],
    ["Free", subs.filter((s) => s.status === "free").length],
    ["Paid", subs.filter((s) => s.status === "paid").length],
    ["Collections in use", data.collections.filter((c) => subs.some((s) => s.collection === c.id)).length],
  ]);

  const free = subs.filter((s) => s.status === "free").length;
  const paid = subs.filter((s) => s.status === "paid").length;
  const maxFP = Math.max(free, paid, 1);
  document.getElementById("freeVsPaidChart").innerHTML = [
    barRow("Free", free, maxFP),
    barRow("Paid", paid, maxFP),
  ].join("");

  const byCategory = {};
  subs.forEach((s) => { byCategory[s.category || "Uncategorized"] = (byCategory[s.category || "Uncategorized"] || 0) + 1; });
  const maxCat = Math.max(...Object.values(byCategory), 1);
  document.getElementById("categoryChart").innerHTML =
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, count]) => barRow(cat, count, maxCat))
      .join("") || `<p class="empty-state">No data yet.</p>`;

  const byActivity = [...subs].sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
  document.getElementById("mostActiveList").innerHTML = rankListHtml(byActivity.slice(0, 5));
  document.getElementById("leastActiveList").innerHTML = rankListHtml([...byActivity].reverse().slice(0, 5));

  renderGrowthChart(subs);
}

function barRow(label, value, max) {
  const pct = Math.round((value / max) * 100);
  return `
    <div class="bar-row">
      <span class="bar-label">${escapeHtml(label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${pct}%"></span></span>
      <span class="bar-value">${value}</span>
    </div>`;
}

function rankListHtml(list) {
  if (!list.length) return `<li class="empty-state">No data yet.</li>`;
  return list
    .map((s) => `<li><span class="rank-name">${escapeHtml(s.name)}</span><span class="rank-meta">${formatRelativeTime(s.lastActivity)}</span></li>`)
    .join("");
}

function renderGrowthChart(subs) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString(undefined, { month: "short" }), count: 0 });
  }
  subs.forEach((s) => {
    const d = new Date(s.subscriptionDate || Date.now());
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.count += 1;
  });
  const max = Math.max(...months.map((m) => m.count), 1);
  document.getElementById("growthChart").innerHTML = months
    .map((m) => `<div class="growth-bar" style="height:100%"><span class="fill" style="height:${(m.count / max) * 100}%"></span><span class="glabel">${m.label}</span></div>`)
    .join("");
}

// --- Settings view ------------------------------------------------------------

function wireSettings() {
  document.querySelectorAll("#themeSegmented button").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await refresh((d) => { d.settings.theme = btn.dataset.theme; return d; });
      applyTheme(btn.dataset.theme);
    });
  });

  document.getElementById("notificationsToggle").addEventListener("change", async (e) => {
    await refresh((d) => { d.settings.notifications = e.target.checked; return d; });
  });

  document.getElementById("syncNowBtn").addEventListener("click", syncFromSubstack);
  document.getElementById("exportJsonBtn").addEventListener("click", exportJson);
  document.getElementById("exportCsvBtn").addEventListener("click", exportCsv);
  document.getElementById("importJsonBtn").addEventListener("click", () => document.getElementById("importFileInput").click());
  document.getElementById("importFileInput").addEventListener("change", importJson);
  document.getElementById("resetDataBtn").addEventListener("click", resetData);
}

function renderSettings() {
  document.querySelectorAll("#themeSegmented button").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.theme === (data.settings.theme || "system"));
  });
  document.getElementById("notificationsToggle").checked = !!data.settings.notifications;

  const note = document.getElementById("syncStatusNote");
  if (data.settings.dataSource === "real") {
    note.textContent = `Showing live data, last synced ${formatRelativeTime(data.settings.lastSync)}.`;
  } else {
    note.textContent = "You're viewing sample data. Open a newsletter you follow on substack.com, then sync.";
  }
}

async function syncFromSubstack() {
  const btn = document.getElementById("syncNowBtn");
  btn.disabled = true;
  const originalLabel = btn.textContent;
  btn.textContent = "Syncing…";

  try {
    const result = await attemptLiveSync();
    if (!result.ok) {
      const reason = result.reason === "no_substack_tabs"
        ? "No open Substack tabs were found. Open substack.com and try again."
        : "Couldn't find recognizable subscription data on your open Substack tabs.";
      showToast(reason);
      await refresh((d) => { d.meta.dataUnavailable = true; return d; });
      return;
    }

    await refresh((d) => {
      const { subscriptions, added } = mergeScrapedIntoSubscriptions(d.subscriptions, result.scraped);
      d.subscriptions = subscriptions;
      d.settings.dataSource = "real";
      d.settings.lastSync = new Date().toISOString();
      d.meta.dataUnavailable = false;
      logActivity(d, "sync", `Synced from Substack — ${added} new newsletter${added === 1 ? "" : "s"} found`);
      return d;
    });
    showToast("Sync complete");
  } catch {
    showToast("Sync failed — showing your existing data.");
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportJson() {
  downloadBlob(JSON.stringify(data, null, 2), `quire-export-${Date.now()}.json`, "application/json");
  showToast("Exported JSON");
}

function exportCsv() {
  const headers = ["name", "author", "url", "category", "status", "favorite", "collection", "lastActivity", "subscriptionDate"];
  const rows = data.subscriptions.map((s) => {
    const collection = data.collections.find((c) => c.id === s.collection);
    return [s.name, s.author, s.url, s.category, s.status, s.favorite, collection ? collection.name : "", s.lastActivity, s.subscriptionDate]
      .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
      .join(",");
  });
  const csv = [headers.join(","), ...rows].join("\n");
  downloadBlob(csv, `quire-subscriptions-${Date.now()}.csv`, "text/csv");
  showToast("Exported CSV");
}

function isValidImport(obj) {
  return obj && typeof obj === "object" && Array.isArray(obj.subscriptions) && Array.isArray(obj.collections) && Array.isArray(obj.readingList);
}

async function importJson(e) {
  const file = e.target.files[0];
  const statusNote = document.getElementById("importStatusNote");
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!isValidImport(parsed)) {
      statusNote.textContent = "That file doesn't look like a Quire export. Import cancelled.";
      statusNote.style.color = "var(--color-danger)";
      return;
    }
    parsed.settings = parsed.settings || { theme: "system", notifications: true, dataSource: "mock", lastSync: null };
    parsed.meta = parsed.meta || { installedAt: new Date().toISOString(), dataUnavailable: true };
    await saveAll(parsed);
    data = parsed;
    renderAll();
    statusNote.textContent = "Import successful.";
    statusNote.style.color = "var(--color-success)";
    showToast("Data imported");
  } catch {
    statusNote.textContent = "Couldn't read that file — make sure it's a valid Quire JSON export.";
    statusNote.style.color = "var(--color-danger)";
  } finally {
    e.target.value = "";
  }
}

async function resetData() {
  if (!confirm("Reset all data back to sample newsletters? This clears your subscriptions, collections and reading list.")) return;
  data = await resetToMock();
  renderAll();
  showToast("Reset to sample data");
}

init().catch((err) => {
  console.error("Quire dashboard failed to initialize:", err);
  document.querySelector(".content").innerHTML =
    '<p style="padding:40px;color:var(--color-ink-soft)">Quire couldn\'t load your data. Try reopening the dashboard.</p>';
});
