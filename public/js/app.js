// ============================================================
// ANTI-FOUC — se llama desde un inline script en <head>
// de cada HTML para prevenir flash de tema incorrecto.
// ============================================================
// (Ver cada HTML: <script>appInitTheme();</script> en <head>)
function appInitTheme() {
  const t = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', t);
}

// ============================================================
// UTILIDADES COMPARTIDAS
// ============================================================

function storageGet(key) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch { return null; }
}

function storageSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function toast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  const [year, month, day] = isoStr.split('T')[0].split('-');
  return `${day}/${month}/${year}`;
}

function daysUntil(isoStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(isoStr + 'T00:00:00');
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

const MATERIA_COLORS = [
  '#6366F1', // indigo
  '#F59E0B', // amber
  '#10B981', // emerald
  '#F97316', // orange
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#EF4444', // red
];

// ============================================================
// RACHA DE ESTUDIO
// ============================================================

function recordStudyActivity() {
  const today = new Date().toISOString().split('T')[0];
  const data  = storageGet('streak') || { count: 0, lastDate: null };
  if (data.lastDate === today) return; // ya fue registrado hoy

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  data.count = (data.lastDate === yesterday) ? data.count + 1 : 1;
  data.lastDate = today;
  storageSet('streak', data);
}

function getStreak() {
  const data  = storageGet('streak') || { count: 0, lastDate: null };
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  // Si la última actividad no fue hoy ni ayer, la racha se rompió
  if (data.lastDate !== today && data.lastDate !== yesterday) return 0;
  return data.count;
}

function getMateriaColor(nombre) {
  const materias = storageGet('materias') || [];
  const m = materias.find(x => x.nombre === nombre);
  return m ? m.color : '#4f46e5';
}

// ============================================================
// DARK MODE
// ============================================================

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  _updateThemeIcon(next);
}

function _updateThemeIcon(theme) {
  const icon = document.getElementById('theme-icon');
  if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ============================================================
// SIDEBAR (MOBILE)
// ============================================================

function _initSidebar() {
  const hamburger = document.getElementById('hamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebar-overlay');
  if (!hamburger || !sidebar || !overlay) return;

  hamburger.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  });
  overlay.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  });
}

// ============================================================
// ACTIVE NAV ITEM
// ============================================================

function _initActiveNav() {
  const items = document.querySelectorAll('.nav-item[data-page]');
  const path  = window.location.pathname;

  items.forEach(item => {
    item.classList.remove('active');
    const page = item.getAttribute('data-page');
    const isActive =
      (page === 'dashboard'     && (path.endsWith('index.html') || path.endsWith('/app-estudio/') || path === '/')) ||
      (page === 'apuntes'       && path.endsWith('apuntes.html'))       ||
      (page === 'examenes'      && path.endsWith('examenes.html'))      ||
      (page === 'flashcards'    && path.endsWith('flashcards.html'))    ||
      (page === 'nueva-materia' && (path.endsWith('nueva-materia.html') || path.endsWith('plan.html')));
    if (isActive) item.classList.add('active');
  });
}

// ============================================================
// PAGE TRANSITIONS
// ============================================================

function _initPageTransitions() {
  document.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href');
    // Solo interceptar links internos a páginas HTML
    if (!href || !href.match(/\.html$/)) return;

    link.addEventListener('click', e => {
      e.preventDefault();
      const wrapper = document.querySelector('.page-wrapper');
      if (wrapper) wrapper.classList.add('page-exit');
      setTimeout(() => { window.location.href = href; }, 180);
    });
  });
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  // Sync theme icon with current saved theme
  const theme = localStorage.getItem('theme') || 'light';
  _updateThemeIcon(theme);

  _initSidebar();
  _initActiveNav();
  _initPageTransitions();
});
