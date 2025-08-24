// AOS y utilidades comunes
(function () {
  if (window.AOS) AOS.init({ once: true, duration: 700, easing: 'ease-out-cubic' });
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  // Carrusel auto (opcional)
  const carrusel = document.getElementById('carruselPerros');
  if (carrusel) {
    const carousel = new bootstrap.Carousel(carrusel, { interval: 3500, ride: 'carousel', pause: "hover" });
  }
})();

// ---------- Animación de huellitas ----------
function spawnPaws(count = 14) {
  const overlay = document.getElementById('pawOverlay');
  if (!overlay) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'paw';
    const startX = Math.random() * window.innerWidth;
    const startY = window.innerHeight + Math.random() * 120;
    const dx = (Math.random() * 200 - 100);    // leve zigzag horizontal
    const dy = -(window.innerHeight + 200);    // sube hacia arriba
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

// Pequeña caminata cada tanto en todas las páginas
setInterval(() => spawnPaws(4), 6000);

// ---------- Formulario de turnos ----------
(function () {
  const form = document.getElementById('turnoForm');
  if (!form) return;

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Validación Bootstrap + chequeo de servicio
    const servicioSeleccionado = form.querySelector('input[name="servicio"]:checked');
    const servicioError = document.getElementById('servicioError');

    if (!form.checkValidity() || !servicioSeleccionado) {
      if (!servicioSeleccionado && servicioError) servicioError.style.display = 'block';
      form.classList.add('was-validated');
      return;
    }
    if (servicioError) servicioError.style.display = 'none';

    // “Envía” (simulación) + animación de huellas
    const btn = document.getElementById('btnEnviar');
    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2" role="status"></span> Enviando...`;

    spawnPaws(20);

    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = `<span class="me-1">Enviar solicitud</span><i class="bi bi-send"></i>`;
      const alerta = document.getElementById('alerta');
      alerta.classList.remove('d-none');
      // Scroll a la alerta en mobile
      alerta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      form.reset();
      form.classList.remove('was-validated');
    }, 1300);
  });
})();