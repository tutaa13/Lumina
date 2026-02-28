// ============================
// MÓDULO APUNTES
// ============================

let materiaSeleccionada = null;

// --- RENDER ---

function renderMaterias() {
  const materias = storageGet('materias') || [];
  const lista = document.getElementById('lista-materias');

  if (materias.length === 0) {
    lista.innerHTML = `<div style="padding:20px 16px;text-align:center">
      <p style="font-size:0.78rem;color:var(--text-xs);line-height:1.6;font-family:'DM Mono',monospace;letter-spacing:0.05em">Sin materias.<br>Creá una para empezar.</p>
    </div>`;
    return;
  }

  const apuntes = storageGet('apuntes') || [];
  lista.innerHTML = materias.map(m => {
    const count = apuntes.filter(a => a.materiaId === m.id).length;
    const active = materiaSeleccionada === m.id ? 'active' : '';
    return `
      <div class="materia-item ${active}" onclick="seleccionarMateria('${m.id}')">
        <span class="color-dot" style="background:${m.color}"></span>
        <span class="materia-name">${m.nombre}</span>
        <span class="materia-count">${count}</span>
      </div>
    `;
  }).join('');
}

function renderApuntes() {
  const container = document.getElementById('apuntes-lista');
  const toolbar   = document.getElementById('apuntes-toolbar');
  const apuntes   = storageGet('apuntes') || [];
  const materias  = storageGet('materias') || [];

  if (materias.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <h3>Cargá tu primera materia</h3>
        <p>Usá <strong>+ Nueva materia</strong> para empezar a organizar el material.</p>
      </div>
    `;
    toolbar.style.display = 'none';
    return;
  }

  toolbar.style.display = 'flex';

  const query = document.getElementById('search-input')?.value.toLowerCase() || '';
  let filtered = apuntes;

  if (materiaSeleccionada) {
    filtered = filtered.filter(a => a.materiaId === materiaSeleccionada);
  }
  if (query) {
    filtered = filtered.filter(a =>
      a.titulo.toLowerCase().includes(query) ||
      a.contenido.toLowerCase().includes(query)
    );
  }

  const materia = materias.find(m => m.id === materiaSeleccionada);
  const color   = materia ? materia.color : 'var(--color-apuntes)';

  const titleEl = document.getElementById('apuntes-title');
  titleEl.textContent = materia
    ? `${materia.nombre} · ${filtered.length} apunte${filtered.length !== 1 ? 's' : ''}`
    : `Todos · ${filtered.length} apunte${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${query ? '🔍' : '📄'}</div>
        <h3>${query ? 'Sin resultados' : 'Sin apuntes en esta materia'}</h3>
        <p>${query ? 'Probá con otras palabras.' : 'Cargá el material de esta materia para tenerlo a mano.'}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered
    .sort((a, b) => b.creado - a.creado)
    .map(a => `
      <div class="apunte-card" style="border-left-color:${color}">
        <div class="apunte-header">
          <span class="apunte-title">${a.titulo}</span>
          <span class="apunte-date">${formatDate(new Date(a.creado).toISOString())}</span>
        </div>
        <div class="apunte-body">${a.contenido}</div>
        <div class="apunte-footer">
          <button class="btn btn-danger btn-sm" onclick="eliminarApunte('${a.id}')">Eliminar</button>
        </div>
      </div>
    `).join('');
}

function renderAll() {
  renderMaterias();
  renderApuntes();
}

// --- ACCIONES ---

function seleccionarMateria(id) {
  materiaSeleccionada = (materiaSeleccionada === id) ? null : id;
  renderAll();
}

function eliminarApunte(id) {
  const apuntes = (storageGet('apuntes') || []).filter(a => a.id !== id);
  storageSet('apuntes', apuntes);
  toast('Apunte eliminado');
  renderAll();
}

function eliminarMateria(id) {
  if (!confirm('¿Eliminar esta materia y todos sus apuntes?')) return;
  const materias = (storageGet('materias') || []).filter(m => m.id !== id);
  const apuntes  = (storageGet('apuntes')  || []).filter(a => a.materiaId !== id);
  storageSet('materias', materias);
  storageSet('apuntes', apuntes);
  if (materiaSeleccionada === id) materiaSeleccionada = null;
  toast('Materia eliminada');
  renderAll();
}

// --- MODAL MATERIA ---

function abrirModalMateria() {
  document.getElementById('modal-materia').classList.add('open');
  document.getElementById('form-materia').reset();
  // Seleccionar primer color
  document.querySelectorAll('.color-option').forEach((el, i) => {
    el.classList.toggle('selected', i === 0);
  });
}

function cerrarModalMateria() {
  document.getElementById('modal-materia').classList.remove('open');
}

function guardarMateria() {
  const nombre = document.getElementById('materia-nombre').value.trim();
  if (!nombre) { toast('Ingresá un nombre para la materia'); return; }

  const colorEl = document.querySelector('.color-option.selected');
  const color   = colorEl ? colorEl.dataset.color : MATERIA_COLORS[0];

  const materias = storageGet('materias') || [];
  if (materias.find(m => m.nombre.toLowerCase() === nombre.toLowerCase())) {
    toast('Ya existe una materia con ese nombre'); return;
  }

  materias.push({ id: genId(), nombre, color });
  storageSet('materias', materias);
  cerrarModalMateria();
  toast('Materia creada.');
  renderAll();
}

// --- MODAL APUNTE ---

function abrirModalApunte() {
  const materias = storageGet('materias') || [];
  if (materias.length === 0) {
    toast('Primero creá una materia'); return;
  }

  const select = document.getElementById('apunte-materia');
  select.innerHTML = materias.map(m =>
    `<option value="${m.id}" ${m.id === materiaSeleccionada ? 'selected' : ''}>${m.nombre}</option>`
  ).join('');

  document.getElementById('modal-apunte').classList.add('open');
  document.getElementById('form-apunte').reset();
  // Re-set select after reset
  if (materiaSeleccionada) select.value = materiaSeleccionada;
}

function cerrarModalApunte() {
  document.getElementById('modal-apunte').classList.remove('open');
}

function guardarApunte() {
  const titulo    = document.getElementById('apunte-titulo').value.trim();
  const contenido = document.getElementById('apunte-contenido').value.trim();
  const materiaId = document.getElementById('apunte-materia').value;

  if (!titulo)    { toast('Ingresá un título'); return; }
  if (!contenido) { toast('Ingresá el contenido'); return; }

  const apuntes = storageGet('apuntes') || [];
  apuntes.push({ id: genId(), titulo, contenido, materiaId, creado: Date.now() });
  storageSet('apuntes', apuntes);
  recordStudyActivity();
  cerrarModalApunte();
  toast('Apunte guardado.');
  renderAll();
}

// --- INIT ---

document.addEventListener('DOMContentLoaded', () => {
  renderAll();

  document.getElementById('search-input').addEventListener('input', renderApuntes);

  // Color picker
  document.querySelectorAll('.color-option').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
      el.classList.add('selected');
    });
  });

  // Cerrar modales al click en overlay
  ['modal-materia', 'modal-apunte'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      if (e.target.id === id) {
        document.getElementById(id).classList.remove('open');
      }
    });
  });
});
