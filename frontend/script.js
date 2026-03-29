/**
 * Inkwell — Modern Blog  ·  script.js
 * Vanilla JS SPA connecting to FastAPI backend
 */

"use strict";

// ── Config ──────────────────────────────────────────────────────────────────
const API_BASE = "http://localhost:8000";   // Change to your deployed backend URL

// ── State ────────────────────────────────────────────────────────────────────
const state = {
  posts      : [],
  currentPage: 1,
  limit      : 9,
  searchQuery: "",
  filter     : "all",   // all | today | week | month
  sortOrder  : "newest",
  editingId  : null,
};

// ── DOM Refs ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const els = {
  postsGrid      : $("posts-grid"),
  loading        : $("loading"),
  emptyState     : $("empty-state"),
  pagination     : $("pagination"),
  pageInfo       : $("page-info"),
  prevPage       : $("prev-page"),
  nextPage       : $("next-page"),
  searchInput    : $("search-input"),
  searchClear    : $("search-clear"),
  statPosts      : $("stat-posts"),
  statLabel      : $("stat-label"),
  // Compose
  composeSection : $("compose-section"),
  openCompose    : $("open-compose"),
  closeCompose   : $("close-compose"),
  postTitle      : $("post-title"),
  postAuthor     : $("post-author"),
  postTags       : $("post-tags"),
  postContent    : $("post-content"),
  charCount      : $("char-count"),
  submitPost     : $("submit-post"),
  emptyComposeBtn: $("empty-compose-btn"),
  // Edit modal
  editModal      : $("edit-modal"),
  editModalClose : $("edit-modal-close"),
  editTitle      : $("edit-title"),
  editAuthor     : $("edit-author"),
  editTags       : $("edit-tags"),
  editContent    : $("edit-content"),
  editSaveBtn    : $("edit-save-btn"),
  // Theme
  themeToggle    : $("theme-toggle"),
  themeIcon      : document.querySelector(".theme-icon"),
  // Confirm
  confirmOverlay : $("confirm-overlay"),
  confirmMessage : $("confirm-message"),
  confirmOk      : $("confirm-ok"),
  confirmCancel  : $("confirm-cancel"),
  // Footer
  footerYear     : $("footer-year"),
};

// ── API Helpers ──────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res  = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Data Fetching ─────────────────────────────────────────────────────────────
async function fetchPosts() {
  showLoading(true);
  try {
    const params = new URLSearchParams({
      page : state.currentPage,
      limit: state.limit,
    });
    if (state.searchQuery) params.append("search", state.searchQuery);

    const posts = await apiFetch(`/posts?${params}`);
    state.posts  = posts;
    renderPosts(posts);
    await fetchStats();
  } catch (e) {
    toast("Failed to load posts: " + e.message, "error");
    showLoading(false);
  }
}

async function fetchStats() {
  try {
    const stats = await apiFetch("/stats");
    els.statPosts.textContent = `${stats.total_posts} post${stats.total_posts !== 1 ? "s" : ""}`;
    els.statLabel.textContent = stats.latest_post
      ? `Latest: ${timeAgo(stats.latest_post)}`
      : "No posts yet";
  } catch { /* non-critical */ }
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderPosts(posts) {
  showLoading(false);

  // Apply client-side date filter
  const filtered = applyDateFilter(posts);
  // Apply client-side sort
  const sorted   = sortPosts(filtered);

  if (sorted.length === 0) {
    els.postsGrid.innerHTML = "";
    els.emptyState.classList.remove("hidden");
    els.pagination.classList.add("hidden");
    return;
  }

  els.emptyState.classList.add("hidden");

  // Pagination info
  const hasPrev = state.currentPage > 1;
  const hasNext = posts.length === state.limit;       // rough check
  if (hasPrev || hasNext) {
    els.pagination.classList.remove("hidden");
    els.pageInfo.textContent = `Page ${state.currentPage}`;
    els.prevPage.disabled    = !hasPrev;
    els.nextPage.disabled    = !hasNext;
  } else {
    els.pagination.classList.add("hidden");
  }

  els.postsGrid.innerHTML = "";
  sorted.forEach((post, i) => {
    const card = buildCard(post, i);
    els.postsGrid.appendChild(card);
  });
}

function buildCard(post, index) {
  const card = document.createElement("article");
  card.className   = "post-card";
  card.dataset.id  = post.id;
  card.style.animationDelay = `${index * 60}ms`;
  card.setAttribute("role", "article");

  const initials = (post.author || "A")[0].toUpperCase();
  const tagsHtml = post.tags
    ? post.tags.split(",").filter(Boolean).map(t =>
        `<span class="tag">${escHtml(t.trim())}</span>`
      ).join("")
    : "";

  card.innerHTML = `
    <div class="card-meta">
      <div class="card-author">
        <div class="author-avatar">${initials}</div>
        <span>${escHtml(post.author)}</span>
      </div>
      <time class="card-date" datetime="${post.created_at}" title="${formatDate(post.created_at)}">
        ${timeAgo(post.created_at)}
      </time>
    </div>

    <h2 class="card-title">${escHtml(post.title)}</h2>
    <p  class="card-content">${escHtml(post.content)}</p>

    ${tagsHtml ? `<div class="card-tags">${tagsHtml}</div>` : ""}

    <div class="card-actions">
      <button class="btn-icon edit-btn"   data-id="${post.id}" aria-label="Edit post">✎ Edit</button>
      <button class="btn-icon delete-btn" data-id="${post.id}" aria-label="Delete post" style="color:var(--red);border-color:rgba(224,82,82,.25);">✕ Delete</button>
    </div>
  `;

  card.querySelector(".edit-btn").addEventListener("click", () => openEdit(post));
  card.querySelector(".delete-btn").addEventListener("click", () => confirmDelete(post.id, post.title));

  return card;
}

// ── Create Post ───────────────────────────────────────────────────────────────
async function createPost() {
  const title   = els.postTitle.value.trim();
  const content = els.postContent.value.trim();
  const author  = els.postAuthor.value.trim() || "Anonymous";
  const tags    = els.postTags.value.trim();

  if (!title)   { shake(els.postTitle);   toast("Title is required",   "error"); return; }
  if (!content) { shake(els.postContent); toast("Content is required", "error"); return; }

  els.submitPost.disabled     = true;
  els.submitPost.textContent  = "Publishing…";

  try {
    await apiFetch("/posts", {
      method: "POST",
      body  : JSON.stringify({ title, content, author, tags }),
    });
    toast("Post published! ✦", "success");
    // Reset form
    [els.postTitle, els.postAuthor, els.postTags, els.postContent].forEach(f => f.value = "");
    els.charCount.textContent = "0 characters";
    closeCompose();
    state.currentPage = 1;
    await fetchPosts();
  } catch (e) {
    toast("Failed to publish: " + e.message, "error");
  } finally {
    els.submitPost.disabled    = false;
    els.submitPost.textContent = "Publish →";
  }
}

// ── Edit Post ─────────────────────────────────────────────────────────────────
function openEdit(post) {
  state.editingId           = post.id;
  els.editTitle.value       = post.title;
  els.editAuthor.value      = post.author;
  els.editTags.value        = post.tags;
  els.editContent.value     = post.content;
  els.editModal.classList.remove("hidden");
  els.editTitle.focus();
}

async function saveEdit() {
  const title   = els.editTitle.value.trim();
  const content = els.editContent.value.trim();
  if (!title)   { shake(els.editTitle);   toast("Title required",   "error"); return; }
  if (!content) { shake(els.editContent); toast("Content required", "error"); return; }

  els.editSaveBtn.disabled    = true;
  els.editSaveBtn.textContent = "Saving…";

  try {
    await apiFetch(`/posts/${state.editingId}`, {
      method: "PUT",
      body  : JSON.stringify({
        title,
        content,
        author: els.editAuthor.value.trim() || "Anonymous",
        tags  : els.editTags.value.trim(),
      }),
    });
    toast("Post updated ✦", "success");
    els.editModal.classList.add("hidden");
    await fetchPosts();
  } catch (e) {
    toast("Update failed: " + e.message, "error");
  } finally {
    els.editSaveBtn.disabled    = false;
    els.editSaveBtn.textContent = "Save Changes";
  }
}

// ── Delete Post ───────────────────────────────────────────────────────────────
function confirmDelete(id, title) {
  els.confirmMessage.textContent = `Delete "${title}"? This cannot be undone.`;
  els.confirmOverlay.classList.remove("hidden");

  const cleanup = () => {
    els.confirmOverlay.classList.add("hidden");
    els.confirmOk.replaceWith(els.confirmOk.cloneNode(true));
    els.confirmCancel.replaceWith(els.confirmCancel.cloneNode(true));
    // Re-bind cancel after clone
    $("confirm-cancel").addEventListener("click", () => els.confirmOverlay.classList.add("hidden"));
  };

  $("confirm-ok").addEventListener("click", async () => {
    cleanup();
    await deletePost(id);
  });
}

async function deletePost(id) {
  const card = document.querySelector(`.post-card[data-id="${id}"]`);
  if (card) card.classList.add("removing");

  try {
    await apiFetch(`/posts/${id}`, { method: "DELETE" });
    toast("Post deleted", "success");
    await fetchPosts();
  } catch (e) {
    toast("Delete failed: " + e.message, "error");
    if (card) card.classList.remove("removing");
  }
}

// ── Compose UI ────────────────────────────────────────────────────────────────
function openCompose() {
  els.composeSection.classList.remove("hidden");
  els.openCompose.classList.add("hidden");
  setTimeout(() => els.postTitle.focus(), 100);
}

function closeCompose() {
  els.composeSection.classList.add("hidden");
  els.openCompose.classList.remove("hidden");
}

// ── Filters & Sort ────────────────────────────────────────────────────────────
function applyDateFilter(posts) {
  if (state.filter === "all") return posts;
  const now   = new Date();
  const start = new Date();
  if (state.filter === "today") {
    start.setHours(0, 0, 0, 0);
  } else if (state.filter === "week") {
    start.setDate(now.getDate() - 7);
  } else if (state.filter === "month") {
    start.setMonth(now.getMonth() - 1);
  }
  return posts.filter(p => new Date(p.created_at) >= start);
}

function sortPosts(posts) {
  return [...posts].sort((a, b) => {
    const da = new Date(a.created_at);
    const db = new Date(b.created_at);
    return state.sortOrder === "newest" ? db - da : da - db;
  });
}

// ── Theme ─────────────────────────────────────────────────────────────────────
function toggleTheme() {
  const isLight = document.body.classList.toggle("light");
  document.body.classList.toggle("dark", !isLight);
  els.themeIcon.textContent = isLight ? "☽" : "☀︎";
  localStorage.setItem("inkwell-theme", isLight ? "light" : "dark");
}

function loadTheme() {
  const saved = localStorage.getItem("inkwell-theme") || "dark";
  document.body.classList.add(saved);
  document.body.classList.remove(saved === "light" ? "dark" : "light");
  els.themeIcon.textContent = saved === "light" ? "☽" : "☀︎";
}

// ── Toast Notifications ───────────────────────────────────────────────────────
function toast(message, type = "info") {
  const icons = { success: "✦", error: "✕", info: "·" };
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${escHtml(message)}</span>`;
  $("toast-container").appendChild(el);

  setTimeout(() => {
    el.classList.add("toast-out");
    el.addEventListener("animationend", () => el.remove());
  }, 3500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function timeAgo(isoString) {
  const now   = Date.now();
  const then  = new Date(isoString + (isoString.endsWith("Z") ? "" : "Z")).getTime();
  const diff  = Math.max(0, now - then);
  const secs  = Math.floor(diff / 1000);
  const mins  = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);
  const days  = Math.floor(hours / 24);
  if (secs  < 60)  return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return formatDate(isoString);
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function showLoading(show) {
  els.loading.classList.toggle("hidden", !show);
  if (show) {
    els.postsGrid.innerHTML = "";
    els.emptyState.classList.add("hidden");
  }
}

function shake(el) {
  el.style.animation = "none";
  el.offsetHeight;    // reflow
  el.style.animation = "shake .4s ease";
  el.addEventListener("animationend", () => el.style.animation = "", { once: true });
}

// Inject shake keyframe once
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
  @keyframes shake {
    0%,100%{ transform:translateX(0); }
    20%    { transform:translateX(-6px); }
    40%    { transform:translateX( 6px); }
    60%    { transform:translateX(-4px); }
    80%    { transform:translateX( 4px); }
  }
`;
document.head.appendChild(shakeStyle);

// ── Event Listeners ───────────────────────────────────────────────────────────
function bindEvents() {
  // Compose
  els.openCompose.addEventListener("click", openCompose);
  els.closeCompose.addEventListener("click", closeCompose);
  els.submitPost.addEventListener("click", createPost);
  els.emptyComposeBtn?.addEventListener("click", openCompose);

  // Char counter
  els.postContent.addEventListener("input", () => {
    const len = els.postContent.value.length;
    els.charCount.textContent = `${len.toLocaleString()} character${len !== 1 ? "s" : ""}`;
  });

  // Submit on Ctrl/Cmd+Enter inside compose
  [els.postTitle, els.postContent, els.postAuthor, els.postTags].forEach(el => {
    el.addEventListener("keydown", e => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") createPost();
    });
  });

  // Edit modal
  els.editModalClose.addEventListener("click", () => els.editModal.classList.add("hidden"));
  els.editSaveBtn.addEventListener("click", saveEdit);
  els.editModal.addEventListener("click", e => {
    if (e.target === els.editModal) els.editModal.classList.add("hidden");
  });

  // Confirm dialog cancel
  els.confirmCancel.addEventListener("click", () => els.confirmOverlay.classList.add("hidden"));

  // Theme
  els.themeToggle.addEventListener("click", toggleTheme);

  // Search (debounced)
  let searchTimer;
  els.searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    const val = els.searchInput.value.trim();
    els.searchClear.classList.toggle("hidden", !val);
    searchTimer = setTimeout(() => {
      state.searchQuery = val;
      state.currentPage = 1;
      fetchPosts();
    }, 380);
  });

  els.searchClear.addEventListener("click", () => {
    els.searchInput.value = "";
    els.searchClear.classList.add("hidden");
    state.searchQuery = "";
    state.currentPage = 1;
    fetchPosts();
  });
  els.searchClear.addEventListener("keydown", e => {
    if (e.key === "Enter") els.searchClear.click();
  });

  // Filter chips
  document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.filter      = chip.dataset.filter;
      state.currentPage = 1;
      renderPosts(state.posts);
    });
  });

  // Sort
  $("sort-select").addEventListener("change", e => {
    state.sortOrder = e.target.value;
    renderPosts(state.posts);
  });

  // Pagination
  els.prevPage.addEventListener("click", () => {
    if (state.currentPage > 1) { state.currentPage--; fetchPosts(); }
  });
  els.nextPage.addEventListener("click", () => {
    state.currentPage++;
    fetchPosts();
  });

  // Close overlays on Escape
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      els.editModal.classList.add("hidden");
      els.confirmOverlay.classList.add("hidden");
    }
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  loadTheme();
  bindEvents();
  els.footerYear.textContent = new Date().getFullYear();
  fetchPosts();
}

document.addEventListener("DOMContentLoaded", init);
