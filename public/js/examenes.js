// ============================
// MÓDULO EXÁMENES
// ============================

// --- RENDER ---

function renderExamenes() {
  const examenes = storageGet('examenes') || [];
  const container = document.getElementById('examenes-lista');

  if (examenes.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>Sin exámenes registrados</h3>
        <p>Cargá las fechas para saber cuánto tiempo tenés.</p>
      </div>
    `;
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sorted = [...examenes].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const proximos = sorted.filter(e => new Date(e.fecha + 'T00:00:00') >= today);
  const pasados  = sorted.filter(e => new Date(e.fecha + 'T00:00:00') < today);

  let html = '';

  if (proximos.length > 0) {
    html += `<div class="section-title">Próximos</div>`;
    html += proximos.map(e => buildExamenCard(e)).join('');
  }

  if (pasados.length > 0) {
    html += `<div class="section-title" style="margin-top:24px">Pasados</div>`;
    html += pasados.map(e => buildExamenCard(e, true)).join('');
  }

  container.innerHTML = html;
}

function buildExamenCard(e, past = false) {
  const d      = daysUntil(e.fecha);
  let countdownNum, countdownLabel;

  if (past) {
    countdownNum   = Math.abs(d);
    countdownLabel = 'días atrás';
  } else if (d === 0) {
    countdownNum   = 'HOY';
    countdownLabel = '';
  } else if (d === 1) {
    countdownNum   = '1';
    countdownLabel = 'día';
  } else {
    countdownNum   = d;
    countdownLabel = 'días';
  }

  const urgent  = !past && d <= 3           ? 'urgent'  : '';
  const warning = !past && d >= 4 && d <= 7 ? 'warning' : '';

  return `
    <div class="examen-card ${past ? 'past' : ''} ${urgent} ${warning}">
      <div class="examen-countdown">
        <div class="countdown-num">${countdownNum}</div>
        ${countdownLabel ? `<div class="countdown-label">${countdownLabel}</div>` : ''}
      </div>
      <div class="examen-info">
        <div class="examen-nombre">${e.nombre}</div>
        <div class="examen-meta">
          <span>${e.materia}</span>
          <span>${formatDate(e.fecha)}</span>
          <span class="tipo-badge">${e.tipo}</span>
        </div>
        ${e.notas ? `<div style="font-size:0.82rem;color:var(--text-muted);margin-top:4px">${e.notas}</div>` : ''}
      </div>
      <button class="btn btn-danger btn-sm" onclick="eliminarExamen('${e.id}')">✕</button>
    </div>
  `;
}

function poblarSelectMaterias() {
  const materias = storageGet('materias') || [];
  const select   = document.getElementById('examen-materia');

  if (materias.length === 0) {
    select.innerHTML = `<option value="">— Sin materias cargadas —</option>`;
    return;
  }

  select.innerHTML = `<option value="">Elegí una materia...</option>` +
    materias.map(m => `<option value="${m.nombre}">${m.nombre}</option>`).join('');
}

// --- ACCIONES ---

function guardarExamen() {
  const nombre  = document.getElementById('examen-nombre').value.trim();
  const materia = document.getElementById('examen-materia').value;
  const fecha   = document.getElementById('examen-fecha').value;
  const tipo    = document.getElementById('examen-tipo').value;
  const notas   = document.getElementById('examen-notas').value.trim();

  if (!nombre)  { toast('Ingresá el nombre del examen'); return; }
  if (!materia) { toast('Seleccioná una materia'); return; }
  if (!fecha)   { toast('Ingresá la fecha'); return; }

  const examenes = storageGet('examenes') || [];
  examenes.push({ id: genId(), nombre, materia, fecha, tipo, notas });
  storageSet('examenes', examenes);

  document.getElementById('form-examen').reset();
  toast('Examen agregado');
  renderExamenes();
}

function eliminarExamen(id) {
  if (!confirm('¿Eliminar este examen?')) return;
  const examenes = (storageGet('examenes') || []).filter(e => e.id !== id);
  storageSet('examenes', examenes);
  toast('Examen eliminado');
  renderExamenes();
}

// --- INIT ---

document.addEventListener('DOMContentLoaded', () => {
  // Fecha mínima: hoy
  const hoy = new Date().toISOString().split('T')[0];
  document.getElementById('examen-fecha').min = hoy;

  poblarSelectMaterias();
  renderExamenes();
});
