// ============== AOS y utilidades comunes ==============
(function () {
  if (window.AOS) AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic' });
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  // Carrusel auto (si existe)
  const carrusel = document.getElementById('carruselPerros');
  if (carrusel && window.bootstrap) {
    new bootstrap.Carousel(carrusel, { interval: 3500, ride: 'carousel', pause: "hover" });
  }
})();

// ============== Animación de huellitas ==============
function spawnPaws(count = 14) {
  const overlay = document.getElementById('pawOverlay');
  if (!overlay) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'paw';
    const startX = Math.random() * window.innerWidth;
    const startY = window.innerHeight + Math.random() * 120;
    const dx = (Math.random() * 200 - 100);
    const dy = -(window.innerHeight + 200);
    const rot = (Math.random() * 40 - 20) + 'deg';
    p.style.left = startX + 'px';
    p.style.top = startY + 'px';
    p.style.setProperty('--dx', dx + 'px');
    p.style.setProperty('--dy', dy + 'px');
    p.style.setProperty('--rot', rot);
    p.style.animationDelay = (i * 0.08) + 's';
    overlay.appendChild(p);
    p.addEventListener('animationend', () => p.remove());
  }
}
setInterval(() => spawnPaws(4), 6000);

// ============== Disponibilidad sin backend ==============
const CONFIG_URL = '../data/availability.json'; // ruta desde /pages
let AVAIL = {
  businessHours: {
    0:{active:false},
    1:{active:true, open:'16:00', close:'18:00', slot:30},
    2:{active:true, open:'16:00', close:'18:00', slot:30},
    3:{active:true, open:'09:00', close:'17:00', slot:30},
    4:{active:true, open:'16:00', close:'18:00', slot:30},
    5:{active:true, open:'16:00', close:'18:00', slot:30},
    6:{active:true, open:'09:00', close:'17:00', slot:30}
  },
  serviceDurations: {
    'Baño':60, 'Baño + sanitario':70, 'Baño + corte':90, 'Corte de uñas':15
  },
  blackoutDates: [],
  booked: {}
};

// Utils tiempo
function hhmmToMin(hhmm){ const [h,m]=hhmm.split(':').map(Number); return h*60+m; }
function minToHHMM(min){ const h=Math.floor(min/60), m=min%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
function overlaps(startA, durA, startB, durB){
  const a0=hhmmToMin(startA), a1=a0+durA, b0=hhmmToMin(startB), b1=b0+durB;
  return a0 < b1 && b0 < a1;
}
function ymd(date){ return date.toISOString().slice(0,10); }

async function loadAvailability(){
  try {
    const r = await fetch(CONFIG_URL, { cache: 'no-store' });
    if (r.ok) AVAIL = await r.json();
  } catch(e){ console.warn('No se pudo cargar availability.json, uso fallback'); }
}

function isBlackout(dateStr){ return (AVAIL.blackoutDates||[]).includes(dateStr); }
function isActiveDay(date){
  const dow = date.getDay();
  const h = AVAIL.businessHours[dow];
  return !!(h && h.active);
}
function serviceDuration(){
  const s = document.querySelector('input[name="servicio"]:checked');
  const name = s ? s.value : 'Baño';
  return { name, minutes: AVAIL.serviceDurations?.[name] || 60 };
}
function generateSlotsFor(dateStr){
  const date = new Date(dateStr + 'T00:00:00');
  const dow = date.getDay();
  const h = AVAIL.businessHours[dow];
  if (!h || !h.active) return [];
  const { minutes: dur } = serviceDuration();
  const open = hhmmToMin(h.open), close = hhmmToMin(h.close);
  const step = Math.max(5, h.slot || 30);

  const lastStart = close - dur;
  const all = [];
  for (let t = open; t <= lastStart; t += step) all.push(minToHHMM(t));

  const dayBooked = AVAIL.booked?.[dateStr] || [];
  return all.filter(start => !dayBooked.some(b => overlaps(start, dur, b.time, b.duration || dur)));
}
function populateHours(dateStr){
  const sel = document.getElementById('horaSelect');
  if (!sel) return;
  sel.innerHTML = `<option value="">Cargando...</option>`;
  if (isBlackout(dateStr) || !isActiveDay(new Date(dateStr+'T00:00:00'))) {
    sel.innerHTML = `<option value="">Sin horarios disponibles</option>`;
    return;
  }
  const slots = generateSlotsFor(dateStr);
  if (!slots.length){
    sel.innerHTML = `<option value="">Sin horarios disponibles</option>`;
    return;
  }
  sel.innerHTML = `<option value="">Elegí un horario</option>` + slots.map(h => `<option value="${h}">${h}</option>`).join('');
}
async function initDatepicker(){
  await loadAvailability();
  const fechaInput = document.getElementById('fechaInput');
  if (!fechaInput || !window.flatpickr) return;

  flatpickr(fechaInput, {
    dateFormat: 'Y-m-d',
    minDate: 'today',
    disable: [
      function(date){
        const dstr = ymd(date);
        return isBlackout(dstr) || !isActiveDay(date);
      }
    ],
    onChange: (_sel, dateStr) => { if (dateStr) populateHours(dateStr); }
  });

  // Recalcular slots al cambiar de servicio
  document.querySelectorAll('input[name="servicio"]').forEach(r => {
    r.addEventListener('change', () => {
      if (fechaInput.value) populateHours(fechaInput.value);
    });
  });
}
initDatepicker();

// ============== Form -> WhatsApp con honeypot ==============
(function () {
  const form = document.getElementById('turnoForm');
  if (!form) return;

  const BUSINESS_PHONE = '5491139579118'; // editá si cambia
  const PREFIX = 'Hola! Quiero reservar un turno para mi perrito \n\n';

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Honeypot
    const hp = document.getElementById('hp_website');
    if (hp && hp.value.trim() !== '') {
      console.warn('Honeypot activado (spam)');
      form.reset();
      return;
    }

    // Validación + servicio
    const servicioSeleccionado = form.querySelector('input[name="servicio"]:checked');
    const servicioError = document.getElementById('servicioError');
    if (!form.checkValidity() || !servicioSeleccionado) {
      if (!servicioSeleccionado && servicioError) servicioError.style.display = 'block';
      form.classList.add('was-validated');
      return;
    }
    if (servicioError) servicioError.style.display = 'none';

    const data = {
      nombre: (form.nombre?.value || '').trim(),
      telefono: (form.telefono?.value || '').trim(),
      perro: (form.perro?.value || '').trim(),
      tamano: (form.tamano?.value || '').trim(),
      servicio: servicioSeleccionado.value,
      fecha: (form.fecha?.value || document.getElementById('fechaInput')?.value || '').trim(),
      hora: (document.getElementById('horaSelect')?.value || '').trim(),
      comentarios: (form.comentarios?.value || '').trim()
    };

    const msg = PREFIX + [
      `Nombre y apellido: ${data.nombre}`,
      `Telefono: ${data.telefono}`,
      `Nombre Perrito: ${data.perro}`,
      `Tamaño: ${data.tamano}`,
      `Servicio: ${data.servicio}`,
      `Fecha Preferida: ${data.fecha}`,
      `Horario Preferido: ${data.hora}`,
      `Comentarios: ${data.comentarios || '-'}`
    ].join('\n');

    if (typeof spawnPaws === 'function') spawnPaws(16);

    const url = `https://wa.me/${BUSINESS_PHONE}?text=${encodeURIComponent(msg)}`;
    const alerta = document.getElementById('alerta');
    if (alerta) alerta.classList.remove('d-none');
    setTimeout(() => { window.location.href = url; }, 150);
  });
})();