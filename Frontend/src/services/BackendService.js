/**
 * BackendService.js
 * C# Backend ile WebView2 üzerinden iletişim
 */

export const BackendService = {
  /**
   * Frontend → Backend: Klasör Tarama Komutu
   * @param {string} folderPath - Taranacak klasör yolu
   * @param {Function} onComplete - Tarama bitince çağrılacak callback
   */
  scanFolder: async (folderPath, onComplete) => {
    const command = {
      command: "scanFolder",
      data: { path: folderPath }
    };
    
    if (window.chrome?.webview) {
      window.chrome.webview.postMessage(command);
      // Backend'den yanıt bekle
      window.addEventListener('backendMessage', (event) => {
        if (event.detail.type === 'scanComplete') {
          onComplete(JSON.parse(event.detail.message));
        }
      });
    } else {
      console.error("WebView2 çevresi bulunamadı!");
    }
  },

  /**
   * Frontend → Backend: PDF Export
   */
  exportPdf: () => {
    const command = { command: "exportPdf", data: {} };
    if (window.chrome?.webview) {
      window.chrome.webview.postMessage(command);
    }
  },

  /**
   * Frontend → Backend: Excel/CSV Export
   */
  exportExcel: () => {
    const command = { command: "exportExcel", data: {} };
    if (window.chrome?.webview) {
      window.chrome.webview.postMessage(command);
    }
  },

  /**
   * Backend'den gelen mesajları dinle
   */
  onBackendMessage: (callback) => {
    window.addEventListener('backendMessage', (event) => {
      callback(event.detail);
    });
  }
};
