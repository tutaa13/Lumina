// ============================================================
// PLAN.JS — Renderiza el plan generado por la IA
// ============================================================

const FASE_COLORES = {
  reactivar: '#4F46A0', // índigo
  practica:  '#C4A35A', // dorado
  oral:      '#C4604A', // rojo
  repaso:    '#4A7C5F', // verde
};

const FASE_COLORES_FALLBACK = ['#4F46A0', '#C4A35A', '#C4604A', '#4A7C5F'];

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const slug   = params.get('materia');

  if (!slug) {
    renderError('No se especificó una materia. <a href="nueva-materia.html">Creá un plan nuevo →</a>');
    return;
  }

  const plan = storageGet('plan_' + slug);

  if (!plan) {
    renderError('No se encontró el plan para esta materia. <a href="nueva-materia.html">Generá uno nuevo →</a>');
    return;
  }

  // Actualizar breadcrumb
  const bc = document.getElementById('bc-materia');
  if (bc) bc.textContent = plan.nombreMateria || 'Plan';
  document.title = plan.nombreMateria + ' · Lumina';

  renderPlan(plan, slug);
});

// ============================================================
// RENDER PRINCIPAL
// ============================================================

function renderPlan(plan, slug) {
  const progreso = storageGet('progreso_' + slug) || {};
  const diasCompletados = Object.values(progreso).filter(Boolean).length;
  const totalDias = plan.dias ? plan.dias.length : 0;
  const pct = totalDias > 0 ? Math.round((diasCompletados / totalDias) * 100) : 0;

  const diasRestantes = daysUntil(plan.fechaExamen.includes('/') ? isoDesdeFormato(plan.fechaExamen) : plan.fechaExamen);
  const urgClass = diasRestantes <= 3 ? 'urgent' : diasRestantes <= 7 ? 'warning' : 'ok';

  const content = document.getElementById('plan-content');
  content.innerHTML = `
    <div class="plan-header">
      <div class="plan-materia">${plan.nombreMateria}</div>
      <div class="plan-fecha">Examen: ${plan.fechaExamen}</div>
    </div>

    <div class="plan-countdown-strip">
      <div>
        <div class="plan-countdown-num ${urgClass}">${diasRestantes < 0 ? '—' : diasRestantes}</div>
        <div class="plan-countdown-label">${diasRestantes < 0 ? 'examen pasado' : diasRestantes === 1 ? 'día restante' : 'días restantes'}</div>
      </div>
      <div class="plan-countdown-sep"></div>
      <div class="plan-resumen">${plan.resumenPlan || ''}</div>
    </div>

    <div class="plan-progress-wrap">
      <div class="plan-progress-header">
        <span class="plan-progress-title">Progreso del plan</span>
        <span class="plan-progress-pct">${diasCompletados}/${totalDias} días · ${pct}%</span>
      </div>
      <div class="plan-progress-bar-outer">
        <div class="plan-progress-bar-fill" id="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>

    ${renderFases(plan.fases)}

    <div class="plan-dias-title">Plan día a día</div>
    <div id="dias-container">
      ${(plan.dias || []).map(dia => renderDiaCard(dia, progreso, slug)).join('')}
    </div>

    <div style="margin-top:32px;padding-top:20px;border-top:1px solid var(--border)">
      <a href="index.html" class="btn btn-ghost">← Volver al Dashboard</a>
      <a href="nueva-materia.html" class="btn btn-ghost btn-sm" style="margin-left:12px">Nuevo plan</a>
    </div>
  `;

  // Inicializar acordeones y checkboxes
  initDiaCards(plan, slug);
}

// ============================================================
// RENDER FASES
// ============================================================

function renderFases(fases) {
  if (!fases || fases.length === 0) return '';
  const badges = fases.map((f, i) => {
    const color = FASE_COLORES[f.tipo] || FASE_COLORES_FALLBACK[i % FASE_COLORES_FALLBACK.length];
    return `
      <div class="fase-badge" title="${f.descripcion || ''}">
        <div class="fase-badge-dot" style="background:${color}"></div>
        <span class="fase-badge-num">Fase ${f.numero}</span>
        <span class="fase-badge-nombre">${f.nombre}</span>
      </div>
    `;
  }).join('');
  return `<div class="plan-fases">${badges}</div>`;
}

// ============================================================
// RENDER DÍA CARD
// ============================================================

function renderDiaCard(dia, progreso, slug) {
  const estaCompleto = !!progreso[dia.numero];
  const tags = (dia.tags || []).map(t =>
    `<span class="dia-tag ${t}">${t}</span>`
  ).join('');

  const tiempoLabel = dia.tiempoMinutos
    ? `${dia.tiempoMinutos >= 60 ? Math.floor(dia.tiempoMinutos / 60) + 'h ' : ''}${dia.tiempoMinutos % 60 ? dia.tiempoMinutos % 60 + 'min' : ''}`.trim()
    : '';

  const pasos = (dia.pasos || []).map((paso, pi) => {
    const cbId = `paso-${dia.numero}-${pi}`;
    return `
      <li class="dia-paso" id="li-${cbId}">
        <input type="checkbox" id="${cbId}" data-dia="${dia.numero}" data-slug="${slug}" onchange="togglePaso(this)">
        <label for="${cbId}">${paso}</label>
      </li>
    `;
  }).join('');

  const notaHtml = dia.nota
    ? `<div class="dia-nota">${dia.nota}</div>`
    : '';

  return `
    <div class="dia-card ${estaCompleto ? 'completado' : ''}" id="dia-card-${dia.numero}">
      <div class="dia-card-header" onclick="toggleDia(${dia.numero})">
        <div class="dia-num-badge">${estaCompleto ? '✓' : dia.numero}</div>
        <div class="dia-card-info">
          <div class="dia-titulo">${dia.titulo}</div>
          <div class="dia-subtitulo">${dia.subtitulo || (dia.fecha ? 'Día ' + dia.numero + ' · ' + dia.fecha : '')}</div>
        </div>
        <div class="dia-card-right">
          <div class="dia-tags">${tags}</div>
          ${tiempoLabel ? `<span class="dia-tiempo">${tiempoLabel}</span>` : ''}
          <span class="dia-chevron">▶</span>
        </div>
      </div>
      <div class="dia-card-body">
        ${dia.fecha ? `<span class="dia-fecha-label">${dia.fecha}</span>` : ''}
        <ul class="dia-pasos">${pasos}</ul>
        ${notaHtml}
        <button
          class="btn btn-primary btn-sm dia-completar-btn"
          id="btn-completar-${dia.numero}"
          onclick="marcarDiaCompleto(${dia.numero}, '${slug}')"
        >${estaCompleto ? '✓ Completado' : 'Marcar como completado'}</button>
      </div>
    </div>
  `;
}

// ============================================================
// INTERACTIVIDAD
// ============================================================

function toggleDia(num) {
  const card = document.getElementById('dia-card-' + num);
  if (card) card.classList.toggle('open');
}

function togglePaso(checkbox) {
  const li = document.getElementById('li-' + checkbox.id);
  if (li) li.classList.toggle('marcado', checkbox.checked);
}

function marcarDiaCompleto(num, slug) {
  const progreso = storageGet('progreso_' + slug) || {};
  progreso[num] = !progreso[num]; // toggle
  storageSet('progreso_' + slug, progreso);

  // Actualizar UI
  const card = document.getElementById('dia-card-' + num);
  const badge = card ? card.querySelector('.dia-num-badge') : null;
  const btn   = document.getElementById('btn-completar-' + num);
  const estaCompleto = progreso[num];

  if (card) card.classList.toggle('completado', estaCompleto);
  if (badge) badge.textContent = estaCompleto ? '✓' : String(num);
  if (btn) btn.textContent = estaCompleto ? '✓ Completado' : 'Marcar como completado';

  // Actualizar barra de progreso
  const plan = storageGet('plan_' + slug);
  const totalDias = plan ? (plan.dias || []).length : 0;
  const diasCompletados = Object.values(progreso).filter(Boolean).length;
  const pct = totalDias > 0 ? Math.round((diasCompletados / totalDias) * 100) : 0;

  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';

  const pctLabel = document.querySelector('.plan-progress-pct');
  if (pctLabel) pctLabel.textContent = `${diasCompletados}/${totalDias} días · ${pct}%`;

  // Registrar actividad de racha
  if (estaCompleto) recordStudyActivity();
}

function initDiaCards(plan, slug) {
  // Abrir el primer día no completado automáticamente
  const progreso = storageGet('progreso_' + slug) || {};
  const primerSinCompletar = (plan.dias || []).find(d => !progreso[d.numero]);
  if (primerSinCompletar) {
    const card = document.getElementById('dia-card-' + primerSinCompletar.numero);
    if (card) card.classList.add('open');
  }
}

// ============================================================
// HELPERS
// ============================================================

function renderError(msg) {
  const content = document.getElementById('plan-content');
  content.innerHTML = `
    <div class="plan-empty">
      <h3>Plan no encontrado</h3>
      <p>${msg}</p>
    </div>
  `;
}

// Convierte "15 de Marzo" → intenta parsear la fecha para daysUntil
function isoDesdeFormato(fechaStr) {
  // Si ya es ISO (YYYY-MM-DD), devolver tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) return fechaStr;
  // Intentar parse nativo
  const d = new Date(fechaStr);
  if (!isNaN(d)) return d.toISOString().split('T')[0];
  return fechaStr;
}
