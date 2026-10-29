/* ============================================================
   PNG → SVG Converter — App Logic
   ============================================================ */

(function () {
  'use strict';

  // ── DOM References ──────────────────────────────────────────
  const themeToggle     = document.getElementById('themeToggle');
  const uploadZone      = document.getElementById('uploadZone');
  const fileInput       = document.getElementById('fileInput');
  const uploadIdle      = document.getElementById('uploadIdle');
  const uploadPreview   = document.getElementById('uploadPreview');
  const previewThumb    = document.getElementById('previewThumb');
  const uploadFilename  = document.getElementById('uploadFilename');
  const uploadDims      = document.getElementById('uploadDims');
  const btnReset        = document.getElementById('btnReset');
  const errorBanner     = document.getElementById('errorBanner');
  const errorText       = document.getElementById('errorText');
  const controlsSection = document.getElementById('controlsSection');
  const btnConvert      = document.getElementById('btnConvert');
  const btnLabel        = btnConvert.querySelector('.btn-label');
  const btnSpinner      = btnConvert.querySelector('.btn-spinner');
  const btnColor        = document.getElementById('btnColor');
  const btnBW           = document.getElementById('btnBW');
  const detailSlider    = document.getElementById('detailSlider');
  const smoothSlider    = document.getElementById('smoothSlider');
  const detailValue     = document.getElementById('detailValue');
  const smoothValue     = document.getElementById('smoothValue');
  const warningBanner   = document.getElementById('warningBanner');
  const previewSection  = document.getElementById('previewSection');
  const origImg         = document.getElementById('origImg');
  const origMeta        = document.getElementById('origMeta');
  const svgContainer    = document.getElementById('svgContainer');
  const resultMeta      = document.getElementById('resultMeta');
  const btnDownload     = document.getElementById('btnDownload');
  const btnCopy         = document.getElementById('btnCopy');
  const copyLabel       = document.getElementById('copyLabel');
  const btnConvertAnother = document.getElementById('btnConvertAnother');
  const btnOptimize       = document.getElementById('btnOptimize');
  const optimizeResult    = document.getElementById('optimizeResult');
  const optimizeResultText = document.getElementById('optimizeResultText');
  const presetLogo        = document.getElementById('presetLogo');
  const presetIllustration = document.getElementById('presetIllustration');
  const presetSketch      = document.getElementById('presetSketch');
  const advancedToggle    = document.getElementById('advancedToggle');
  const advancedPanel     = document.getElementById('advancedPanel');
  const btnOpenViewer     = document.getElementById('btnOpenViewer');
  const viewerOverlay     = document.getElementById('viewerOverlay');
  const viewerCanvas      = document.getElementById('viewerCanvas');
  const viewerSvgWrap     = document.getElementById('viewerSvgWrap');
  const viewerStats       = document.getElementById('viewerStats');
  const viewerZoomLabel   = document.getElementById('viewerZoomLabel');
  const viewerZoomIn      = document.getElementById('viewerZoomIn');
  const viewerZoomOut     = document.getElementById('viewerZoomOut');
  const viewerZoomFit     = document.getElementById('viewerZoomFit');
  const viewerClose       = document.getElementById('viewerClose');
  const viewerBgBtns      = document.querySelectorAll('.viewer-bg-btn');
  const tabPreview        = document.getElementById('tabPreview');
  const tabCode           = document.getElementById('tabCode');
  const viewerCodePanel   = document.getElementById('viewerCodePanel');
  const svgEditor         = document.getElementById('svgEditor');
  const codePreview       = document.getElementById('codePreview');
  const viewerFooter      = document.getElementById('viewerFooter');
  const snippetSelect     = document.getElementById('snippetSelect');
  const snippetsParam     = document.getElementById('snippetsParam');
  const snippetsParamLabel = document.getElementById('snippetsParamLabel');
  const snippetParam      = document.getElementById('snippetParam');
  const snipApply         = document.getElementById('snipApply');
  const snipReset         = document.getElementById('snipReset');
  const snipDownload      = document.getElementById('snipDownload');
  const snipApplyColor    = document.getElementById('snipApplyColor');
  const snipApplyColorAll = document.getElementById('snipApplyColorAll');
  const pngSamplerCanvas  = document.getElementById('pngSamplerCanvas');
  const sampledSwatch     = document.getElementById('sampledSwatch');
  const sampledHexInput   = document.getElementById('sampledHex');
  const codePreviewInner  = document.getElementById('codePreviewInner');
  const codeZoomIn        = document.getElementById('codeZoomIn');
  const codeZoomOut       = document.getElementById('codeZoomOut');
  const codeZoomFit       = document.getElementById('codeZoomFit');
  const codeZoomLabel     = document.getElementById('codeZoomLabel');

  // ── State ───────────────────────────────────────────────────
  let currentFile    = null;
  let currentSvg     = null;
  let editedSvg      = null; // SVG modificato nel code editor
  let viewerMode     = 'preview'; // 'preview' | 'code'
  let colorMode      = 'color'; // 'color' | 'bw'
  let activePreset   = 'illustration'; // 'logo' | 'illustration' | 'sketch'
  let wasmReady      = false; // true when loadFromCanvas is available

  // ── Preset definitions ───────────────────────────────────────
  // detail → luminance threshold sensitivity (high = lower threshold = more detail)
  // smooth → pre-blur radius in px (high = more blur = smoother curves)
  const PRESETS = {
    logo: {
      detail:  8,
      smooth:  1,
      colors:  'color',
    },
    illustration: {
      detail:  5,
      smooth:  3,
      colors:  'color',
    },
    sketch: {
      detail:  3,
      smooth:  7,
      colors:  'color',
    },
  };

  // ── Theme ───────────────────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  themeToggle.addEventListener('click', toggleTheme);

  // ── File Handling ────────────────────────────────────────────
  function handleFile(file) {
    hideError();

    if (!file) return;

    if (file.type !== 'image/png') {
      showError('“' + file.name + '” is not a PNG. Export or save the image as .png and try again.');
      return;
    }

    currentFile = file;

    const url = URL.createObjectURL(file);
    const img  = new Image();

    img.onload = function () {
      // Show large image warning
      if (img.naturalWidth > 3000 || img.naturalHeight > 3000) {
        warningBanner.hidden = false;
      } else {
        warningBanner.hidden = true;
      }

      // Populate upload preview
      previewThumb.src     = url;
      uploadFilename.textContent = file.name;
      uploadDims.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;

      uploadIdle.hidden    = true;
      uploadPreview.hidden = false;

      // Store original image on orig panel
      origImg.src  = url;
      origMeta.textContent = `${img.naturalWidth} × ${img.naturalHeight} px`;

      controlsSection.hidden = false;

      // Reset any previous result
      previewSection.hidden = true;
      currentSvg = null;
    };

    // UI: a file named .png that the browser cannot decode (corrupt or mislabelled)
    img.onerror = function () {
      URL.revokeObjectURL(url);
      currentFile = null;
      fileInput.value = '';
      showError('“' + file.name + '” could not be read as an image. It may be damaged or not a real PNG — try re-exporting it.');
    };

    img.src = url;
  }

  // Click on upload zone (excluding reset button)
  uploadZone.addEventListener('click', function (e) {
    if (e.target === btnReset || btnReset.contains(e.target)) return;
    fileInput.click();
  });

  // Keyboard activation
  uploadZone.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files[0]) {
      handleFile(fileInput.files[0]);
    }
  });

  // Drag & Drop
  uploadZone.addEventListener('dragenter', function (e) {
    e.preventDefault();
    uploadZone.classList.add('drag-over');
  });

  uploadZone.addEventListener('dragover', function (e) {
    e.preventDefault();
  });

  uploadZone.addEventListener('dragleave', function (e) {
    // Only remove if leaving the zone entirely
    if (!uploadZone.contains(e.relatedTarget)) {
      uploadZone.classList.remove('drag-over');
    }
  });

  uploadZone.addEventListener('drop', function (e) {
    e.preventDefault();
    uploadZone.classList.remove('drag-over');

    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // Reset
  btnReset.addEventListener('click', function (e) {
    e.stopPropagation();
    resetAll();
  });

  btnConvertAnother.addEventListener('click', resetAll);

  function resetAll() {
    currentFile = null;
    currentSvg  = null;

    fileInput.value       = '';
    uploadIdle.hidden     = false;
    uploadPreview.hidden  = true;
    previewThumb.src      = '';
    controlsSection.hidden = true;
    previewSection.hidden  = true;
    warningBanner.hidden   = true;
    optimizeResult.hidden  = true;
    btnOptimize.disabled   = false;
    btnOptimize.style.opacity = '';
    hideError();
    setConvertIdle();
  }

  // ── Presets ──────────────────────────────────────────────────
  function applyPreset(name) {
    activePreset = name;
    const p = PRESETS[name];

    detailSlider.value      = p.detail;
    smoothSlider.value      = p.smooth;
    detailValue.textContent = p.detail;
    smoothValue.textContent = p.smooth;

    // Update color mode
    if (p.colors === 'color') {
      colorMode = 'color';
      btnColor.classList.add('active');
      btnColor.setAttribute('aria-pressed', 'true');
      btnBW.classList.remove('active');
      btnBW.setAttribute('aria-pressed', 'false');
    } else {
      colorMode = 'bw';
      btnBW.classList.add('active');
      btnBW.setAttribute('aria-pressed', 'true');
      btnColor.classList.remove('active');
      btnColor.setAttribute('aria-pressed', 'false');
    }

    // Update preset buttons
    [presetLogo, presetIllustration, presetSketch].forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    const activeBtn = { logo: presetLogo, illustration: presetIllustration, sketch: presetSketch }[name];
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-pressed', 'true');
  }

  presetLogo.addEventListener('click', () => applyPreset('logo'));
  presetIllustration.addEventListener('click', () => applyPreset('illustration'));
  presetSketch.addEventListener('click', () => applyPreset('sketch'));

  // ── Advanced Toggle ──────────────────────────────────────────
  advancedToggle.addEventListener('click', function () {
    const isOpen = advancedPanel.hidden === false;
    advancedPanel.hidden = isOpen;
    advancedToggle.setAttribute('aria-expanded', String(!isOpen));
  });

  // Deselect preset when sliders are moved manually
  function onManualAdjust() {
    activePreset = null;
    [presetLogo, presetIllustration, presetSketch].forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
  }

  detailSlider.addEventListener('input', function () {
    detailValue.textContent = detailSlider.value;
    onManualAdjust();
  });

  smoothSlider.addEventListener('input', function () {
    smoothValue.textContent = smoothSlider.value;
    onManualAdjust();
  });

  // ── Color Mode Toggle ────────────────────────────────────────
  btnColor.addEventListener('click', function () {
    colorMode = 'color';
    btnColor.classList.add('active');
    btnColor.setAttribute('aria-pressed', 'true');
    btnBW.classList.remove('active');
    btnBW.setAttribute('aria-pressed', 'false');
  });

  btnBW.addEventListener('click', function () {
    colorMode = 'bw';
    btnBW.classList.add('active');
    btnBW.setAttribute('aria-pressed', 'true');
    btnColor.classList.remove('active');
    btnColor.setAttribute('aria-pressed', 'false');
  });

  // ── Split potrace compound path into separate selectable paths ─
  // Potrace encodes all shapes in one <path d="M...Z M...Z M...Z">.
  // This function splits them into individual <path> elements so each
  // visual shape (circle ring, checkmark, letter, etc.) is independently
  // clickable and recolorable in the SVG viewer.
  //
  // Algorithm:
  //   1. Split the compound d attribute into sub-paths (each M...Z segment).
  //   2. For each sub-path, compute bounding box + signed area (winding direction).
  //   3. Sort by area descending (largest = outermost shapes first).
  //   4. Group: each outer sub-path claims interior sub-paths with OPPOSITE winding
  //      as its "holes" (evenodd fill-rule). Sub-paths with SAME winding inside
  //      an outer shape are separate independent elements.
  //   5. Replace the original compound <path> with one <path> per group.
  function splitCompoundPath(svgStr) {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(svgStr, 'image/svg+xml');

    doc.querySelectorAll('path').forEach(pathEl => {
      const d    = pathEl.getAttribute('d') || '';
      const fill = pathEl.getAttribute('fill') || '#000000';

      const subStrs = d.split(/(?=[Mm])/).map(s => s.trim()).filter(Boolean);
      if (subStrs.length <= 1) return;

      // Analyse each sub-path: bbox + signed area (shoelace on sampled points)
      const subs = subStrs.map(sp => {
        // Extract only real endpoints — not Bezier control points.
        // Potrace outputs M x y and C x1 y1 x2 y2 x y only.
        // For C: first 4 numbers are control points, last 2 are the endpoint.
        const xs = [], ys = [];
        const tokRe = /([MCZmcz])|(-?[\d.]+(?:e[-+]?\d+)?)/gi;
        let cmd = '', buf = [];
        const flush = () => {
          if (cmd === 'M' || cmd === 'm') {
            for (let i = 0; i + 1 < buf.length; i += 2) {
              xs.push(buf[i]); ys.push(buf[i + 1]);
            }
          } else if (cmd === 'C' || cmd === 'c') {
            for (let i = 4; i + 1 < buf.length; i += 6) {
              xs.push(buf[i]); ys.push(buf[i + 1]);
            }
          }
          buf = [];
        };
        let tok;
        while ((tok = tokRe.exec(sp)) !== null) {
          if (tok[1]) { flush(); cmd = tok[1].toUpperCase(); }
          else if (tok[2]) buf.push(Number(tok[2]));
        }
        flush();
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let i = 0; i < xs.length; i++) {
          if (xs[i] < minX) minX = xs[i];
          if (xs[i] > maxX) maxX = xs[i];
          if (ys[i] < minY) minY = ys[i];
          if (ys[i] > maxY) maxY = ys[i];
        }
        let signedArea = 0;
        for (let i = 0; i < xs.length; i++) {
          const j = (i + 1) % xs.length;
          signedArea += xs[i] * ys[j] - xs[j] * ys[i];
        }
        return {
          d: sp,
          minX, maxX, minY, maxY,
          cx: (minX + maxX) / 2,
          cy: (minY + maxY) / 2,
          area: Math.abs(signedArea / 2),
          sign: Math.sign(signedArea)
        };
      });

      // For each sub-path, find its "potential parent":
      // the SMALLEST sub-path that is larger, has opposite winding,
      // and whose bbox contains this sub-path's center.
      // This ensures the A's inner hole is claimed by the A (small bbox),
      // not by the circle (large bbox).
      const potParent = subs.map((sub, i) => {
        let bestIdx = -1, bestArea = Infinity;
        for (let j = 0; j < subs.length; j++) {
          if (j === i) continue;
          const p = subs[j];
          if (p.area <= sub.area) continue;       // parent must be larger
          if (p.sign === sub.sign) continue;       // parent must have opposite winding
          const inBbox = sub.cx >= p.minX && sub.cx <= p.maxX &&
                         sub.cy >= p.minY && sub.cy <= p.maxY;
          if (!inBbox) continue;
          if (p.area < bestArea) { bestArea = p.area; bestIdx = j; }
        }
        return bestIdx;
      });

      // A sub-path is TOP-LEVEL (its own group root) when:
      //   - it has no potential parent, OR
      //   - its potential parent is itself inside a hole
      //     (potential parent's own parent exists → we're floating inside a hole area).
      // Example: checkmark inside the ring's hole → potential parent = inner circle boundary,
      // but inner circle boundary also has a parent (outer circle) → checkmark is top-level.
      const isTopLevel = subs.map((_, i) => {
        const pp = potParent[i];
        if (pp === -1) return true;
        return potParent[pp] !== -1; // parent is itself a hole → we're an inner shape
      });

      // Build groups: each top-level shape claims its direct holes
      const assigned = new Set();
      const groups   = [];

      subs.forEach((sub, i) => {
        if (!isTopLevel[i]) return;
        const group = [sub.d];
        assigned.add(i);
        subs.forEach((other, j) => {
          if (potParent[j] === i && !isTopLevel[j]) {
            group.push(other.d);
            assigned.add(j);
          }
        });
        groups.push(group);
      });

      // Any unassigned (edge cases) → standalone
      subs.forEach((sub, i) => {
        if (!assigned.has(i)) groups.push([sub.d]);
      });

      if (groups.length <= 1) return;

      const parent = pathEl.parentNode;
      groups.forEach(group => {
        const el = doc.createElementNS('http://www.w3.org/2000/svg', 'path');
        el.setAttribute('d', group.join(' '));
        el.setAttribute('fill', fill);
        el.setAttribute('fill-rule', 'evenodd');
        parent.insertBefore(el, pathEl);
      });
      parent.removeChild(pathEl);
    });

    return new XMLSerializer().serializeToString(doc);
  }

  // ── Otsu's threshold (maximizes inter-class variance) ────────
  // Finds the optimal luminance split between foreground and background.
  function computeOtsu(hist, totalPx) {
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, max = 0, threshold = 127;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = totalPx - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const between = wB * wF * (mB - mF) * (mB - mF);
      if (between > max) { max = between; threshold = t; }
    }
    return threshold;
  }

  // ── Build preprocessed canvas ────────────────────────────────
  // Returns a canvas with blur + B&W preprocessing applied, ready for potrace.
  function buildCanvas(imgEl, forceBW) {
    const canvas  = document.createElement('canvas');
    canvas.width  = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    const ctx = canvas.getContext('2d');

    // Pre-blur via canvas filter (native, fast, no extra library)
    const blurRadius = (parseInt(smoothSlider.value, 10) - 1) * 4 / 9;
    if (blurRadius > 0.01) ctx.filter = `blur(${blurRadius.toFixed(2)}px)`;
    ctx.drawImage(imgEl, 0, 0);
    ctx.filter = 'none';

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Detect transparent background: count pixels with alpha < 200
    const totalPx = data.length / 4;
    let transparentCount = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 200) transparentCount++;
    }
    const hasTransparentBg = transparentCount / totalPx > 0.05; // >5% transparent

    if (forceBW || colorMode === 'bw') {
      const detail = parseInt(detailSlider.value, 10);
      if (hasTransparentBg) {
        // Pure alpha-mask for transparent-background logos:
        //   - Transparent pixels (alpha < alphaCutoff) → white (background)
        //   - All opaque pixels → black, regardless of luminance or color
        //     (navy, gold, green, white on transparent — all become foreground)
        //
        // This preserves every non-transparent shape as a clean black region.
        // Separate shapes divided by transparent gaps → separate potrace paths,
        // independently selectable and recolorable in the SVG viewer.
        //
        // Detail slider controls alpha cutoff:
        //   detail=1  → alphaCutoff=200 (only fully opaque pixels count)
        //   detail=5  → alphaCutoff=116 (default; semi-transparent edges included)
        //   detail=10 → alphaCutoff=10  (include almost-transparent pixels)
        const alphaCutoff = Math.round(200 - (detail - 1) * 21);

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < alphaCutoff) {
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
          } else {
            data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
          }
        }
      } else {
        // Solid-background mode: Otsu's adaptive threshold.
        const hist = new Uint32Array(256);
        for (let i = 0; i < data.length; i += 4) {
          const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          hist[lum]++;
        }
        const otsu = computeOtsu(hist, totalPx);
        const offset = (5 - detail) * 9;
        const threshold = Math.max(0, Math.min(255, otsu + offset));
        for (let i = 0; i < data.length; i += 4) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const val = lum > threshold ? 255 : 0;
          data[i] = val; data[i + 1] = val; data[i + 2] = val;
        }
      }
    } else {
      // Color mode: snap alpha to 0/255 only
      if (hasTransparentBg) {
        for (let i = 3; i < data.length; i += 4) {
          data[i] = data[i] > 127 ? 255 : 0;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // ── Build binary mask canvas using Voronoi assignment ────────
  // Every pixel is assigned to its nearest palette entry.
  // Pixels assigned to targetIdx → black (potrace traces them).
  // Others → white (background).
  function buildColorMaskCanvas(imageData, palette, targetIdx) {
    const w      = imageData.width;
    const h      = imageData.height;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx  = canvas.getContext('2d');
    const mask = ctx.createImageData(w, h);
    const src  = imageData.data;
    const dst  = mask.data;

    for (let i = 0; i < src.length; i += 4) {
      if (src[i + 3] < 128) {
        // Transparent pixel → white (background)
        dst[i] = 255; dst[i + 1] = 255; dst[i + 2] = 255; dst[i + 3] = 255;
        continue;
      }
      // Find nearest palette color
      let nearest = 0;
      let minDist = Infinity;
      for (let j = 0; j < palette.length; j++) {
        const dr = src[i] - palette[j][0];
        const dg = src[i + 1] - palette[j][1];
        const db = src[i + 2] - palette[j][2];
        const d  = dr * dr + dg * dg + db * db;
        if (d < minDist) { minDist = d; nearest = j; }
      }
      const v = nearest === targetIdx ? 0 : 255;
      dst[i] = v; dst[i + 1] = v; dst[i + 2] = v; dst[i + 3] = 255;
    }
    ctx.putImageData(mask, 0, 0);
    return canvas;
  }

  // ── Apply blur to an existing canvas, return new canvas ──────
  function applyBlurToCanvas(srcCanvas, radius) {
    const dst = document.createElement('canvas');
    dst.width  = srcCanvas.width;
    dst.height = srcCanvas.height;
    const ctx  = dst.getContext('2d');
    ctx.filter = `blur(${radius.toFixed(2)}px)`;
    ctx.drawImage(srcCanvas, 0, 0);
    ctx.filter = 'none';
    return dst;
  }

  // ── Merge perceptually similar colors in a palette ───────────
  // Repeatedly merges the closest pair of colors until no pair
  // is within `threshold` RGB Euclidean distance of each other.
  function mergeSimilarColors(palette, threshold) {
    const pal = palette.map(c => [...c]);
    let changed = true;
    while (changed) {
      changed = false;
      let bestDist = Infinity, bestI = -1, bestJ = -1;
      for (let i = 0; i < pal.length; i++) {
        for (let j = i + 1; j < pal.length; j++) {
          const dr = pal[i][0] - pal[j][0];
          const dg = pal[i][1] - pal[j][1];
          const db = pal[i][2] - pal[j][2];
          const d  = Math.sqrt(dr * dr + dg * dg + db * db);
          if (d < bestDist) { bestDist = d; bestI = i; bestJ = j; }
        }
      }
      if (bestDist < threshold) {
        pal[bestI] = [
          Math.round((pal[bestI][0] + pal[bestJ][0]) / 2),
          Math.round((pal[bestI][1] + pal[bestJ][1]) / 2),
          Math.round((pal[bestI][2] + pal[bestJ][2]) / 2),
        ];
        pal.splice(bestJ, 1);
        changed = true;
      }
    }
    return pal;
  }

  // ── Color quantization (Median Cut) ──────────────────────────
  function medianCut(imageData, numColors) {
    const data = imageData.data;
    const pixels = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue; // skip transparent
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (!pixels.length) return [[0, 0, 0]];

    function splitBucket(bucket) {
      // Use explicit loops instead of spread to avoid stack overflow on large arrays
      const ranges = [0, 1, 2].map(ch => {
        let min = 255, max = 0;
        for (let i = 0; i < bucket.length; i++) {
          const v = bucket[i][ch];
          if (v < min) min = v;
          if (v > max) max = v;
        }
        return max - min;
      });
      let maxRange = 0;
      const ch = ranges.reduce((best, r, i) => (r > maxRange ? (maxRange = r, i) : best), 0);
      bucket.sort((a, b) => a[ch] - b[ch]);
      const mid = Math.floor(bucket.length / 2);
      return [bucket.slice(0, mid), bucket.slice(mid)];
    }

    function avgColor(bucket) {
      const n = bucket.length;
      return [
        Math.round(bucket.reduce((s, p) => s + p[0], 0) / n),
        Math.round(bucket.reduce((s, p) => s + p[1], 0) / n),
        Math.round(bucket.reduce((s, p) => s + p[2], 0) / n),
      ];
    }

    let buckets = [pixels];
    while (buckets.length < numColors) {
      // Split the largest bucket
      let largest = 0;
      for (let i = 1; i < buckets.length; i++) {
        if (buckets[i].length > buckets[largest].length) largest = i;
      }
      if (buckets[largest].length < 2) break;
      const [a, b] = splitBucket(buckets.splice(largest, 1)[0]);
      buckets.push(a, b);
    }

    return buckets.filter(b => b.length > 0).map(avgColor);
  }

  // ── Build binary mask for one color ──────────────────────────
  function buildColorMask(imageData, color, tolerance) {
    const src  = imageData.data;
    const w    = imageData.width;
    const h    = imageData.height;
    const mask = new ImageData(w, h);
    const dst  = mask.data;
    const [cr, cg, cb] = color;

    for (let i = 0; i < src.length; i += 4) {
      const dr = src[i] - cr;
      const dg = src[i + 1] - cg;
      const db = src[i + 2] - cb;
      const dist = Math.sqrt(dr * dr + dg * dg + db * db);
      const isMatch = dist <= tolerance && src[i + 3] >= 128;
      const v = isMatch ? 0 : 255; // match → black (potrace traces dark regions)
      dst[i] = v; dst[i + 1] = v; dst[i + 2] = v; dst[i + 3] = 255;
    }
    return mask;
  }

  // ── Extract <path> strings from SVG ──────────────────────────
  function extractPaths(svgStr) {
    const paths = [];
    const re = /<path[^>]*\/>/gi;
    let m;
    while ((m = re.exec(svgStr)) !== null) {
      paths.push(m[0]);
    }
    return paths;
  }

  // ── Extract potrace <g> element (with its transform) ─────────
  // Potrace wraps all paths in a <g transform="..."> that handles
  // coordinate scaling and Y-flip. We must keep it intact.
  function extractGroup(svgStr) {
    const m = svgStr.match(/<g\b[^>]*>[\s\S]*<\/g>/);
    return m ? m[0] : null;
  }

  // ── Extract viewBox from SVG string ──────────────────────────
  function extractViewBox(svgStr) {
    const m = svgStr.match(/viewBox="([^"]+)"/);
    return m ? m[1] : null;
  }

  // ── Assemble multi-layer SVG ──────────────────────────────────
  // Each layer is a potrace <g> with its original transform; we only
  // replace the fill color to apply the quantized palette color.
  function assembleSVG(layers, viewBox) {
    const groups = layers.map(({ color, group }) => {
      const fill = `rgb(${color[0]},${color[1]},${color[2]})`;
      // Replace potrace's default fill (#000000 or similar) with our color
      return group.replace(/\bfill="[^"]*"/, `fill="${fill}"`);
    }).join('\n');
    return `<svg version="1.0" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">\n${groups}\n</svg>`;
  }

  // ── Color conversion (multi-layer potrace) ───────────────────
  async function convertColor(imgEl) {
    // Detail slider → number of colors: 2–8 (capped — logos rarely need more than 8)
    const numColors = Math.round(2 + (parseInt(detailSlider.value, 10) - 1) * 6 / 9); // 2–8

    // Get pixel data (with blur preprocessing)
    const prepCanvas = buildCanvas(imgEl, false);
    const prepCtx    = prepCanvas.getContext('2d');
    const origData   = prepCtx.getImageData(0, 0, prepCanvas.width, prepCanvas.height);

    // Posterize before quantization: snap nearby colors to the same value.
    // More aggressive (step=64) for few-color images → eliminates JPEG/PNG
    // compression noise that creates dozens of "navy" variants from one navy.
    const posterStep = numColors <= 3 ? 64 : numColors <= 5 ? 48 : 32;
    const postData   = new Uint8ClampedArray(origData.data);
    for (let i = 0; i < postData.length; i += 4) {
      if (postData[i + 3] < 128) continue;
      postData[i]     = Math.round(postData[i]     / posterStep) * posterStep;
      postData[i + 1] = Math.round(postData[i + 1] / posterStep) * posterStep;
      postData[i + 2] = Math.round(postData[i + 2] / posterStep) * posterStep;
    }
    const postImageData = new ImageData(postData, origData.width, origData.height);
    // Quantize, then merge colors still too similar (catches remaining variants)
    let palette = medianCut(postImageData, numColors);
    palette = mergeSimilarColors(palette, 50);
    const layers  = [];

    // Blur radius for mask edges: smooths jagged borders before potrace traces them.
    // Use at least 0.8px regardless of the smooth slider setting.
    const maskBlur = Math.max(0.8, (parseInt(smoothSlider.value, 10) - 1) * 4 / 9);

    let viewBox = null;
    for (let idx = 0; idx < palette.length; idx++) {
      const rawMask    = buildColorMaskCanvas(origData, palette, idx);
      // Apply blur to mask so potrace produces smooth curves, not pixel-jagged edges
      const maskCanvas = applyBlurToCanvas(rawMask, maskBlur);
      const svgLayer   = await window.loadFromCanvas(maskCanvas);
      const group      = extractGroup(svgLayer);
      if (!viewBox) viewBox = extractViewBox(svgLayer);
      if (group) layers.push({ color: palette[idx], group });
    }

    if (layers.length === 0) {
      return await window.loadFromCanvas(prepCanvas);
    }
    return assembleSVG(layers, viewBox || `0 0 ${prepCanvas.width} ${prepCanvas.height}`);
  }

  // UI: let the browser paint the loading state before the (main-thread) trace starts
  function nextPaint() {
    return new Promise(function (resolve) {
      requestAnimationFrame(function () { setTimeout(resolve, 0); });
    });
  }

  // ── Convert ──────────────────────────────────────────────────
  btnConvert.addEventListener('click', function () {
    if (!currentFile || !wasmReady) return;
    setConvertLoading();

    if (colorMode === 'color') {
      // Potrace multi-layer color
      (async function () {
        try {
          await nextPaint();
          const svgString = await convertColor(origImg);
          displayResult(svgString);
        } catch (err) {
          showError('Conversion failed: ' + (err.message || 'Unknown error.'));
          setConvertIdle();
        }
      }());
    } else {
      // Potrace single-pass B&W
      (async function () {
        try {
          await nextPaint();
          const canvas    = buildCanvas(origImg, true);
          const svgString = await window.loadFromCanvas(canvas);
          displayResult(svgString);
        } catch (err) {
          showError('Conversion failed: ' + (err.message || 'Unknown error.'));
          setConvertIdle();
        }
      }());
    }
  });

  function setConvertLoading() {
    btnConvert.disabled  = true;
    btnLabel.hidden      = true;
    btnSpinner.hidden    = false;
  }

  function setConvertIdle() {
    btnConvert.disabled  = !wasmReady;
    btnLabel.hidden      = false;
    btnSpinner.hidden    = true;
  }

  // ── Display Result ───────────────────────────────────────────
  function displayResult(svgString) {
    currentSvg = svgString;

    // Size in KB
    const bytes = new Blob([svgString]).size;
    const kb    = (bytes / 1024).toFixed(1);

    // Inject SVG inline
    svgContainer.innerHTML = svgString;
    resultMeta.textContent = `${kb} KB`;

    previewSection.hidden = false;
    previewSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    setConvertIdle();
  }

  // ── Download ─────────────────────────────────────────────────
  function downloadSvg(svgString, suffix) {
    if (!svgString || !currentFile) return;
    const blob     = new Blob([svgString], { type: 'image/svg+xml' });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement('a');
    const baseName = currentFile.name.replace(/\.png$/i, '');
    a.href     = url;
    a.download = baseName + (suffix || '') + '.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  btnDownload.addEventListener('click', function () {
    // In code mode inside viewer: download the edited SVG
    if (!viewerOverlay.hidden && viewerMode === 'code' && editedSvg) {
      downloadSvg(editedSvg, '-edited');
    } else {
      downloadSvg(currentSvg, '');
    }
  });

  // ── Copy SVG Code ────────────────────────────────────────────
  btnCopy.addEventListener('click', function () {
    if (!currentSvg) return;

    navigator.clipboard.writeText(currentSvg).then(function () {
      copyLabel.textContent = 'Copied!';
      setTimeout(function () {
        copyLabel.textContent = 'Copy SVG code';
      }, 1500);
    }).catch(function () {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = currentSvg;
      ta.style.position = 'fixed';
      ta.style.opacity  = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      copyLabel.textContent = 'Copied!';
      setTimeout(function () {
        copyLabel.textContent = 'Copy SVG code';
      }, 1500);
    });
  });

  // ── SVG Viewer ───────────────────────────────────────────────
  let vZoom    = 1;
  let vOffX    = 0;
  let vOffY    = 0;
  let vDragging = false;
  let vDragStartX = 0;
  let vDragStartY = 0;
  let vDragOriginX = 0;
  let vDragOriginY = 0;

  // ── Viewer Tab Switching ─────────────────────────────────────
  function switchViewerTab(mode) {
    viewerMode = mode;
    const isPreview = mode === 'preview';

    // Tab buttons
    tabPreview.classList.toggle('active', isPreview);
    tabPreview.setAttribute('aria-selected', String(isPreview));
    tabCode.classList.toggle('active', !isPreview);
    tabCode.setAttribute('aria-selected', String(!isPreview));

    // Panels
    viewerCanvas.hidden    = !isPreview;
    viewerCodePanel.hidden = isPreview;
    viewerFooter.hidden    = !isPreview;

    // Bg/zoom controls only relevant in preview
    document.querySelector('.viewer-bg-toggle').style.opacity = isPreview ? '' : '0.3';
    document.querySelector('.viewer-bg-toggle').style.pointerEvents = isPreview ? '' : 'none';
    viewerZoomIn.style.opacity  = isPreview ? '' : '0.3';
    viewerZoomOut.style.opacity = isPreview ? '' : '0.3';
    viewerZoomFit.style.opacity = isPreview ? '' : '0.3';
    viewerZoomIn.disabled  = !isPreview;
    viewerZoomOut.disabled = !isPreview;
    viewerZoomFit.disabled = !isPreview;

    if (!isPreview) {
      // Populate editor with current edited SVG (or original)
      editedSvg = editedSvg || currentSvg;
      svgEditor.value = editedSvg;
      // Seed history with the initial state on first open
      if (historyIndex < 0) pushHistory(editedSvg);
      updateLivePreview();
      svgEditor.focus();
      initPngSampler();
      initLayerDimsFromViewBox();
      selectedPath  = null;
      snipApplyColor.disabled = true;
      // Fit the code preview after render
      requestAnimationFrame(function () {
        requestAnimationFrame(fitCodePreview);
      });
    }
  }

  tabPreview.addEventListener('click', function () { switchViewerTab('preview'); });
  tabCode.addEventListener('click',    function () { switchViewerTab('code'); });

  // ── Live Preview ─────────────────────────────────────────────
  let previewDebounce = null;
  let cpZoom = 1, cpOffX = 0, cpOffY = 0;
  let cpDragging = false, cpDragSX = 0, cpDragSY = 0, cpDragOX = 0, cpDragOY = 0;

  function fixSvgDimensions(svgEl) {
    if (!svgEl) return;
    const vb = svgEl.getAttribute('viewBox');
    if (vb && !svgEl.getAttribute('width')) {
      const parts = vb.trim().split(/\s+|,/);
      if (parts.length === 4) {
        svgEl.setAttribute('width',  parts[2]);
        svgEl.setAttribute('height', parts[3]);
      }
    }
  }

  function applyCodePreviewTransform() {
    codePreviewInner.style.transform =
      'translate(' + cpOffX + 'px,' + cpOffY + 'px) scale(' + cpZoom + ')';
    codeZoomLabel.textContent = Math.round(cpZoom * 100) + '%';
  }

  function fitCodePreview() {
    const svgEl = codePreviewInner.querySelector('svg');
    if (!svgEl) return;
    const { w, h } = getCodeSvgDimensions(svgEl);
    const rect = codePreview.getBoundingClientRect();
    const scaleX = (rect.width  * 0.85) / w;
    const scaleY = (rect.height * 0.85) / h;
    cpZoom = Math.min(scaleX, scaleY, 4);
    cpOffX = (rect.width  - w * cpZoom) / 2;
    cpOffY = (rect.height - h * cpZoom) / 2;
    applyCodePreviewTransform();
  }

  function getCodeSvgDimensions(svgEl) {
    const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
    if (vb && vb.width && vb.height) return { w: vb.width, h: vb.height };
    const attrW = parseFloat(svgEl.getAttribute('width'));
    const attrH = parseFloat(svgEl.getAttribute('height'));
    if (attrW && attrH) return { w: attrW, h: attrH };
    return { w: 400, h: 400 };
  }

  function zoomCodePreviewBy(delta, cx, cy) {
    const rect = codePreview.getBoundingClientRect();
    const pivotX = cx !== undefined ? cx - rect.left : rect.width  / 2;
    const pivotY = cy !== undefined ? cy - rect.top  : rect.height / 2;
    const prev = cpZoom;
    cpZoom = Math.min(Math.max(cpZoom * delta, 0.05), 20);
    cpOffX = pivotX - (pivotX - cpOffX) * (cpZoom / prev);
    cpOffY = pivotY - (pivotY - cpOffY) * (cpZoom / prev);
    applyCodePreviewTransform();
  }

  function updateLivePreview() {
    editedSvg = svgEditor.value;
    codePreviewInner.innerHTML = editedSvg;
    const svgEl = codePreviewInner.querySelector('svg');
    fixSvgDimensions(svgEl);
  }

  svgEditor.addEventListener('input', function () {
    clearTimeout(previewDebounce);
    previewDebounce = setTimeout(updateLivePreview, 150);
  });

  // Code preview zoom buttons
  codeZoomIn.addEventListener('click',  function () { zoomCodePreviewBy(1.25); });
  codeZoomOut.addEventListener('click', function () { zoomCodePreviewBy(0.8); });
  codeZoomFit.addEventListener('click', fitCodePreview);

  // Scroll to zoom on code preview
  codePreview.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomCodePreviewBy(e.deltaY < 0 ? 1.12 : 0.89, e.clientX, e.clientY);
  }, { passive: false });

  // Drag to pan on code preview
  codePreview.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    cpDragging = true;
    cpDragSX = e.clientX; cpDragSY = e.clientY;
    cpDragOX = cpOffX;    cpDragOY = cpOffY;
    codePreview.classList.add('grabbing');
  });

  window.addEventListener('mousemove', function (e) {
    if (!cpDragging) return;
    cpOffX = cpDragOX + (e.clientX - cpDragSX);
    cpOffY = cpDragOY + (e.clientY - cpDragSY);
    applyCodePreviewTransform();
  });

  window.addEventListener('mouseup', function () {
    if (!cpDragging) return;
    cpDragging = false;
    codePreview.classList.remove('grabbing');
  });

  // ── Snippets ─────────────────────────────────────────────────
  function ensureDefs(svgStr) {
    if (/<defs[\s>]/i.test(svgStr)) return svgStr;
    return svgStr.replace(/(<svg[^>]*>)/i, '$1<defs></defs>');
  }

  function injectFilter(svgStr, filterId, filterXml) {
    let result = ensureDefs(svgStr);
    // Remove existing filter with same id to avoid duplicates
    const reFilter = new RegExp('<filter[^>]*id="' + filterId + '"[^>]*>[\\s\\S]*?<\\/filter>', 'gi');
    result = result.replace(reFilter, '');
    // Inject into <defs>
    result = result.replace(/(<defs[^>]*>)/i, '$1' + filterXml);
    return result;
  }

  function wrapContentWithFilter(svgStr, filterId) {
    // Remove any existing filter-wrap <g> to avoid double nesting
    svgStr = svgStr.replace(/<g\s+id="svg-filter-wrap"[^>]*>([\s\S]*?)<\/g>(\s*)(<\/svg>)/i,
      '$1$2$3');
    // Wrap all content between <svg ...> and </svg> in a single <g> with the filter
    return svgStr.replace(/(<svg[^>]*>)([\s\S]*)(<\/svg>)/i, function (_, open, content, close) {
      return open +
        '<g id="svg-filter-wrap" filter="url(#' + filterId + ')">' +
        content +
        '</g>' +
        close;
    });
  }

  function removeAllFilters(svgStr) {
    // Remove filter-wrap <g>
    svgStr = svgStr.replace(/<g\s+id="svg-filter-wrap"[^>]*>([\s\S]*?)<\/g>(\s*)(<\/svg>)/i,
      '$1$2$3');
    // Remove injected <filter> elements from <defs>
    svgStr = svgStr.replace(/<filter\s+id="svg-(glow|shadow)"[\s\S]*?<\/filter>/gi, '');
    // Remove stroke attrs from any <g>
    svgStr = svgStr.replace(/\s+stroke="[^"]*"\s+stroke-width="[^"]*"/g, '');
    return svgStr;
  }

  function injectSnippet(type) {
    let svg = svgEditor.value || currentSvg;
    const param = parseFloat(snippetParam.value) || 0;

    // ── Visual effects ──────────────────────────────────────────
    if (type === 'glow') {
      const s = param || 6;
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-glow',
        '<filter id="svg-glow" x="-40%" y="-40%" width="180%" height="180%">' +
        '<feGaussianBlur stdDeviation="' + s + '" result="blur"/>' +
        '<feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
        '</filter>');
      svg = wrapContentWithFilter(svg, 'svg-glow');
    }

    if (type === 'neon') {
      const s = param || 6;
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-neon',
        '<filter id="svg-neon" x="-40%" y="-40%" width="180%" height="180%">' +
        '<feFlood flood-color="#00ffcc" result="color"/>' +
        '<feComposite in="color" in2="SourceGraphic" operator="in" result="colored"/>' +
        '<feGaussianBlur in="colored" stdDeviation="' + s + '" result="blur"/>' +
        '<feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>' +
        '</filter>');
      svg = wrapContentWithFilter(svg, 'svg-neon');
    }

    if (type === 'shadow') {
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-shadow',
        '<filter id="svg-shadow" x="-15%" y="-15%" width="140%" height="140%">' +
        '<feDropShadow dx="4" dy="4" stdDeviation="4" flood-color="rgba(0,0,0,0.7)"/>' +
        '</filter>');
      svg = wrapContentWithFilter(svg, 'svg-shadow');
    }

    if (type === 'blur') {
      const s = param || 4;
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-blur',
        '<filter id="svg-blur"><feGaussianBlur stdDeviation="' + s + '"/></filter>');
      svg = wrapContentWithFilter(svg, 'svg-blur');
    }

    if (type === 'emboss') {
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-emboss',
        '<filter id="svg-emboss">' +
        '<feConvolveMatrix order="3" kernelMatrix="-2 -1 0 -1 1 1 0 1 2" preserveAlpha="true"/>' +
        '</filter>');
      svg = wrapContentWithFilter(svg, 'svg-emboss');
    }

    if (type === 'sepia') {
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-sepia',
        '<filter id="svg-sepia">' +
        '<feColorMatrix type="matrix" values="' +
        '0.393 0.769 0.189 0 0 ' +
        '0.349 0.686 0.168 0 0 ' +
        '0.272 0.534 0.131 0 0 ' +
        '0     0     0     1 0"/>' +
        '</filter>');
      svg = wrapContentWithFilter(svg, 'svg-sepia');
    }

    // ── Color effects ───────────────────────────────────────────
    if (type === 'invert') {
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-invert',
        '<filter id="svg-invert">' +
        '<feColorMatrix type="matrix" values="' +
        '-1 0  0  0 1 ' +
        '0 -1  0  0 1 ' +
        '0  0 -1  0 1 ' +
        '0  0  0  1 0"/>' +
        '</filter>');
      svg = wrapContentWithFilter(svg, 'svg-invert');
    }

    if (type === 'grayscale') {
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-grayscale',
        '<filter id="svg-grayscale"><feColorMatrix type="saturate" values="0"/></filter>');
      svg = wrapContentWithFilter(svg, 'svg-grayscale');
    }

    if (type === 'hue') {
      const deg = param || 180;
      svg = removeAllFilters(svg);
      svg = injectFilter(svg, 'svg-hue',
        '<filter id="svg-hue"><feColorMatrix type="hueRotate" values="' + deg + '"/></filter>');
      svg = wrapContentWithFilter(svg, 'svg-hue');
    }

    // ── Structure ───────────────────────────────────────────────
    if (type === 'stroke') {
      svg = svg.replace(/(<g\b(?![^>]*\bstroke=)[^>]*)>/gi,
        '$1 stroke="#ffffff" stroke-width="1">');
    }

    if (type === 'removebg') {
      // Remove the first <g>...</g> block (typically the background layer)
      svg = svg.replace(/<g\b[^>]*>[\s\S]*?<\/g>/, '');
    }

    if (type === 'outline') {
      // Remove all fill attributes from <g> and <path>, set stroke
      svg = svg.replace(/\sfill="[^"]*"/gi, ' fill="none"');
      svg = svg.replace(/(<g\b(?![^>]*\bstroke=)[^>]*)>/gi,
        '$1 stroke="#000000" stroke-width="1">');
    }

    if (type === 'reset') {
      svg = currentSvg;
      editedSvg = null;
      snippetSelect.value = '';
      snippetsParam.hidden = true;
    }

    svgEditor.value = svg;
    updateLivePreview();
  }

  // Show/hide param input based on selected effect
  const PARAM_EFFECTS = {
    hue:  { label: 'Degrees (0–360):', min: 0, max: 360, value: 180 },
    blur: { label: 'Strength (1–20):',  min: 1, max: 20,  value: 4  },
    glow: { label: 'Strength (1–20):',  min: 1, max: 20,  value: 6  },
    neon: { label: 'Strength (1–20):',  min: 1, max: 20,  value: 6  },
  };

  snippetSelect.addEventListener('change', function () {
    const cfg = PARAM_EFFECTS[snippetSelect.value];
    if (cfg) {
      snippetsParamLabel.textContent = cfg.label;
      snippetParam.min   = cfg.min;
      snippetParam.max   = cfg.max;
      snippetParam.value = cfg.value;
      snippetsParam.hidden = false;
    } else {
      snippetsParam.hidden = true;
    }
  });

  snipApply.addEventListener('click', function () {
    const type = snippetSelect.value;
    if (!type) return;
    injectSnippet(type);
  });

  snipReset.addEventListener('click', function () { injectSnippet('reset'); });

  snipDownload.addEventListener('click', function () {
    downloadSvg(editedSvg || currentSvg, '-edited');
  });

  // ── Layers ───────────────────────────────────────────────────
  const layerShapeBtns      = document.getElementById('layerShapeBtns');
  const layerDimsRect       = document.getElementById('layerDimsRect');
  const layerDimsCircle     = document.getElementById('layerDimsCircle');
  const layerDimsEllipse    = document.getElementById('layerDimsEllipse');
  const layerFillTypeBtns   = document.getElementById('layerFillTypeBtns');
  const layerFlatControls   = document.getElementById('layerFlatControls');
  const layerGradControls   = document.getElementById('layerGradControls');
  const layerColorPicker    = document.getElementById('layerColorPicker');
  const layerHexInput       = document.getElementById('layerHex');
  const layerGradPicker1    = document.getElementById('layerGradPicker1');
  const layerGradHex1       = document.getElementById('layerGradHex1');
  const layerGradPicker2    = document.getElementById('layerGradPicker2');
  const layerGradHex2       = document.getElementById('layerGradHex2');
  const layerGradDirs       = document.getElementById('layerGradDirs');
  const layerGradPreview    = document.getElementById('layerGradPreview');
  const snipInsertLayer     = document.getElementById('snipInsertLayer');
  const snipUpdateLayer     = document.getElementById('snipUpdateLayer');

  let layerShape    = 'rect';
  let layerFillType = 'flat';
  let layerGradDir  = { type: 'linear', x1: 0, y1: 50, x2: 100, y2: 50 };
  let layerEditTag  = null; // original tag string when editing an existing layer

  // ── helpers ──
  function getLayerViewBox() {
    const code = svgEditor.value || currentSvg || '';
    const m = code.match(/viewBox="([^"]+)"/);
    let vbX = 0, vbY = 0, vbW = 500, vbH = 500;
    if (m) {
      const p = m[1].trim().split(/[\s,]+/).map(Number);
      if (p.length === 4) { vbX = p[0]; vbY = p[1]; vbW = p[2]; vbH = p[3]; }
    }
    return { vbX, vbY, vbW, vbH };
  }

  function initLayerDimsFromViewBox() {
    const { vbX, vbY, vbW, vbH } = getLayerViewBox();
    document.getElementById('layerX').value = vbX;
    document.getElementById('layerY').value = vbY;
    document.getElementById('layerW').value = vbW;
    document.getElementById('layerH').value = vbH;
    document.getElementById('layerCX').value  = Math.round(vbX + vbW / 2);
    document.getElementById('layerCY').value  = Math.round(vbY + vbH / 2);
    document.getElementById('layerR').value   = Math.round(Math.min(vbW, vbH) * 0.4);
    document.getElementById('layerECX').value = Math.round(vbX + vbW / 2);
    document.getElementById('layerECY').value = Math.round(vbY + vbH / 2);
    document.getElementById('layerRX').value  = Math.round(vbW * 0.4);
    document.getElementById('layerRY').value  = Math.round(vbH * 0.24);
  }

  function updateLayerGradPreview() {
    const c1 = layerGradHex1.value || '#ffffff';
    const c2 = layerGradHex2.value || '#000000';
    if (layerGradDir.type === 'radial-out') {
      layerGradPreview.style.background = `radial-gradient(circle, ${c1}, ${c2})`;
    } else if (layerGradDir.type === 'radial-in') {
      layerGradPreview.style.background = `radial-gradient(circle, ${c2}, ${c1})`;
    } else {
      const dx = layerGradDir.x2 - layerGradDir.x1;
      const dy = layerGradDir.y2 - layerGradDir.y1;
      const angle = Math.round(Math.atan2(dx, -dy) * 180 / Math.PI);
      layerGradPreview.style.background = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
    }
  }

  function buildLayerFill(gradId) {
    if (layerFillType === 'flat') {
      return { attr: `fill="${layerHexInput.value || '#ffffff'}"`, defs: '' };
    }
    const c1 = layerGradHex1.value || '#ffffff';
    const c2 = layerGradHex2.value || '#000000';
    let defTag;
    if (layerGradDir.type === 'radial-out') {
      defTag = `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient>`;
    } else if (layerGradDir.type === 'radial-in') {
      defTag = `<radialGradient id="${gradId}" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="${c2}"/><stop offset="100%" stop-color="${c1}"/></radialGradient>`;
    } else {
      defTag = `<linearGradient id="${gradId}" x1="${layerGradDir.x1}%" y1="${layerGradDir.y1}%" x2="${layerGradDir.x2}%" y2="${layerGradDir.y2}%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`;
    }
    return { attr: `fill="url(#${gradId})"`, defs: defTag };
  }

  function buildLayerTag(gradId) {
    const fill = buildLayerFill(gradId);
    if (layerShape === 'rect') {
      const x = document.getElementById('layerX').value;
      const y = document.getElementById('layerY').value;
      const w = document.getElementById('layerW').value;
      const h = document.getElementById('layerH').value;
      return { tag: `<rect x="${x}" y="${y}" width="${w}" height="${h}" ${fill.attr} data-layer="1"/>`, defs: fill.defs };
    } else if (layerShape === 'circle') {
      const cx = document.getElementById('layerCX').value;
      const cy = document.getElementById('layerCY').value;
      const r  = document.getElementById('layerR').value;
      return { tag: `<circle cx="${cx}" cy="${cy}" r="${r}" ${fill.attr} data-layer="1"/>`, defs: fill.defs };
    } else {
      const cx = document.getElementById('layerECX').value;
      const cy = document.getElementById('layerECY').value;
      const rx = document.getElementById('layerRX').value;
      const ry = document.getElementById('layerRY').value;
      return { tag: `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${fill.attr} data-layer="1"/>`, defs: fill.defs };
    }
  }

  function injectLayer(code, tag, defs) {
    if (defs) {
      if (!code.includes('<defs>')) {
        code = code.replace(/<svg([^>]*)>/, '<svg$1>\n<defs></defs>');
      }
      code = code.replace('</defs>', defs + '</defs>');
    }
    if (/<\/defs>/.test(code)) {
      code = code.replace('</defs>', '</defs>\n' + tag);
    } else {
      code = code.replace(/(<svg\b[^>]*>)/, '$1\n' + tag);
    }
    return code;
  }

  function setLayerEditMode(editing) {
    snipInsertLayer.style.display  = editing ? 'none' : '';
    snipUpdateLayer.style.display  = editing ? '' : 'none';
    snipDeleteLayer.style.display  = editing ? '' : 'none';
  }

  // ── shape selector ──
  layerShapeBtns.querySelectorAll('.tools-shape-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      layerShapeBtns.querySelectorAll('.tools-shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      layerShape = btn.dataset.shape;
      layerDimsRect.style.display    = layerShape === 'rect'    ? '' : 'none';
      layerDimsCircle.style.display  = layerShape === 'circle'  ? '' : 'none';
      layerDimsEllipse.style.display = layerShape === 'ellipse' ? '' : 'none';
    });
  });

  // ── fill type toggle ──
  layerFillTypeBtns.querySelectorAll('.tools-shape-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      layerFillTypeBtns.querySelectorAll('.tools-shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      layerFillType = btn.dataset.fill;
      layerFlatControls.style.display  = layerFillType === 'flat'     ? '' : 'none';
      layerGradControls.style.display  = layerFillType === 'gradient' ? '' : 'none';
    });
  });

  // ── flat color sync ──
  layerHexInput.value = layerColorPicker.value;
  layerColorPicker.addEventListener('input', () => { layerHexInput.value = layerColorPicker.value; });
  layerHexInput.addEventListener('change', function () {
    const hex = normalizeHex(layerHexInput.value);
    if (!hex) return;
    layerHexInput.value   = hex;
    layerColorPicker.value = hex;
  });

  // ── gradient direction buttons ──
  layerGradDirs.querySelectorAll('.grad-dir-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      layerGradDirs.querySelectorAll('.grad-dir-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.type;
      if (t === 'radial-out' || t === 'radial-in') {
        layerGradDir = { type: t };
      } else {
        layerGradDir = { type: 'linear', x1: parseFloat(btn.dataset.x1), y1: parseFloat(btn.dataset.y1), x2: parseFloat(btn.dataset.x2), y2: parseFloat(btn.dataset.y2) };
      }
      updateLayerGradPreview();
    });
  });

  // ── gradient color sync ──
  layerGradHex1.value = layerGradPicker1.value;
  layerGradHex2.value = layerGradPicker2.value;
  layerGradPicker1.addEventListener('input', () => { layerGradHex1.value = layerGradPicker1.value; updateLayerGradPreview(); });
  layerGradPicker2.addEventListener('input', () => { layerGradHex2.value = layerGradPicker2.value; updateLayerGradPreview(); });
  layerGradHex1.addEventListener('change', function () {
    const hex = normalizeHex(layerGradHex1.value); if (!hex) return;
    layerGradHex1.value = hex; layerGradPicker1.value = hex; updateLayerGradPreview();
  });
  layerGradHex2.addEventListener('change', function () {
    const hex = normalizeHex(layerGradHex2.value); if (!hex) return;
    layerGradHex2.value = hex; layerGradPicker2.value = hex; updateLayerGradPreview();
  });
  updateLayerGradPreview();

  // ── Insert ──
  // After inserting, automatically enter edit mode so dimensions can be tweaked immediately
  snipInsertLayer.addEventListener('click', function () {
    let code = svgEditor.value || currentSvg;
    if (!code) return;
    initLayerDimsFromViewBox();
    const gradId = 'lgrd-' + Date.now();
    const { tag, defs } = buildLayerTag(gradId);
    code = injectLayer(code, tag, defs);
    pushHistory(code);
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();
    // Stay in edit mode with the just-inserted tag
    layerEditTag = tag;
    setLayerEditMode(true);
    refreshLayerHandles();
  });

  // ── Update (replace existing layer) ──
  snipUpdateLayer.addEventListener('click', function () {
    let code = svgEditor.value || currentSvg;
    if (!code || !layerEditTag) return;
    const gradId = 'lgrd-' + Date.now();
    const { tag: newTag, defs } = buildLayerTag(gradId);
    // Escape and replace old tag
    const escaped = layerEditTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(escaped).test(code)) {
      // Tag no longer found (user may have edited code manually) — just insert
      code = injectLayer(code, newTag, defs);
    } else {
      code = code.replace(new RegExp(escaped), newTag);
      if (defs) {
        if (!code.includes('<defs>')) code = code.replace(/<svg([^>]*)>/, '<svg$1>\n<defs></defs>');
        code = code.replace('</defs>', defs + '</defs>');
      }
    }
    pushHistory(code);
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();
    // Keep edit mode active with the new tag so user can keep tweaking
    layerEditTag = newTag;
    refreshLayerHandles();
  });

  // ── "New layer" — exit edit mode and reset to Insert ──
  // Clicking the shape selector resets edit mode (user wants a fresh layer)
  layerShapeBtns.querySelectorAll('.tools-shape-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      if (layerEditTag) {
        layerEditTag = null;
        setLayerEditMode(false);
        showLayerHandles();
      }
    });
  });

  // ── Delete layer ─────────────────────────────────────────────
  const snipDeleteLayer = document.getElementById('snipDeleteLayer');
  snipDeleteLayer.addEventListener('click', function () {
    if (!layerEditTag) return;
    let code = svgEditor.value || currentSvg;
    const escaped = layerEditTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    pushHistory(code);
    code = code.replace(new RegExp('\\n?' + escaped), '');
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();
    layerEditTag = null;
    setLayerEditMode(false);
    showLayerHandles();
  });

  // ── Delete selected paths ────────────────────────────────────
  const snipDeletePaths = document.getElementById('snipDeletePaths');
  snipDeletePaths.addEventListener('click', function () {
    if (!selectedPaths.length) return;
    const parser = new DOMParser();
    let code = svgEditor.value || currentSvg;
    pushHistory(code);
    const doc = parser.parseFromString(code, 'image/svg+xml');
    const selectedDs = selectedPaths.map(p => p.getAttribute('d')).filter(Boolean);
    doc.querySelectorAll('path').forEach(p => {
      if (selectedDs.includes(p.getAttribute('d'))) p.parentNode.removeChild(p);
    });
    code = new XMLSerializer().serializeToString(doc.documentElement);
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();
    selectedPaths = [];
    selectedPath  = null;
    snipApplyColor.disabled = true;
    snipMergePaths.disabled = true;
    snipDeletePaths.disabled = true;
    updateGradBtn();
  });

  // ── Layer drag-and-drop ──────────────────────────────────────
  const layerHandleOverlay = document.getElementById('layerHandleOverlay');
  let   layerDragState     = null;

  function svgPtToOverlay(svgEl, svgX, svgY) {
    const pt  = svgEl.createSVGPoint();
    pt.x = svgX; pt.y = svgY;
    const screen = pt.matrixTransform(svgEl.getScreenCTM());
    const rect   = layerHandleOverlay.getBoundingClientRect();
    return { x: screen.x - rect.left, y: screen.y - rect.top };
  }

  function clientToSvg(svgEl, clientX, clientY) {
    const pt = svgEl.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    return pt.matrixTransform(svgEl.getScreenCTM().inverse());
  }

  function showLayerHandles() {
    layerHandleOverlay.innerHTML = '';
    if (!layerEditTag) return;
    const svgEl = codePreviewInner.querySelector('svg');
    if (!svgEl) return;
    const layerEls = svgEl.querySelectorAll('[data-layer]');
    if (!layerEls.length) return;
    const el    = layerEls[layerEls.length - 1];
    const shape = el.tagName.toLowerCase();

    // Build handle descriptors in SVG coords
    let handles = [];
    if (shape === 'rect') {
      const x = parseFloat(el.getAttribute('x')) || 0;
      const y = parseFloat(el.getAttribute('y')) || 0;
      const w = parseFloat(el.getAttribute('width'))  || 1;
      const h = parseFloat(el.getAttribute('height')) || 1;
      // selection box
      const tl = svgPtToOverlay(svgEl, x, y);
      const br = svgPtToOverlay(svgEl, x + w, y + h);
      const box = document.createElement('div');
      box.className = 'layer-sel-box';
      box.style.left   = tl.x + 'px';
      box.style.top    = tl.y + 'px';
      box.style.width  = (br.x - tl.x) + 'px';
      box.style.height = (br.y - tl.y) + 'px';
      layerHandleOverlay.appendChild(box);
      handles = [
        { role: 'move', sx: x + w/2,   sy: y + h/2  },
        { role: 'nw',   sx: x,          sy: y         },
        { role: 'n',    sx: x + w/2,   sy: y         },
        { role: 'ne',   sx: x + w,     sy: y         },
        { role: 'e',    sx: x + w,     sy: y + h/2  },
        { role: 'se',   sx: x + w,     sy: y + h    },
        { role: 's',    sx: x + w/2,   sy: y + h    },
        { role: 'sw',   sx: x,          sy: y + h    },
        { role: 'w',    sx: x,          sy: y + h/2  },
      ];
    } else if (shape === 'circle') {
      const cx = parseFloat(el.getAttribute('cx')) || 0;
      const cy = parseFloat(el.getAttribute('cy')) || 0;
      const r  = parseFloat(el.getAttribute('r'))  || 1;
      handles = [
        { role: 'move', sx: cx,     sy: cy     },
        { role: 'e',    sx: cx + r, sy: cy     },
        { role: 'n',    sx: cx,     sy: cy - r },
        { role: 'w',    sx: cx - r, sy: cy     },
        { role: 's',    sx: cx,     sy: cy + r },
      ];
    } else { // ellipse
      const cx = parseFloat(el.getAttribute('cx')) || 0;
      const cy = parseFloat(el.getAttribute('cy')) || 0;
      const rx = parseFloat(el.getAttribute('rx')) || 1;
      const ry = parseFloat(el.getAttribute('ry')) || 1;
      handles = [
        { role: 'move', sx: cx,      sy: cy      },
        { role: 'e',    sx: cx + rx, sy: cy      },
        { role: 'w',    sx: cx - rx, sy: cy      },
        { role: 'n',    sx: cx,      sy: cy - ry },
        { role: 's',    sx: cx,      sy: cy + ry },
      ];
    }

    handles.forEach(h => {
      const pos = svgPtToOverlay(svgEl, h.sx, h.sy);
      const div = document.createElement('div');
      div.className = 'layer-handle';
      div.dataset.role = h.role;
      div.style.left = pos.x + 'px';
      div.style.top  = pos.y + 'px';
      div.addEventListener('mousedown', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const origSvgPt = clientToSvg(svgEl, e.clientX, e.clientY);
        const origAttrs = {};
        if (shape === 'rect') {
          origAttrs.x = parseFloat(el.getAttribute('x')) || 0;
          origAttrs.y = parseFloat(el.getAttribute('y')) || 0;
          origAttrs.w = parseFloat(el.getAttribute('width'))  || 1;
          origAttrs.h = parseFloat(el.getAttribute('height')) || 1;
        } else if (shape === 'circle') {
          origAttrs.cx = parseFloat(el.getAttribute('cx')) || 0;
          origAttrs.cy = parseFloat(el.getAttribute('cy')) || 0;
          origAttrs.r  = parseFloat(el.getAttribute('r'))  || 1;
        } else {
          origAttrs.cx = parseFloat(el.getAttribute('cx')) || 0;
          origAttrs.cy = parseFloat(el.getAttribute('cy')) || 0;
          origAttrs.rx = parseFloat(el.getAttribute('rx')) || 1;
          origAttrs.ry = parseFloat(el.getAttribute('ry')) || 1;
        }
        layerDragState = { role: h.role, shape, el, svgEl, origSvgPt, origAttrs };
      });
      layerHandleOverlay.appendChild(div);
    });
  }

  document.addEventListener('mousemove', function (e) {
    if (!layerDragState) return;
    const { role, shape, el, svgEl, origSvgPt, origAttrs } = layerDragState;
    const cur = clientToSvg(svgEl, e.clientX, e.clientY);
    const dx  = cur.x - origSvgPt.x;
    const dy  = cur.y - origSvgPt.y;

    if (shape === 'rect') {
      let { x, y, w, h } = origAttrs;
      if (role === 'move')          { x += dx; y += dy; }
      if (role.includes('e'))       { w = Math.max(1, w + dx); }
      if (role.includes('w'))       { x += dx; w = Math.max(1, w - dx); }
      if (role.includes('s'))       { h = Math.max(1, h + dy); }
      if (role.includes('n'))       { y += dy; h = Math.max(1, h - dy); }
      x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
      el.setAttribute('x', x); el.setAttribute('y', y);
      el.setAttribute('width', w); el.setAttribute('height', h);
      document.getElementById('layerX').value = x;
      document.getElementById('layerY').value = y;
      document.getElementById('layerW').value = w;
      document.getElementById('layerH').value = h;
    } else if (shape === 'circle') {
      let { cx, cy, r } = origAttrs;
      if (role === 'move') { cx += dx; cy += dy; }
      else if (role === 'e' || role === 'w') r = Math.max(1, r + (role === 'e' ? dx : -dx));
      else if (role === 'n' || role === 's') r = Math.max(1, r + (role === 's' ? dy : -dy));
      cx = Math.round(cx); cy = Math.round(cy); r = Math.round(r);
      el.setAttribute('cx', cx); el.setAttribute('cy', cy); el.setAttribute('r', r);
      document.getElementById('layerCX').value = cx;
      document.getElementById('layerCY').value = cy;
      document.getElementById('layerR').value  = r;
    } else {
      let { cx, cy, rx, ry } = origAttrs;
      if (role === 'move') { cx += dx; cy += dy; }
      else if (role === 'e' || role === 'w') rx = Math.max(1, rx + (role === 'e' ? dx : -dx));
      else if (role === 'n' || role === 's') ry = Math.max(1, ry + (role === 's' ? dy : -dy));
      cx = Math.round(cx); cy = Math.round(cy); rx = Math.round(rx); ry = Math.round(ry);
      el.setAttribute('cx', cx); el.setAttribute('cy', cy);
      el.setAttribute('rx', rx); el.setAttribute('ry', ry);
      document.getElementById('layerECX').value = cx;
      document.getElementById('layerECY').value = cy;
      document.getElementById('layerRX').value  = rx;
      document.getElementById('layerRY').value  = ry;
    }
    showLayerHandles(); // reposition handles without rebuilding SVG
  });

  document.addEventListener('mouseup', function () {
    if (!layerDragState) return;
    layerDragState = null;
    // Sync DOM state back to code string + push history
    // Build new tag from current input values
    const gradId = 'lgrd-' + Date.now();
    const { tag: newTag, defs } = buildLayerTag(gradId);
    let code = svgEditor.value || currentSvg;
    const escaped = layerEditTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(escaped).test(code)) {
      code = code.replace(new RegExp(escaped), newTag);
      if (defs) {
        if (!code.includes('<defs>')) code = code.replace(/<svg([^>]*)>/, '<svg$1>\n<defs></defs>');
        code = code.replace('</defs>', defs + '</defs>');
      }
    }
    pushHistory(code);
    svgEditor.value = code;
    editedSvg = code;
    layerEditTag = newTag;
    // Don't call updateLivePreview here — DOM is already correct
  });

  // Called after insert/update to show handles
  function refreshLayerHandles() {
    // Small delay to ensure DOM has re-rendered
    requestAnimationFrame(showLayerHandles);
  }

  // ── Keyboard shortcuts: Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z ──────
  document.addEventListener('keydown', function (e) {
    // Only active when the code editor overlay is open
    const overlay = document.getElementById('viewerOverlay');
    if (!overlay || overlay.hidden) return;
    if (viewerMode !== 'code') return;
    // Don't intercept when typing inside the textarea
    if (e.target === svgEditor) return;

    if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if (
      (e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
      (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)
    ) {
      e.preventDefault();
      redo();
    }
  });

  // ── Tools panel toggle ───────────────────────────────────────
  const toolsPanel   = document.getElementById('toolsPanel');
  const toolsToggle  = document.getElementById('toolsToggle');
  toolsToggle.addEventListener('click', function () {
    toolsPanel.classList.toggle('collapsed');
  });

  // ── Toggle code panel ────────────────────────────────────────
  const snipToggleCode  = document.getElementById('snipToggleCode');
  snipToggleCode.addEventListener('click', function () {
    const hidden = viewerCodePanel.classList.toggle('code-hidden');
    snipToggleCode.textContent = hidden ? 'Show code' : 'Hide code';
    setTimeout(function () {
      if (pngOffscreen) {
        const rect = pngSamplerCanvas.parentElement.getBoundingClientRect();
        pngSamplerCanvas.width  = Math.round(rect.width)  || pngSamplerCanvas.width;
        pngSamplerCanvas.height = Math.round(rect.height) || pngSamplerCanvas.height;
        pngRedraw();
      }
    }, 220);
  });

  // ── Undo / Redo history ──────────────────────────────────────
  const svgHistory = [];
  let   historyIndex = -1;
  const MAX_HISTORY  = 60;

  function pushHistory(code) {
    // Drop any future states
    svgHistory.splice(historyIndex + 1);
    svgHistory.push(code);
    if (svgHistory.length > MAX_HISTORY) svgHistory.shift();
    historyIndex = svgHistory.length - 1;
  }

  function applyHistory(code) {
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();
    selectedPaths = [];
    selectedPath  = null;
    // Reset selection-dependent buttons via DOM (avoids forward-ref issues)
    ['snipApplyColor','snipMergePaths','snipDeletePaths','snipApplyGradient'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
  }

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    applyHistory(svgHistory[historyIndex]);
  }

  function redo() {
    if (historyIndex >= svgHistory.length - 1) return;
    historyIndex++;
    applyHistory(svgHistory[historyIndex]);
  }

  // ── Color Sampler ────────────────────────────────────────────
  let sampledColor  = null;  // { hex, r, g, b }
  let selectedPath  = null;  // last clicked DOM element (used for gradient d-attr lookup)
  let selectedPaths = [];    // all currently selected DOM elements

  // ── PNG sampler canvas with zoom/pan ─────────────────────────
  // The canvas is sized to the panel (CSS). We keep a separate offscreen
  // canvas at the original image resolution for pixel-accurate sampling,
  // and draw a zoomed/panned view into the visible canvas.
  let pngOffscreen = null; // full-res offscreen canvas
  let pngZoom      = 1;
  let pngOffsetX   = 0;
  let pngOffsetY   = 0;
  let pngPanning   = false;
  let pngPanStart  = null;

  function initPngSampler() {
    const img = origImg;
    if (!img.src) return;

    // Build full-res offscreen canvas
    pngOffscreen        = document.createElement('canvas');
    pngOffscreen.width  = img.naturalWidth;
    pngOffscreen.height = img.naturalHeight;
    pngOffscreen.getContext('2d').drawImage(img, 0, 0);

    // Size visible canvas to its CSS container
    const rect          = pngSamplerCanvas.parentElement.getBoundingClientRect();
    pngSamplerCanvas.width  = Math.round(rect.width)  || 400;
    pngSamplerCanvas.height = Math.round(rect.height) || 300;

    pngZoom    = 1;
    pngOffsetX = 0;
    pngOffsetY = 0;
    pngRedraw();
  }

  function pngRedraw() {
    if (!pngOffscreen) return;
    const cv  = pngSamplerCanvas;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(pngOffsetX, pngOffsetY);
    ctx.scale(pngZoom, pngZoom);
    // Draw image fitted to canvas at zoom=1
    const scaleToFit = Math.min(cv.width / pngOffscreen.width, cv.height / pngOffscreen.height);
    ctx.drawImage(pngOffscreen, 0, 0, pngOffscreen.width * scaleToFit, pngOffscreen.height * scaleToFit);
    ctx.restore();
  }

  // Wheel → zoom around cursor
  pngSamplerCanvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    const rect   = pngSamplerCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta  = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    pngOffsetX   = mouseX - (mouseX - pngOffsetX) * delta;
    pngOffsetY   = mouseY - (mouseY - pngOffsetY) * delta;
    pngZoom     *= delta;
    pngRedraw();
  }, { passive: false });

  // Middle-button or Alt+drag → pan
  pngSamplerCanvas.addEventListener('mousedown', function (e) {
    if (e.button === 1 || e.altKey) {
      e.preventDefault();
      pngPanning  = true;
      pngPanStart = { x: e.clientX - pngOffsetX, y: e.clientY - pngOffsetY };
      pngSamplerCanvas.style.cursor = 'grabbing';
    }
  });
  window.addEventListener('mousemove', function (e) {
    if (!pngPanning) return;
    pngOffsetX = e.clientX - pngPanStart.x;
    pngOffsetY = e.clientY - pngPanStart.y;
    pngRedraw();
  });
  window.addEventListener('mouseup', function (e) {
    if (pngPanning) {
      pngPanning = false;
      pngSamplerCanvas.style.cursor = 'crosshair';
    }
  });

  // Double-click → reset zoom
  pngSamplerCanvas.addEventListener('dblclick', function () {
    pngZoom    = 1;
    pngOffsetX = 0;
    pngOffsetY = 0;
    pngRedraw();
  });

  // Click on PNG canvas → sample pixel from offscreen (full-res, zoom-aware)
  pngSamplerCanvas.addEventListener('click', function (e) {
    if (!pngOffscreen || pngPanning) return;
    const rect    = pngSamplerCanvas.getBoundingClientRect();
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    // Invert the zoom/pan transform to get coordinates in draw-space
    const drawX = (canvasX - pngOffsetX) / pngZoom;
    const drawY = (canvasY - pngOffsetY) / pngZoom;

    // Map draw-space to offscreen pixel coordinates
    const scaleToFit = Math.min(
      pngSamplerCanvas.width  / pngOffscreen.width,
      pngSamplerCanvas.height / pngOffscreen.height
    );
    const imgX = Math.floor(drawX / scaleToFit);
    const imgY = Math.floor(drawY / scaleToFit);

    if (imgX < 0 || imgY < 0 || imgX >= pngOffscreen.width || imgY >= pngOffscreen.height) return;

    const [r, g, b] = pngOffscreen.getContext('2d').getImageData(imgX, imgY, 1, 1).data;
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    sampledColor = { hex, r, g, b };
    sampledSwatch.style.background = hex;
    sampledHexInput.value = hex;
    snipApplyColor.disabled    = !(selectedPaths.length);
    snipApplyColorAll.disabled = false;
  });

  // Click on path in SVG preview → select it (Shift+click to add to selection)
  codePreviewInner.addEventListener('click', function (e) {
    const target = e.target.closest('path, polygon, rect, circle, ellipse');
    if (!target) return;
    if (e.ctrlKey || e.metaKey) {
      // Ctrl+click (or Cmd on Mac): toggle this path in/out of selection
      if (target.classList.contains('svg-selected')) {
        target.classList.remove('svg-selected');
        selectedPaths = selectedPaths.filter(p => p !== target);
      } else {
        target.classList.add('svg-selected');
        selectedPaths.push(target);
      }
    } else {
      // Normal click: exclusive selection
      codePreviewInner.querySelectorAll('.svg-selected').forEach(el => el.classList.remove('svg-selected'));
      target.classList.add('svg-selected');
      selectedPaths = [target];
    }
    selectedPath = selectedPaths[selectedPaths.length - 1] || null;
    snipApplyColor.disabled = !(sampledColor && selectedPaths.length);
    snipMergePaths.disabled  = selectedPaths.length < 2;
    snipDeletePaths.disabled = selectedPaths.length < 1;
    updateGradBtn();
  });

  // Select All button
  const snipSelectAll   = document.getElementById('snipSelectAll');
  const snipMergePaths  = document.getElementById('snipMergePaths');

  snipSelectAll.addEventListener('click', function () {
    const all = Array.from(codePreviewInner.querySelectorAll('path, polygon, rect, circle, ellipse'));
    codePreviewInner.querySelectorAll('.svg-selected').forEach(el => el.classList.remove('svg-selected'));
    all.forEach(el => el.classList.add('svg-selected'));
    selectedPaths = all;
    selectedPath  = all[all.length - 1] || null;
    snipApplyColor.disabled = !(sampledColor && selectedPaths.length);
    snipMergePaths.disabled  = selectedPaths.length < 2;
    snipDeletePaths.disabled = selectedPaths.length < 1;
    updateGradBtn();
  });

  // Merge selected paths into one
  snipMergePaths.addEventListener('click', function () {
    if (selectedPaths.length < 2) return;

    // Collect d attributes from selected paths in the live preview
    const selectedDs = selectedPaths
      .map(p => p.getAttribute('d'))
      .filter(Boolean);
    if (selectedDs.length < 2) return;

    // Parse the current SVG code
    let code = svgEditor.value || currentSvg;
    const parser = new DOMParser();
    const doc = parser.parseFromString(code, 'image/svg+xml');

    // Find corresponding elements in parsed doc by matching d attribute
    const allDocPaths = Array.from(doc.querySelectorAll('path'));
    const toMerge = allDocPaths.filter(p => selectedDs.includes(p.getAttribute('d')));
    if (toMerge.length < 2) return;

    // Take fill from first selected path; default to currentColor
    const fill = toMerge[0].getAttribute('fill') || 'currentColor';

    // Concatenate all d attributes
    const combinedD = toMerge.map(p => p.getAttribute('d')).join(' ');

    // Build new merged path
    const ns = 'http://www.w3.org/2000/svg';
    const newPath = doc.createElementNS(ns, 'path');
    newPath.setAttribute('d', combinedD);
    newPath.setAttribute('fill', fill);
    newPath.setAttribute('fill-rule', 'evenodd');

    // Insert where the first path was, then remove all merged paths
    toMerge[0].parentNode.insertBefore(newPath, toMerge[0]);
    toMerge.forEach(p => p.parentNode.removeChild(p));

    // Serialize back to string
    const serializer = new XMLSerializer();
    code = serializer.serializeToString(doc.documentElement);

    pushHistory(code);
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();

    // Clear selection
    selectedPaths = [];
    selectedPath  = null;
    snipApplyColor.disabled = true;
    snipMergePaths.disabled = true;
    snipDeletePaths.disabled = true;
    updateGradBtn();
  });

  // Apply sampled color to the selected path in the textarea
  function applyColorToPath(el, color) {
    // Get the d attribute to identify this path in the code
    const dAttr = el.getAttribute('d');
    if (!dAttr) return;
    // Escape special regex chars in d attribute
    const escaped = dAttr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(<(?:path|polygon|rect|circle|ellipse)[^>]*d="' + escaped + '"[^>]*?)(fill="[^"]*")([^>]*\/?>)', 's');
    let code = svgEditor.value;
    if (re.test(code)) {
      code = code.replace(re, '$1fill="' + color + '"$3');
    } else {
      // No existing fill — inject it before the closing /> or >
      const reInsert = new RegExp('(<(?:path|polygon|rect|circle|ellipse)[^>]*d="' + escaped + '"[^>]*?)(\/?>)', 's');
      code = code.replace(reInsert, '$1 fill="' + color + '"$2');
    }
    pushHistory(code);
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();
    // Re-highlight after re-render (path element is replaced by innerHTML)
    selectedPath = null;
    snipApplyColor.disabled = true;
  }

  // Apply to all: replace/add fill on root <svg> or first <g>
  function applyColorToAll(color) {
    let code = svgEditor.value;
    // Try to replace existing fill on root <g>
    if (/<g\b[^>]*fill="[^"]*"/.test(code)) {
      code = code.replace(/(<g\b[^>]*?)fill="[^"]*"/, '$1fill="' + color + '"');
    } else if (/<g\b/.test(code)) {
      code = code.replace(/<g\b/, '<g fill="' + color + '"');
    } else {
      code = code.replace(/<svg\b[^>]*?>/, m => m.replace(/fill="[^"]*"/, '') + ' fill="' + color + '"');
    }
    pushHistory(code);
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();
  }

  snipApplyColor.addEventListener('click', function () {
    if (!sampledColor || !selectedPaths.length) return;
    pushHistory(svgEditor.value);
    selectedPaths.forEach(p => applyColorToPath(p, sampledColor.hex));
    selectedPaths = [];
    selectedPath  = null;
    snipDeletePaths.disabled = true;
    updateGradBtn();
  });

  snipApplyColorAll.addEventListener('click', function () {
    if (!sampledColor) return;
    applyColorToAll(sampledColor.hex);
  });

  // ── Hex input sync for flat fill ─────────────────────────────
  sampledHexInput.addEventListener('change', function () {
    const hex = normalizeHex(sampledHexInput.value);
    if (!hex) return;
    sampledHexInput.value = hex;
    sampledSwatch.style.background = hex;
    sampledColor = hexToRgb(hex);
    snipApplyColor.disabled    = !(selectedPaths.length);
    snipApplyColorAll.disabled = false;
  });

  function normalizeHex(v) {
    v = v.trim().replace(/^#?/, '#').toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(v)) return v;
    if (/^#[0-9a-f]{3}$/.test(v)) return '#' + v[1]+v[1]+v[2]+v[2]+v[3]+v[3];
    return null;
  }

  function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { hex, r, g, b };
  }

  // ── Gradient fill ─────────────────────────────────────────────
  const gradColor1El      = document.getElementById('gradColor1');
  const gradColor2Input   = document.getElementById('gradColor2Input');
  const gradHex1          = document.getElementById('gradHex1');
  const gradHex2          = document.getElementById('gradHex2');
  const gradPreview       = document.getElementById('gradPreview');
  const gradDirs          = document.getElementById('gradDirs');
  const snipApplyGradient = document.getElementById('snipApplyGradient');

  let gradColor1 = null; // hex string, set by PNG sampler click
  let gradDir    = { type: 'linear', x1: 0, y1: 50, x2: 100, y2: 50 }; // default: left→right

  // When user samples a color from PNG, also use it as gradient color 1
  pngSamplerCanvas.addEventListener('click', function () {
    if (!sampledColor) return;
    gradColor1 = sampledColor.hex;
    gradColor1El.style.background = gradColor1;
    if (gradHex1) gradHex1.value = gradColor1;
    updateGradPreview();
    updateGradBtn();
  }, true); // capture phase so it fires after the existing sampledColor assignment

  function updateGradPreview() {
    const c1 = gradColor1 || '#333';
    const c2 = gradColor2Input.value;
    if (gradDir.type === 'radial-out') {
      gradPreview.style.background = `radial-gradient(circle, ${c1}, ${c2})`;
    } else if (gradDir.type === 'radial-in') {
      gradPreview.style.background = `radial-gradient(circle, ${c2}, ${c1})`;
    } else {
      const angle = dirToAngle(gradDir);
      gradPreview.style.background = `linear-gradient(${angle}deg, ${c1}, ${c2})`;
    }
  }

  function dirToAngle(d) {
    if (d.x1 === 0   && d.y1 === 50  && d.x2 === 100 && d.y2 === 50)  return 90;
    if (d.x1 === 50  && d.y1 === 0   && d.x2 === 50  && d.y2 === 100) return 180;
    if (d.x1 === 0   && d.y1 === 0   && d.x2 === 100 && d.y2 === 100) return 135;
    if (d.x1 === 100 && d.y1 === 0   && d.x2 === 0   && d.y2 === 100) return 225;
    return 90;
  }

  function updateGradBtn() {
    snipApplyGradient.disabled = !(gradColor1 && selectedPaths.length);
  }

  // Sync gradHex1 ↔ gradColor1
  gradHex1.addEventListener('change', function () {
    const hex = normalizeHex(gradHex1.value);
    if (!hex) return;
    gradHex1.value = hex;
    gradColor1 = hex;
    gradColor1El.style.background = hex;
    updateGradPreview();
    updateGradBtn();
  });

  // Sync gradColor2Input ↔ gradHex2 (bidirectional)
  gradColor2Input.addEventListener('input', function () {
    gradHex2.value = gradColor2Input.value;
    updateGradPreview();
  });

  gradHex2.addEventListener('change', function () {
    const hex = normalizeHex(gradHex2.value);
    if (!hex) return;
    gradHex2.value = hex;
    gradColor2Input.value = hex;
    updateGradPreview();
  });

  // Init gradHex2 from color picker default
  gradHex2.value = gradColor2Input.value;

  // Direction buttons
  gradDirs.querySelectorAll('.grad-dir-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      gradDirs.querySelectorAll('.grad-dir-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const t = btn.dataset.type;
      if (t === 'radial-out' || t === 'radial-in') {
        gradDir = { type: t };
      } else {
        gradDir = {
          type: 'linear',
          x1: parseFloat(btn.dataset.x1),
          y1: parseFloat(btn.dataset.y1),
          x2: parseFloat(btn.dataset.x2),
          y2: parseFloat(btn.dataset.y2),
        };
      }
      updateGradPreview();
    });
  });

  // Apply gradient to all selected paths
  snipApplyGradient.addEventListener('click', function () {
    if (!gradColor1 || !selectedPaths.length) return;

    const c1 = gradColor1;
    const c2 = gradColor2Input.value;

    let code = svgEditor.value || currentSvg;

    // Ensure <defs> exists
    if (!code.includes('<defs>')) {
      code = code.replace(/<svg([^>]*)>/, '<svg$1>\n<defs></defs>');
    }

    selectedPaths.forEach(pathEl => {
      const id = 'grad-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      let gradTag;
      if (gradDir.type === 'radial-out') {
        // center → edge: c1 at center, c2 at edge
        gradTag =
          `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">` +
          `<stop offset="0%" stop-color="${c1}"/>` +
          `<stop offset="100%" stop-color="${c2}"/>` +
          `</radialGradient>`;
      } else if (gradDir.type === 'radial-in') {
        // edge → center: c2 at center, c1 at edge
        gradTag =
          `<radialGradient id="${id}" cx="50%" cy="50%" r="50%">` +
          `<stop offset="0%" stop-color="${c2}"/>` +
          `<stop offset="100%" stop-color="${c1}"/>` +
          `</radialGradient>`;
      } else {
        gradTag =
          `<linearGradient id="${id}" x1="${gradDir.x1}%" y1="${gradDir.y1}%" x2="${gradDir.x2}%" y2="${gradDir.y2}%">` +
          `<stop offset="0%" stop-color="${c1}"/>` +
          `<stop offset="100%" stop-color="${c2}"/>` +
          `</linearGradient>`;
      }
      code = code.replace('</defs>', gradTag + '</defs>');

      const pathD = pathEl.getAttribute('d');
      if (!pathD) return;
      const escaped = pathD.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`fill="[^"]*"`).test(code.match(new RegExp(`<path[^>]*d="${escaped}"[^>]*>`))?.[0] || '')) {
        code = code.replace(
          new RegExp(`(<path[^>]*d="${escaped}"[^>]*)fill="[^"]*"`),
          `$1fill="url(#${id})"`
        );
      } else {
        code = code.replace(
          new RegExp(`(<path[^>]*d="${escaped}")`),
          `$1 fill="url(#${id})"`
        );
      }
    });

    pushHistory(code);
    svgEditor.value = code;
    editedSvg = code;
    updateLivePreview();
    selectedPaths = [];
    selectedPath  = null;
    snipDeletePaths.disabled = true;
    snipApplyGradient.disabled = true;
  });

  function openViewer() {
    if (!currentSvg) return;

    editedSvg = null; // reset edits on each new open
    switchViewerTab('preview');
    viewerSvgWrap.innerHTML = currentSvg;

    // Stats
    const paths    = viewerSvgWrap.querySelectorAll('path').length;
    const polygons = viewerSvgWrap.querySelectorAll('polygon').length;
    const totalShapes = paths + polygons;
    const nodes = Array.from(viewerSvgWrap.querySelectorAll('path'))
      .reduce((acc, p) => acc + (p.getAttribute('d') || '').split(/[MLHVCSQTAZ]/i).length, 0);
    const kb = (new Blob([currentSvg]).size / 1024).toFixed(1);

    viewerStats.innerHTML =
      '<span>Size: <strong>' + kb + ' KB</strong></span>' +
      '<span>Shapes: <strong>' + totalShapes + '</strong></span>' +
      '<span>Nodes: <strong>' + nodes + '</strong></span>';

    // Fix: imagetracer.js outputs only viewBox, no width/height attributes.
    // Without explicit dimensions the browser renders the SVG at 0×0.
    const svgEl = viewerSvgWrap.querySelector('svg');
    if (svgEl) {
      const vb = svgEl.getAttribute('viewBox');
      if (vb && !svgEl.getAttribute('width')) {
        const parts = vb.trim().split(/\s+|,/);
        if (parts.length === 4) {
          svgEl.setAttribute('width',  parts[2]);
          svgEl.setAttribute('height', parts[3]);
        }
      }
    }

    viewerOverlay.hidden = false;
    document.body.style.overflow = 'hidden';

    // Set default bg
    viewerCanvas.setAttribute('data-bg', 'checker');
    viewerBgBtns.forEach(function (b) {
      const isActive = b.dataset.bg === 'checker';
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-pressed', String(isActive));
    });

    // Wait for browser to render before calculating dimensions
    requestAnimationFrame(function () {
      requestAnimationFrame(fitToView);
    });
  }

  function closeViewer() {
    viewerOverlay.hidden = true;
    document.body.style.overflow = '';
  }

  function applyTransform() {
    viewerSvgWrap.style.transform =
      'translate(' + vOffX + 'px, ' + vOffY + 'px) scale(' + vZoom + ')';
    viewerZoomLabel.textContent = Math.round(vZoom * 100) + '%';
  }

  function getSvgDimensions(svgEl) {
    // 1. Try viewBox
    const vb = svgEl.viewBox && svgEl.viewBox.baseVal;
    if (vb && vb.width && vb.height) return { w: vb.width, h: vb.height };
    // 2. Try width/height attributes (imagetracerjs sets these)
    const attrW = parseFloat(svgEl.getAttribute('width'));
    const attrH = parseFloat(svgEl.getAttribute('height'));
    if (attrW && attrH) return { w: attrW, h: attrH };
    // 3. Fallback to rendered size
    const rect = svgEl.getBoundingClientRect();
    return { w: rect.width || 400, h: rect.height || 400 };
  }

  function fitToView() {
    const svgEl = viewerSvgWrap.querySelector('svg');
    if (!svgEl) return;

    const { w: svgW, h: svgH } = getSvgDimensions(svgEl);
    const canvasRect = viewerCanvas.getBoundingClientRect();

    const scaleX = (canvasRect.width  * 0.85) / svgW;
    const scaleY = (canvasRect.height * 0.85) / svgH;
    vZoom = Math.min(scaleX, scaleY, 4);

    vOffX = (canvasRect.width  - svgW * vZoom) / 2;
    vOffY = (canvasRect.height - svgH * vZoom) / 2;

    applyTransform();
  }

  function zoomBy(delta, cx, cy) {
    const canvasRect = viewerCanvas.getBoundingClientRect();
    const pivotX = (cx !== undefined ? cx - canvasRect.left : canvasRect.width  / 2);
    const pivotY = (cy !== undefined ? cy - canvasRect.top  : canvasRect.height / 2);

    const prevZoom = vZoom;
    vZoom = Math.min(Math.max(vZoom * delta, 0.05), 20);

    vOffX = pivotX - (pivotX - vOffX) * (vZoom / prevZoom);
    vOffY = pivotY - (pivotY - vOffY) * (vZoom / prevZoom);

    applyTransform();
  }

  btnOpenViewer.addEventListener('click', openViewer);
  viewerClose.addEventListener('click', closeViewer);
  viewerZoomIn.addEventListener('click',  function () { zoomBy(1.25); });
  viewerZoomOut.addEventListener('click', function () { zoomBy(0.8); });
  viewerZoomFit.addEventListener('click', fitToView);

  viewerCanvas.addEventListener('wheel', function (e) {
    e.preventDefault();
    zoomBy(e.deltaY < 0 ? 1.12 : 0.89, e.clientX, e.clientY);
  }, { passive: false });

  viewerCanvas.addEventListener('mousedown', function (e) {
    if (e.button !== 0) return;
    vDragging    = true;
    vDragStartX  = e.clientX;
    vDragStartY  = e.clientY;
    vDragOriginX = vOffX;
    vDragOriginY = vOffY;
    viewerCanvas.classList.add('grabbing');
  });

  window.addEventListener('mousemove', function (e) {
    if (!vDragging) return;
    vOffX = vDragOriginX + (e.clientX - vDragStartX);
    vOffY = vDragOriginY + (e.clientY - vDragStartY);
    applyTransform();
  });

  window.addEventListener('mouseup', function () {
    if (!vDragging) return;
    vDragging = false;
    viewerCanvas.classList.remove('grabbing');
  });

  let vLastTouchX = 0;
  let vLastTouchY = 0;

  viewerCanvas.addEventListener('touchstart', function (e) {
    if (e.touches.length === 1) {
      vDragging   = true;
      vLastTouchX = e.touches[0].clientX;
      vLastTouchY = e.touches[0].clientY;
    }
  }, { passive: true });

  viewerCanvas.addEventListener('touchmove', function (e) {
    if (!vDragging || e.touches.length !== 1) return;
    e.preventDefault();
    vOffX += e.touches[0].clientX - vLastTouchX;
    vOffY += e.touches[0].clientY - vLastTouchY;
    vLastTouchX = e.touches[0].clientX;
    vLastTouchY = e.touches[0].clientY;
    applyTransform();
  }, { passive: false });

  viewerCanvas.addEventListener('touchend', function () { vDragging = false; });

  viewerBgBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      viewerBgBtns.forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      viewerCanvas.setAttribute('data-bg', btn.dataset.bg);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !viewerOverlay.hidden) closeViewer();
  });

  // ── SVG Optimizer ────────────────────────────────────────────
  function getPathArea(d) {
    // Extract all numbers from the path data
    const nums = (d.match(/-?[\d.]+/g) || []).map(Number);
    if (nums.length < 4) return 0;
    // Collect x/y pairs (even = x, odd = y)
    const xs = [], ys = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      xs.push(nums[i]);
      ys.push(nums[i + 1]);
    }
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    return w * h;
  }

  function optimizeSvg(svgStr, minArea) {
    const before = svgStr.length;
    let removed  = 0;
    let total    = 0;

    // 1. Remove degenerate paths (area below threshold)
    const optimized = svgStr.replace(/<path[^>]*\/>/g, function (tag) {
      total++;
      const dMatch = tag.match(/\bd="([^"]*)"/);
      if (!dMatch) return tag;
      const area = getPathArea(dMatch[1]);
      if (area < minArea) { removed++; return ''; }
      return tag;
    });

    // 2. Round coordinate numbers to 1 decimal place
    //    Matches numbers in d="..." and transform attributes
    const rounded = optimized.replace(/\bd="([^"]*)"/g, function (match, d) {
      const clean = d.replace(/-?[\d]+\.[\d]{2,}/g, function (n) {
        return parseFloat(parseFloat(n).toFixed(1));
      });
      return 'b d="' + clean + '"';
    // fix the 'b' prefix we accidentally added
    }).replace(/\bb d="/g, 'd="');

    // 3. Remove stroke attribute when identical to fill (redundant in imagetracer output)
    const deduped = rounded.replace(
      /\bstroke="(rgb\([^)]+\))"\s+stroke-width="1"\s+/g,
      function (match, strokeColor, offset, str) {
        const fillMatch = str.slice(Math.max(0, offset - 60), offset).match(/fill="([^"]+)"/);
        if (fillMatch && fillMatch[1] === strokeColor) return '';
        return match;
      }
    );

    // 4. Remove empty <g> elements
    const cleaned = deduped.replace(/<g[^>]*>\s*<\/g>/g, '');

    const after = cleaned.length;
    return {
      svg: cleaned,
      removed,
      total,
      beforeKb: (before / 1024).toFixed(1),
      afterKb:  (after  / 1024).toFixed(1),
      saving:   Math.round((1 - after / before) * 100),
    };
  }

  btnOptimize.addEventListener('click', function () {
    if (!currentSvg) return;

    // Threshold: remove paths with bounding box area < 4px²
    // Catches 1px triangles and other micro-artifacts
    const result = optimizeSvg(currentSvg, 4);

    if (result.removed === 0) {
      optimizeResultText.textContent = 'Already optimized — no degenerate paths found.';
      optimizeResult.hidden = false;
      return;
    }

    // Replace currentSvg with optimized version
    currentSvg = result.svg;

    // Update preview card
    svgContainer.innerHTML = currentSvg;
    resultMeta.textContent = result.afterKb + ' KB';

    // Show result banner
    optimizeResultText.textContent =
      'Removed ' + result.removed + ' of ' + result.total + ' paths · ' +
      result.beforeKb + ' KB → ' + result.afterKb + ' KB · ' +
      result.saving + '% smaller';
    optimizeResult.hidden = false;

    // Disable button so it's not applied twice
    btnOptimize.disabled = true;
    btnOptimize.style.opacity = '0.5';
  });

  // ── Error Helpers ────────────────────────────────────────────
  function showError(msg) {
    errorText.textContent = msg;
    errorBanner.hidden    = false;
  }

  function hideError() {
    errorBanner.hidden = true;
    errorText.textContent = '';
  }


  // ── potrace-wasm ready ───────────────────────────────────────
  document.addEventListener('potraceReady', function () {
    wasmReady              = true;
    btnConvert.disabled    = false;
    btnLabel.textContent   = 'Convert to SVG';
  });

  // ── Init ─────────────────────────────────────────────────────
  initTheme();
  applyPreset('illustration');

})();

