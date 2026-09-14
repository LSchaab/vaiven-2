// lightbox.js — lightbox de YouTube reutilizable (SPEC §5.1).
// Parte pura arriba (testeable en Node); el DOM vive dentro de crearLightbox
// (no se toca document al importar el módulo).

export function youtubeEmbedUrl(id, { autoplay = true } = {}) {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

// Crea UNA vez el <dialog> y lo reutiliza. El <iframe> se inyecta al abrir
// (no carga YouTube en el load de la home) y se destruye al cerrar (frena el video).
export function crearLightbox({ videoId }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'lightbox';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Demoreel de VAIVÉN');
  dialog.innerHTML = `
    <div class="lightbox__inner">
      <button class="lightbox__close" aria-label="Cerrar">✕</button>
      <div class="lightbox__frame"></div>
    </div>`;
  document.body.appendChild(dialog);

  const frame = dialog.querySelector('.lightbox__frame');
  const closeBtn = dialog.querySelector('.lightbox__close');
  let lastFocus = null;

  function open(triggerEl) {
    lastFocus = triggerEl || null;
    const iframe = document.createElement('iframe');
    iframe.src = youtubeEmbedUrl(videoId);
    iframe.title = 'Demoreel de VAIVÉN';
    iframe.allow = 'autoplay; fullscreen; encrypted-media';
    iframe.setAttribute('allowfullscreen', '');
    frame.appendChild(iframe);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', ''); // fallback si no hay <dialog> nativo
    closeBtn.focus();
  }

  function close() {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
    frame.replaceChildren(); // destruye el iframe → frena el video
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
  }

  closeBtn.addEventListener('click', close);
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); }); // Esc
  dialog.addEventListener('click', (e) => { if (e.target === dialog) close(); }); // backdrop

  return { open, close, el: dialog };
}
