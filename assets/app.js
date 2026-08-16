/**
 * Interactive Learning Library — app.js
 * Pure ES Modules, Vanilla JS, no frameworks.
 */

// ─── Config ─────────────────────────────────────────────────────────────────
const INDEX_URL = 'learn/index.json';

// Emoji map: pick based on folder name keywords
const EMOJI_MAP = [
  [/network|ip|tcp|udp|dns|dhcp|subnet/i,  '🌐'],
  [/cyber|xss|sql.?inj|csrf|hack|security/i, '🔒'],
  [/python/i,   '🐍'],
  [/javascript|js|dom|fetch|async/i, '🟨'],
  [/html|css/i, '🎨'],
  [/linux|bash|shell|cli/i, '🐧'],
  [/docker|container/i, '🐳'],
  [/git/i, '🌿'],
  [/database|sql|mysql|postgres/i, '🗄️'],
  [/algorithm|data.?struct/i, '🧮'],
  [/machine.?learn|ai|ml/i, '🤖'],
];
const DEFAULT_EMOJI = '📘';

// ─── State ───────────────────────────────────────────────────────────────────
let allItems    = [];   // full list from index.json
let filtered    = [];   // after search + folder filter
let activeFolder = null; // null = show all

// ─── DOM refs ────────────────────────────────────────────────────────────────
const $grid      = document.getElementById('cardsGrid');
const $search    = document.getElementById('searchInput');
const $sort      = document.getElementById('sortSelect');
const $tree      = document.getElementById('folderTree');
const $breadcrumb = document.getElementById('breadcrumb');
const $stats     = document.getElementById('statsBar');
const $error     = document.getElementById('errorBanner');

// ─── Boot ────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', init);

async function init() {
  showSkeletons();
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allItems = await res.json();
  } catch (err) {
    showError(`Failed to load index.json: ${err.message}`);
    return;
  }
  buildTree();
  applyFilters();
  bindEvents();
}

// ─── Events ──────────────────────────────────────────────────────────────────
function bindEvents() {
  $search.addEventListener('input', applyFilters);
  $sort.addEventListener('change', applyFilters);
}

// ─── Filtering & Sorting ─────────────────────────────────────────────────────
function applyFilters() {
  const q   = $search.value.trim().toLowerCase();
  const sort = $sort.value;

  filtered = allItems.filter(item => {
    // Folder filter
    if (activeFolder) {
      // match exact folder or subfolder
      if (!item.folder.startsWith(activeFolder)) return false;
    }
    // Search filter
    if (q) {
      const haystack = [
        item.title,
        item.folder,
        item.category,
        item.path
      ].join(' ').toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sort === 'az')   return a.title.localeCompare(b.title);
    if (sort === 'za')   return b.title.localeCompare(a.title);
    if (sort === 'newest') return b.path.localeCompare(a.path);
    return 0;
  });

  renderCards();
  renderBreadcrumb();
  renderStats();
}

// ─── Render cards ────────────────────────────────────────────────────────────
function renderCards() {
  $grid.innerHTML = '';

  if (filtered.length === 0) {
    $grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>No lessons found${$search.value ? ` for "${escHtml($search.value)}"` : ''}.</p>
      </div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  for (const item of filtered) {
    frag.appendChild(buildCard(item));
  }
  $grid.appendChild(frag);
}

function buildCard(item) {
  const emoji = pickEmoji(item);
  const href  = `learn/${item.path}`;
  const date  = item.lastUpdated ? formatDate(item.lastUpdated) : '';

  const div = document.createElement('div');
  div.className = 'card';
  div.setAttribute('role', 'article');
  div.innerHTML = `
    <div class="card-emoji">${emoji}</div>
    <div class="card-title">${escHtml(item.title)}</div>
    <div class="card-folder">${escHtml(item.folder)}/</div>
    <div class="card-footer">
      <span class="card-date">${date ? `🕐 ${date}` : ''}</span>
      <a class="card-open" href="${href}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
        Open <span aria-hidden="true">→</span>
      </a>
    </div>`;

  // clicking anywhere on card opens the link
  div.addEventListener('click', () => window.open(href, '_blank'));
  return div;
}

// ─── Breadcrumb ──────────────────────────────────────────────────────────────
function renderBreadcrumb() {
  $breadcrumb.innerHTML = '';

  const addItem = (label, folder, isCurrent) => {
    const span = document.createElement('span');
    span.className = 'bc-item' + (isCurrent ? ' current' : ' clickable');
    span.textContent = label;
    if (!isCurrent) {
      span.addEventListener('click', () => setFolder(folder));
    }
    $breadcrumb.appendChild(span);
  };

  const addSep = () => {
    const s = document.createElement('span');
    s.className = 'bc-sep';
    s.textContent = '/';
    $breadcrumb.appendChild(s);
  };

  addItem('All', null, !activeFolder);

  if (activeFolder) {
    const parts = activeFolder.split('/');
    parts.forEach((part, i) => {
      addSep();
      const folderPath = parts.slice(0, i + 1).join('/');
      const isLast = i === parts.length - 1;
      addItem(capitalize(part), folderPath, isLast);
    });
  }
}

// ─── Stats bar ───────────────────────────────────────────────────────────────
function renderStats() {
  const folders = new Set(filtered.map(i => i.folder)).size;
  $stats.innerHTML = `
    <span>Showing <strong>${filtered.length}</strong> lesson${filtered.length !== 1 ? 's' : ''}</span>
    <span>across <strong>${folders}</strong> folder${folders !== 1 ? 's' : ''}</span>`;
}

// ─── Folder Tree ─────────────────────────────────────────────────────────────
function buildTree() {
  // Build nested tree structure from flat item list
  const root = {}; // { 'networking': { _count: 2, 'basic': { _count:1 } } }

  for (const item of allItems) {
    const parts = item.folder.split('/');
    let node = root;
    for (const part of parts) {
      if (!node[part]) node[part] = { _count: 0 };
      node[part]._count++;
      node = node[part];
    }
  }

  $tree.innerHTML = '';

  // "All" root button
  const allBtn = document.createElement('button');
  allBtn.className = 'tree-root-btn active';
  allBtn.id = 'treeAll';
  allBtn.innerHTML = `<span>📚</span> All Lessons
    <span class="tree-badge" style="margin-left:auto">${allItems.length}</span>`;
  allBtn.addEventListener('click', () => setFolder(null));
  $tree.appendChild(allBtn);

  // Recursive render
  renderTreeLevel(root, $tree, '');
}

function renderTreeLevel(node, container, pathSoFar) {
  for (const key of Object.keys(node).filter(k => k !== '_count').sort()) {
    const child = node[key];
    const fullPath = pathSoFar ? `${pathSoFar}/${key}` : key;
    const hasChildren = Object.keys(child).filter(k => k !== '_count').length > 0;

    const nodeEl = document.createElement('div');
    nodeEl.className = 'tree-node';

    const labelEl = document.createElement('button');
    labelEl.className = 'tree-label';
    labelEl.dataset.folder = fullPath;
    labelEl.innerHTML = `
      <span class="tree-chevron">${hasChildren ? '▶' : ' '}</span>
      <span class="tree-folder-icon">${hasChildren ? '📁' : '📂'}</span>
      <span class="tree-name">${escHtml(capitalize(key))}</span>
      <span class="tree-badge">${child._count}</span>`;

    labelEl.addEventListener('click', (e) => {
      e.stopPropagation();
      setFolder(fullPath);
      if (hasChildren) {
        labelEl.classList.toggle('open');
        childContainer.classList.toggle('open');
      }
    });

    nodeEl.appendChild(labelEl);

    const childContainer = document.createElement('div');
    childContainer.className = 'tree-children';

    if (hasChildren) {
      renderTreeLevel(child, childContainer, fullPath);
    }
    nodeEl.appendChild(childContainer);
    container.appendChild(nodeEl);
  }
}

// ─── Folder selection ────────────────────────────────────────────────────────
function setFolder(folder) {
  activeFolder = folder;

  // Update tree active states
  document.getElementById('treeAll').classList.toggle('active', folder === null);
  document.querySelectorAll('.tree-label').forEach(el => {
    el.classList.toggle('active', el.dataset.folder === folder);
  });

  applyFilters();
}

// ─── Skeletons (loading state) ────────────────────────────────────────────────
function showSkeletons(count = 8) {
  $grid.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skel" style="width:40%;height:24px"></div>
      <div class="skel" style="width:80%;height:16px"></div>
      <div class="skel" style="width:55%;height:14px"></div>
    </div>`).join('');
}

// ─── Error banner ─────────────────────────────────────────────────────────────
function showError(msg) {
  $error.textContent = `⚠️  ${msg}`;
  $error.hidden = false;
  $grid.innerHTML = '';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pickEmoji(item) {
  const haystack = `${item.folder} ${item.title} ${item.category}`.toLowerCase();
  for (const [regex, emoji] of EMOJI_MAP) {
    if (regex.test(haystack)) return emoji;
  }
  return DEFAULT_EMOJI;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}
