// ============================================================
// NUEVA MATERIA — Lógica de formulario + llamada a IA
// ============================================================

// --- Configurar PDF.js worker ---
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// --- Fecha mínima del date picker = hoy ---
document.addEventListener('DOMContentLoaded', () => {
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('fecha-examen').min = hoy;
  initDropZone();
});

// ============================================================
// DROP ZONE — PDFs
// ============================================================

let archivosSeleccionados = [];

function initDropZone() {
  const zone = document.getElementById('drop-zone');
  const input = document.getElementById('input-pdfs');

  document.getElementById('drop-click').addEventListener('click', () => input.click());
  zone.addEventListener('click', () => input.click());

  zone.addEventListener('dragover', e => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    agregarArchivos(e.dataTransfer.files);
  });

  input.addEventListener('change', () => {
    agregarArchivos(input.files);
    input.value = ''; // reset para permitir re-subir el mismo archivo
  });
}

function agregarArchivos(files) {
  Array.from(files).forEach(file => {
    if (file.type !== 'application/pdf') return;
    if (archivosSeleccionados.find(f => f.name === file.name)) return; // evitar duplicados
    archivosSeleccionados.push(file);
  });
  renderizarPDFs();
}

function eliminarPDF(nombre) {
  archivosSeleccionados = archivosSeleccionados.filter(f => f.name !== nombre);
  renderizarPDFs();
}

function renderizarPDFs() {
  const lista = document.getElementById('pdf-list');
  if (archivosSeleccionados.length === 0) {
    lista.innerHTML = '';
    return;
  }
  lista.innerHTML = archivosSeleccionados.map(f => `
    <div class="pdf-item">
      <span class="pdf-item-icon">📄</span>
      <span class="pdf-item-name" title="${f.name}">${f.name}</span>
      <button class="pdf-item-remove" onclick="eliminarPDF('${f.name.replace(/'/g, "\\'")}')" title="Eliminar">✕</button>
    </div>
  `).join('');
}

// ============================================================
// URLs
// ============================================================

let urlsAgregadas = [];

function agregarURL() {
  const input = document.getElementById('input-url');
  const url = input.value.trim();
  if (!url) return;
  if (urlsAgregadas.includes(url)) { input.value = ''; return; }
  urlsAgregadas.push(url);
  input.value = '';
  renderizarURLs();
}

// Permitir agregar con Enter
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('input-url').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); agregarURL(); }
  });
});

function eliminarURL(index) {
  urlsAgregadas.splice(index, 1);
  renderizarURLs();
}

function renderizarURLs() {
  const lista = document.getElementById('url-list');
  if (urlsAgregadas.length === 0) {
    lista.innerHTML = '';
    return;
  }
  lista.innerHTML = urlsAgregadas.map((url, i) => `
    <div class="url-item">
      <span class="url-item-text" title="${url}">${url}</span>
      <button class="url-item-remove" onclick="eliminarURL(${i})" title="Eliminar">✕</button>
    </div>
  `).join('');
}

// ============================================================
// GENERAR PLAN
// ============================================================

function mostrarError(msg) {
  const el = document.getElementById('nm-error');
  el.textContent = msg;
  el.classList.add('visible');
}

function ocultarError() {
  document.getElementById('nm-error').classList.remove('visible');
}

function slugMateria(nombre) {
  return nombre
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function generarPlan() {
  ocultarError();

  const nombreMateria = document.getElementById('nombre-materia').value.trim();
  const fechaExamen   = document.getElementById('fecha-examen').value;
  const metodologia   = document.getElementById('metodologia').value.trim();
  const preferencias  = document.getElementById('preferencias').value.trim();

  if (!nombreMateria) { mostrarError('Ingresá el nombre de la materia.'); return; }
  if (!fechaExamen)   { mostrarError('Seleccioná la fecha del examen.'); return; }
  if (!metodologia)   { mostrarError('Describí la metodología del examen.'); return; }

  const hoy = new Date().toISOString().split('T')[0];
  if (fechaExamen <= hoy) { mostrarError('La fecha del examen debe ser posterior a hoy.'); return; }

  // Mostrar loading
  const btn = document.getElementById('btn-generar');
  const submitArea = document.getElementById('nm-submit-area');
  const loading = document.getElementById('nm-loading');
  btn.disabled = true;
  submitArea.style.display = 'none';
  loading.classList.add('visible');

  try {
    // 1. Procesar PDFs
    let materialesTexto = '';
    if (archivosSeleccionados.length > 0) {
      materialesTexto = await procesarTodosLosPDFs(archivosSeleccionados);
    }

    // 2. Agregar URLs
    if (urlsAgregadas.length > 0) {
      materialesTexto += '\n\nURLs de referencia:\n' + urlsAgregadas.join('\n');
    }

    if (!materialesTexto.trim()) {
      materialesTexto = 'El estudiante no subió materiales específicos. Generá un plan general para la materia.';
    }

    // 3. Llamar al backend
    const respuesta = await fetch('/api/generate-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombreMateria,
        fechaExamen,
        metodologia,
        preferencias,
        materialesTexto
      })
    });

    if (!respuesta.ok) {
      const err = await respuesta.json().catch(() => ({}));
      throw new Error(err.error || 'Error del servidor');
    }

    const { plan } = await respuesta.json();

    // 4. Guardar plan en localStorage
    const slug = slugMateria(nombreMateria);
    storageSet('plan_' + slug, plan);
    storageSet('plan_meta_' + slug, {
      nombreMateria,
      fechaExamen,
      slug,
      creadoEn: new Date().toISOString()
    });

    // 5. Redirigir al plan
    window.location.href = 'plan.html?materia=' + slug;

  } catch (error) {
    loading.classList.remove('visible');
    submitArea.style.display = 'flex';
    btn.disabled = false;
    mostrarError(error.message || 'Ocurrió un error. Verificá tu conexión e intentá de nuevo.');
  }
}
