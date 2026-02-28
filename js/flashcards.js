// ============================
// MÓDULO FLASHCARDS
// ============================

// Estado del repaso
let repasoState = {
  mazoId:     null,
  cards:      [],
  index:      0,
  bien:       0,
  mal:        0,
  revealed:   false,
  retryCards: [],   // tarjetas marcadas "no sabía" — vuelven al final
  inRetry:    false // true cuando estamos en la ronda de repaso
};

// --- RENDER MAZOS ---

function renderMazos() {
  const mazos     = storageGet('mazos') || [];
  const container = document.getElementById('mazos-container');
  const repaso    = document.getElementById('repaso-section');
  const lista     = document.getElementById('mazos-section');

  repaso.style.display = 'none';
  lista.style.display  = 'block';

  if (mazos.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">🃏</div>
        <h3>Sin mazos todavía</h3>
        <p>Creá un mazo, cargá tarjetas y empezá a repasar.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = mazos.map(m => {
    const count = m.cards ? m.cards.length : 0;
    return `
      <div class="mazo-card" onclick="verMazo('${m.id}')">
        <div style="font-size:1.8rem">${m.emoji || '🃏'}</div>
        <div class="mazo-name">${m.nombre}</div>
        <div class="mazo-count">${count} tarjeta${count !== 1 ? 's' : ''}</div>
        <div class="mazo-footer">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();iniciarRepaso('${m.id}')">
            ▶ Repasar
          </button>
          <button class="btn btn-danger btn-sm" onclick="event.stopPropagation();eliminarMazo('${m.id}')">✕</button>
        </div>
      </div>
    `;
  }).join('');
}

// --- VER MAZO (añadir tarjetas) ---

function verMazo(id) {
  const mazos = storageGet('mazos') || [];
  const mazo  = mazos.find(m => m.id === id);
  if (!mazo) return;

  const select = document.getElementById('tarjeta-mazo');
  select.value = id;

  // Scroll al formulario en mobile
  document.getElementById('add-card-form').scrollIntoView({ behavior: 'smooth' });
}

// --- REPASO ---

function iniciarRepaso(id) {
  const mazos = storageGet('mazos') || [];
  const mazo  = mazos.find(m => m.id === id);
  if (!mazo || !mazo.cards || mazo.cards.length === 0) {
    toast('Este mazo no tiene tarjetas. ¡Agregá algunas!');
    return;
  }

  // Mezclar tarjetas
  const shuffled = [...mazo.cards].sort(() => Math.random() - 0.5);

  repasoState = { mazoId: id, cards: shuffled, index: 0, bien: 0, mal: 0, revealed: false, retryCards: [], inRetry: false };

  document.getElementById('repaso-nombre').textContent = mazo.nombre;
  document.getElementById('mazos-section').style.display = 'none';
  document.getElementById('repaso-section').style.display = 'block';
  document.getElementById('resultado-repaso').classList.remove('active');
  document.getElementById('repaso-cards').style.display = 'flex';

  mostrarTarjeta();
}

function mostrarTarjeta() {
  const { cards, index } = repasoState;
  const total = cards.length;

  // Progress
  const pct = Math.round((index / total) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${index} / ${total}`;

  // Card
  const card = cards[index];
  document.getElementById('card-frente').textContent  = card.frente;
  document.getElementById('card-dorso').textContent   = card.dorso;

  // Reset flip
  const fc = document.getElementById('flashcard-el');
  fc.classList.remove('flipped');
  repasoState.revealed = false;

  // Ocultar botones bien/mal hasta que se revele
  document.getElementById('btn-mal').style.display  = 'none';
  document.getElementById('btn-bien').style.display = 'none';
  document.getElementById('btn-revelar').style.display = 'inline-flex';
}

function revelarRespuesta() {
  document.getElementById('flashcard-el').classList.add('flipped');
  repasoState.revealed = true;
  document.getElementById('btn-revelar').style.display = 'none';
  document.getElementById('btn-mal').style.display  = 'inline-flex';
  document.getElementById('btn-bien').style.display = 'inline-flex';
}

function responder(conocida) {
  if (!repasoState.revealed) return;

  if (conocida) {
    repasoState.bien++;
    // Animación de celebración
    const btn = document.getElementById('btn-bien');
    btn.classList.add('celebrating');
    setTimeout(() => btn.classList.remove('celebrating'), 350);
  } else {
    repasoState.mal++;
    // Guardar para repaso si no estamos ya en la ronda de repaso
    if (!repasoState.inRetry) {
      repasoState.retryCards.push(repasoState.cards[repasoState.index]);
    }
  }

  repasoState.index++;

  if (repasoState.index >= repasoState.cards.length) {
    // ¿Hay tarjetas para repasar y todavía no hicimos la ronda de repaso?
    if (!repasoState.inRetry && repasoState.retryCards.length > 0) {
      repasoState.inRetry = true;
      repasoState.cards   = repasoState.retryCards;
      repasoState.retryCards = [];
      repasoState.index   = 0;
      _mostrarAvisoRepaso();
      mostrarTarjeta();
    } else {
      recordStudyActivity();
      mostrarResultado();
    }
  } else {
    mostrarTarjeta();
  }
}

function _mostrarAvisoRepaso() {
  // Mostrar aviso breve de que vienen las tarjetas a repasar
  let notice = document.getElementById('retry-notice');
  if (!notice) {
    notice = document.createElement('div');
    notice.id = 'retry-notice';
    notice.className = 'retry-notice';
    const actionsEl = document.querySelector('.repaso-actions');
    actionsEl.parentNode.insertBefore(notice, actionsEl);
  }
  notice.textContent = `🔄 Repasando ${repasoState.cards.length} tarjeta${repasoState.cards.length !== 1 ? 's' : ''} que no sabías...`;
  setTimeout(() => { if (notice) notice.remove(); }, 4000);
}

function mostrarResultado() {
  document.getElementById('repaso-cards').style.display = 'none';
  const res = document.getElementById('resultado-repaso');
  res.classList.add('active');

  const { bien, mal, cards } = repasoState;
  const pct = Math.round((bien / cards.length) * 100);

  let emoji = pct >= 80 ? '🎉' : pct >= 50 ? '😊' : '💪';
  let msg   = pct >= 80 ? '¡Excelente repaso!' : pct >= 50 ? 'Buen trabajo, seguí practicando' : 'No te rindas, la práctica hace al maestro';

  document.getElementById('resultado-icon').textContent = emoji;
  document.getElementById('resultado-msg').textContent  = msg;
  document.getElementById('resultado-bien').textContent = bien;
  document.getElementById('resultado-mal').textContent  = mal;
  document.getElementById('resultado-pct').textContent  = pct + '%';

  // Progress bar al 100%
  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('progress-label').textContent = `${cards.length} / ${cards.length}`;
}

function repetirRepaso() {
  iniciarRepaso(repasoState.mazoId);
}

// --- CREAR MAZO ---

function abrirModalMazo() {
  document.getElementById('modal-mazo').classList.add('open');
  document.getElementById('form-mazo').reset();
}
function cerrarModalMazo() {
  document.getElementById('modal-mazo').classList.remove('open');
}

function guardarMazo() {
  const nombre = document.getElementById('mazo-nombre').value.trim();
  const emoji  = document.getElementById('mazo-emoji').value.trim() || '🃏';
  if (!nombre) { toast('Ingresá un nombre para el mazo'); return; }

  const mazos = storageGet('mazos') || [];
  const nuevoMazo = { id: genId(), nombre, emoji, cards: [] };
  mazos.push(nuevoMazo);
  storageSet('mazos', mazos);

  // Actualizar select de tarjetas
  actualizarSelectMazos();
  cerrarModalMazo();
  toast('Mazo creado.');
  renderMazos();

  // Pre-seleccionar el nuevo mazo
  document.getElementById('tarjeta-mazo').value = nuevoMazo.id;
}

// --- AGREGAR TARJETA ---

function guardarTarjeta() {
  const mazoId = document.getElementById('tarjeta-mazo').value;
  const frente = document.getElementById('tarjeta-frente').value.trim();
  const dorso  = document.getElementById('tarjeta-dorso').value.trim();

  if (!mazoId) { toast('Seleccioná un mazo'); return; }
  if (!frente) { toast('Ingresá el frente de la tarjeta (pregunta)'); return; }
  if (!dorso)  { toast('Ingresá el dorso de la tarjeta (respuesta)'); return; }

  const mazos = storageGet('mazos') || [];
  const mazo  = mazos.find(m => m.id === mazoId);
  if (!mazo) { toast('Mazo no encontrado'); return; }

  if (!mazo.cards) mazo.cards = [];
  mazo.cards.push({ id: genId(), frente, dorso });
  storageSet('mazos', mazos);

  document.getElementById('form-tarjeta').reset();
  actualizarSelectMazos();
  document.getElementById('tarjeta-mazo').value = mazoId; // mantener mazo seleccionado
  toast('Tarjeta agregada.');
  renderMazos();
}

function actualizarSelectMazos() {
  const mazos  = storageGet('mazos') || [];
  const select = document.getElementById('tarjeta-mazo');
  select.innerHTML = `<option value="">Elegí un mazo...</option>` +
    mazos.map(m => `<option value="${m.id}">${m.emoji} ${m.nombre} (${m.cards ? m.cards.length : 0})</option>`).join('');
}

// --- ELIMINAR MAZO ---

function eliminarMazo(id) {
  if (!confirm('¿Eliminar este mazo y todas sus tarjetas?')) return;
  const mazos = (storageGet('mazos') || []).filter(m => m.id !== id);
  storageSet('mazos', mazos);
  actualizarSelectMazos();
  toast('Mazo eliminado');
  renderMazos();
}

// --- INIT ---

document.addEventListener('DOMContentLoaded', () => {
  actualizarSelectMazos();
  renderMazos();

  // Click en flashcard para revelar
  document.getElementById('flashcard-el').addEventListener('click', () => {
    if (!repasoState.revealed) revelarRespuesta();
  });

  // Cerrar modal al click en overlay
  document.getElementById('modal-mazo').addEventListener('click', e => {
    if (e.target.id === 'modal-mazo') cerrarModalMazo();
  });
});
