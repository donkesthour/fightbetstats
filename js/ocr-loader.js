(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.UFC_OcrLoader = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const TESSERACT_SRC = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
  const SCRIPT_ID = 'tesseract-ocr-engine';
  let loadPromise = null;

  function getLoadedEngine() {
    return root.Tesseract && typeof root.Tesseract.recognize === 'function'
      ? root.Tesseract
      : null;
  }

  function loadTesseract(options = {}) {
    const loadedEngine = getLoadedEngine();
    if (loadedEngine) return Promise.resolve(loadedEngine);
    if (loadPromise) return loadPromise;

    const documentRef = options.documentRef || root.document;
    if (!documentRef || !documentRef.createElement) {
      return Promise.reject(new Error('OCR requires a browser document to load its engine.'));
    }

    loadPromise = new Promise((resolve, reject) => {
      const finishLoading = () => {
        const engine = getLoadedEngine();
        if (engine) {
          loadPromise = null;
          resolve(engine);
        }
        else reject(new Error('The OCR engine loaded but was unavailable.'));
      };
      const failLoading = () => {
        if (script) {
          script.dataset.ocrLoadState = 'failed';
          if (script.parentNode && script.parentNode.removeChild) script.parentNode.removeChild(script);
        }
        reject(new Error('Unable to download the OCR engine. Check your internet connection and try again.'));
      };
      let script = documentRef.getElementById && documentRef.getElementById(SCRIPT_ID);

      if (script && script.dataset.ocrLoadState === 'failed') {
        if (script.parentNode && script.parentNode.removeChild) script.parentNode.removeChild(script);
        script = null;
      }
      if (script) {
        script.addEventListener('load', finishLoading, { once: true });
        script.addEventListener('error', failLoading, { once: true });
        return;
      }

      script = documentRef.createElement('script');
      script.id = SCRIPT_ID;
      script.src = options.src || TESSERACT_SRC;
      script.async = true;
      script.dataset.ocrEngine = 'tesseract';
      script.dataset.ocrLoadState = 'loading';
      script.onload = finishLoading;
      script.onerror = failLoading;

      const target = documentRef.head || documentRef.body || documentRef.documentElement;
      if (!target || !target.appendChild) {
        reject(new Error('Unable to add the OCR engine to this page.'));
        return;
      }
      target.appendChild(script);
    }).catch(error => {
      loadPromise = null;
      throw error;
    });

    return loadPromise;
  }

  return {
    SCRIPT_ID,
    TESSERACT_SRC,
    loadTesseract
  };
});
