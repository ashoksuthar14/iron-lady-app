(() => {
  const summaryEl = document.getElementById('teacher-summary');
  const refreshBtn = document.getElementById('refresh-summary-btn');
  const downloadPdfBtn = document.getElementById('download-pdf-btn');
  const downloadDocxBtn = document.getElementById('download-docx-btn');

  async function loadLatest() {
    try {
      summaryEl.innerHTML = '<span class="text-muted">Loading...</span>';
      const res = await Api.latestSummary();
      if (res && res.summary) {
        summaryEl.textContent = res.summary;
      } else {
        summaryEl.innerHTML = '<span class="text-muted">No summary available yet.</span>';
      }
    } catch (e) {
      summaryEl.innerHTML = `<span class="text-danger">${e.message}</span>`;
    }
  }

  refreshBtn.addEventListener('click', loadLatest);
  downloadPdfBtn.addEventListener('click', () => Api.download('pdf'));
  downloadDocxBtn.addEventListener('click', () => Api.download('docx'));

  loadLatest();
})();


