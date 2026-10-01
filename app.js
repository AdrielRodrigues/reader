(function () {
  "use strict";

  const STORAGE_KEY = "reader.codes";
  const REPEAT_WINDOW_MS = 2000;
  const HISTORY_MAX = 20;

  const $ = (id) => document.getElementById(id);
  const els = {
    result: $("result"), toggle: $("toggle"), status: $("status"),
    manual: $("manual"), manualInput: $("manual-input"),
    codes: $("codes"), count: $("count"), save: $("save"), reset: $("reset"),
    history: $("history"),
  };

  // Compara ignorando espaços e zeros à esquerda, para que um UPC-A (12 dígitos)
  // case com o mesmo código lido como EAN-13 (com 0 na frente).
  function normalize(code) {
    const s = String(code).trim();
    return /^\d+$/.test(s) ? s.replace(/^0+(?=\d)/, "") : s;
  }

  function parseList(text) {
    return text.split(/[\r\n,;]+/).map((s) => s.trim()).filter(Boolean);
  }

  function loadCodes() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) return parseList(saved);
    } catch (_) { /* storage indisponível */ }
    return window.DEFAULT_CODES.slice();
  }

  let valid = new Set();

  function setCodes(list) {
    valid = new Set(list.map(normalize));
    els.codes.value = list.join("\n");
    els.count.textContent = "(" + valid.size + ")";
  }

  function check(raw) {
    const code = String(raw).trim();
    if (!code) return;
    const found = valid.has(normalize(code));
    els.result.className = "result " + (found ? "ok" : "bad");
    els.result.textContent = (found ? "✔ Válido: " : "✘ Não encontrado: ") + code;
    addHistory(code, found);
    if (found && navigator.vibrate) navigator.vibrate(100);
  }

  function addHistory(code, found) {
    const li = document.createElement("li");
    const c = document.createElement("span");
    c.textContent = code;
    const r = document.createElement("span");
    r.className = found ? "ok" : "bad";
    r.textContent = found ? "válido" : "inválido";
    li.append(c, r);
    els.history.prepend(li);
    while (els.history.children.length > HISTORY_MAX) els.history.lastChild.remove();
  }

  // --- Scanner ---------------------------------------------------------------
  let scanner = null;
  let running = false;
  let last = { text: "", at: 0 };

  function onScan(text) {
    const now = Date.now();
    if (text === last.text && now - last.at < REPEAT_WINDOW_MS) { last.at = now; return; }
    last = { text, at: now };
    check(text);
  }

  async function start() {
    if (!window.isSecureContext) {
      els.status.textContent = "A câmera exige HTTPS (ou localhost).";
      return;
    }
    const F = Html5QrcodeSupportedFormats;
    scanner = scanner || new Html5Qrcode("scanner", {
      formatsToSupport: [
        F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E, F.CODE_128, F.CODE_39,
        F.CODE_93, F.ITF, F.CODABAR, F.QR_CODE,
      ],
      useBarCodeDetectorIfSupported: true,
    });
    els.status.textContent = "Iniciando câmera…";
    const config = {
      fps: 10,
      // Área larga e baixa, adequada a códigos de barras lineares.
      qrbox: (w, h) => ({
        width: Math.max(50, Math.floor(w * 0.85)),
        height: Math.max(50, Math.floor(Math.min(h, w) * 0.4)),
      }),
    };
    const noop = () => {}; // erro por frame sem código: ignorar
    try {
      try {
        await scanner.start({ facingMode: "environment" }, config, onScan, noop);
      } catch (err) {
        if (isPermissionError(err)) throw err;
        // Sem câmera traseira (ex.: notebook): tenta a primeira câmera disponível.
        const cams = await Html5Qrcode.getCameras();
        if (!cams.length) throw err;
        await scanner.start(cams[cams.length - 1].id, config, onScan, noop);
      }
      running = true;
      els.toggle.textContent = "Parar câmera";
      els.status.textContent = "Aponte a câmera para o código de barras.";
    } catch (err) {
      els.status.textContent = describeError(err);
    }
  }

  function isPermissionError(err) {
    return /NotAllowed|Permission/i.test(String((err && err.name) || "") + " " + String(err));
  }

  function describeError(err) {
    const raw = String((err && (err.message || err.name)) || err);
    if (isPermissionError(err)) {
      return "Permissão da câmera negada. Libere o acesso à câmera nas configurações do site e recarregue. (" + raw + ")";
    }
    if (/NotFound|no camera|Requested device not found/i.test(raw)) {
      return "Nenhuma câmera encontrada neste dispositivo. (" + raw + ")";
    }
    if (/NotReadable|in use|Could not start video/i.test(raw)) {
      return "A câmera está em uso por outro app ou aba. Feche-o e tente de novo. (" + raw + ")";
    }
    return "Não foi possível abrir a câmera: " + raw;
  }

  async function stop() {
    try { await scanner.stop(); scanner.clear(); } catch (_) {}
    running = false;
    els.toggle.textContent = "Iniciar câmera";
    els.status.textContent = "";
  }

  window.addEventListener("error", (e) => { els.status.textContent = "Erro: " + e.message; });
  window.addEventListener("unhandledrejection", (e) => { els.status.textContent = describeError(e.reason); });

  els.toggle.addEventListener("click", () => (running ? stop() : start()));

  // --- Entrada manual e edição da lista -------------------------------------
  els.manual.addEventListener("submit", (e) => {
    e.preventDefault();
    check(els.manualInput.value);
    els.manualInput.select();
  });

  els.save.addEventListener("click", () => {
    const list = parseList(els.codes.value);
    try { localStorage.setItem(STORAGE_KEY, list.join("\n")); } catch (_) {}
    setCodes(list);
  });

  els.reset.addEventListener("click", () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
    setCodes(window.DEFAULT_CODES.slice());
  });

  setCodes(loadCodes());
})();
