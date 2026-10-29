/* ============================================================
   UI layer — presentation only.
   Name/branding, before/after slider, sample files, engine status,
   live announcements and result-state hierarchy.
   It never touches the tracing logic in app.js: it talks to it only
   through the DOM (the file input and the elements app.js shows/hides).
   ============================================================ */

(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ── Product name: single source of truth is <meta name="application-name"> ──
  const appName = (document.querySelector('meta[name="application-name"]') || {}).content || 'Tracewell';
  document.querySelectorAll('[data-app-name]').forEach((el) => { el.textContent = appName; });
  document.title = appName + ' — PNG to SVG, in your browser';

  // ── Live region for screen readers ──
  const live = $('liveStatus');
  function announce(msg) {
    if (!live) return;
    live.textContent = '';
    // a fresh text node makes repeated identical messages announce again
    setTimeout(() => { live.textContent = msg; }, 30);
  }

  // ── Before / after comparison ──
  const range = $('compareRange');
  const stage = document.querySelector('.compare-stage');
  if (range && stage) {
    const setPos = () => stage.style.setProperty('--pos', range.value + '%');
    range.addEventListener('input', setPos);
    setPos();
  }

  // ── Sample files (empty state) ──
  const fileInput  = $('fileInput');
  const samplesBox = $('samples');
  const samplesList = samplesBox && samplesBox.querySelector('.samples-list');
  const samples = window.SAMPLE_FILES || [];

  function showUiError(msg) {
    const banner = $('errorBanner');
    const text = $('errorText');
    if (!banner || !text) return;
    text.textContent = msg;
    banner.hidden = false;
  }

  async function loadSample(sample, btn) {
    try {
      btn.setAttribute('aria-busy', 'true');
      const blob = await (await fetch(sample.data)).blob();
      const file = new File([blob], sample.file, { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    } catch (err) {
      showUiError('This browser could not load the sample. Download it from the examples/ folder and drop it here instead.');
    } finally {
      btn.removeAttribute('aria-busy');
    }
  }

  if (samplesList && samples.length) {
    samples.forEach((sample) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sample-btn';
      btn.innerHTML =
        '<span class="sample-thumb"><img alt="" width="48" height="48"></span>' +
        '<span class="sample-text"><span class="sample-label"></span><span class="sample-hint"></span></span>';
      btn.querySelector('img').src = sample.src;
      btn.querySelector('.sample-label').textContent = sample.label;
      btn.querySelector('.sample-hint').textContent = sample.hint;
      btn.setAttribute('aria-label', 'Load sample: ' + sample.label + ' (' + sample.hint + ')');
      btn.addEventListener('click', () => loadSample(sample, btn));
      samplesList.appendChild(btn);
    });
  } else if (samplesBox) {
    samplesBox.hidden = true;
  }

  // ── Tracing engine status ──
  const engineStatus = $('engineStatus');
  const engineText = engineStatus && engineStatus.querySelector('.engine-text');
  const btnConvert = $('btnConvert');
  const btnLabel = btnConvert && btnConvert.querySelector('.btn-label');
  let engineReady = false;

  function setEngine(state, text) {
    if (!engineStatus) return;
    engineStatus.dataset.state = state;
    engineText.textContent = text;
    const old = engineStatus.querySelector('.engine-retry');
    if (old) old.remove();
    if (state === 'error') {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'engine-retry';
      retry.textContent = 'Retry';
      // A failed ES-module import is cached by the browser for the page's lifetime,
      // so the only reliable retry is a reload.
      retry.addEventListener('click', () => { window.location.reload(); });
      engineStatus.appendChild(retry);
    }
  }

  document.addEventListener('potraceReady', () => {
    engineReady = true;
    setEngine('ready', 'Engine ready · runs on this device');
  });
  document.addEventListener('potraceError', () => {
    setEngine('error', 'Could not load the tracing engine. Check your connection.');
    if (btnLabel) btnLabel.textContent = 'Tracing engine unavailable';
    announce('The tracing engine could not be loaded.');
  });

  // ── React to what app.js shows / hides ──
  const uploadZone = $('uploadZone');
  const uploadPreview = $('uploadPreview');
  const previewSection = $('previewSection');
  const btnSpinner = btnConvert && btnConvert.querySelector('.btn-spinner');
  const resultMeta = $('resultMeta');
  const uploadFilename = $('uploadFilename');
  const uploadDims = $('uploadDims');
  const main = $('convert');

  function syncFileState() {
    const hasFile = !uploadPreview.hidden;
    uploadZone.classList.toggle('has-file', hasFile);
    uploadZone.setAttribute('aria-label', hasFile
      ? 'Replace the PNG file: ' + uploadFilename.textContent
      : 'Choose a PNG file, or drop one here');
    if (samplesBox && samples.length) samplesBox.hidden = hasFile;
    if (hasFile) announce('Loaded ' + uploadFilename.textContent + ', ' + uploadDims.textContent + '. Choose a mode, then convert.');
  }

  function syncResultState() {
    const hasResult = !previewSection.hidden;
    btnConvert.classList.toggle('is-secondary', hasResult);
    if (engineReady && btnLabel) {
      btnLabel.textContent = hasResult ? 'Re-trace with these settings' : 'Convert to SVG';
    }
  }

  function syncBusyState() {
    const busy = btnSpinner && !btnSpinner.hidden;
    main.setAttribute('aria-busy', String(!!busy));
    if (busy) announce('Tracing…');
  }

  const watch = (el, fn) => {
    if (!el) return;
    new MutationObserver(fn).observe(el, { attributes: true, attributeFilter: ['hidden'] });
  };
  watch(uploadPreview, syncFileState);
  watch(previewSection, syncResultState);
  watch(btnSpinner, syncBusyState);

  if (resultMeta) {
    new MutationObserver(() => {
      if (!previewSection.hidden && resultMeta.textContent) {
        announce('SVG ready, ' + resultMeta.textContent + '. Download it or inspect the code.');
      }
    }).observe(resultMeta, { childList: true, characterData: true, subtree: true });
  }

  // Small screens: start the inspector's tool panel collapsed so the code and preview are visible
  const toolsPanel = $('toolsPanel');
  if (toolsPanel && window.matchMedia('(max-width: 760px)').matches) {
    toolsPanel.classList.add('collapsed');
  }

  // Drag-and-drop anywhere on the tool area, not just on the dashed box
  if (main && uploadZone) {
    ['dragenter', 'dragover'].forEach((type) => {
      main.addEventListener(type, (e) => {
        if (uploadZone.contains(e.target)) return;
        if (e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files')) {
          e.preventDefault();
          uploadZone.classList.add('drag-over');
        }
      });
    });
    main.addEventListener('dragleave', (e) => {
      if (!main.contains(e.relatedTarget)) uploadZone.classList.remove('drag-over');
    });
    main.addEventListener('drop', (e) => {
      if (uploadZone.contains(e.target)) return;
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      const dt = new DataTransfer();
      dt.items.add(file);
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
})();
