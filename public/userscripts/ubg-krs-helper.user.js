// ==UserScript==
// @name         UBG SISKA KRS - Salin Semua Kode MK
// @namespace    https://ubgschedule.vercel.app/
// @version      1.0.0
// @description  Ekstrak dan salin seluruh Kode Mata Kuliah dari halaman KRS SISKA UBG ke clipboard dalam 1 klik untuk UBG Schedule.
// @author       UBG Schedule Team
// @match        https://siska.ubg.ac.id/mahasiswa/krs*
// @icon         https://siska.ubg.ac.id/assets/gambar/favicon-96x96.png
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  function extractCourseCodes() {
    const table = document.querySelector('table.demo-table');
    if (!table) return [];

    const rows = table.querySelectorAll('tbody tr');
    const codes = [];

    rows.forEach((row) => {
      if (row.classList.contains('th-color') || row.innerText.includes('Jumlah')) return;

      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;

      const rawCode = cells[1].innerText.trim();
      const cleanCode = rawCode.replace(/\s+/g, '').toUpperCase();

      if (/^[A-Z0-9]{6,12}$/.test(cleanCode)) {
        codes.push(cleanCode);
      }
    });

    return [...new Set(codes)];
  }

  function showNotification(count) {
    const toast = document.createElement('div');
    toast.innerHTML = [
      '<div style="position: fixed; bottom: 24px; right: 24px; z-index: 999999; background: #00A86B; color: #FFFFFF; padding: 14px 20px; border: 2px solid #000000; box-shadow: 4px 4px 0px #000000; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 10px;">',
      '<i class="fa fa-check-circle" style="font-size: 18px;"></i>',
      '<div>',
      '<div style="font-size: 14px; font-weight: 900; text-transform: uppercase;">' + count + ' Kode MK Tersalin!</div>',
      '<div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">Siap ditempel langsung di UBG Schedule.</div>',
      '</div>',
      '</div>'
    ].join('');
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    return Promise.resolve();
  }

  function injectButton() {
    if (document.getElementById('btn-ubg-copy-krs')) return;

    const actionContainer = document.querySelector('.text-right');
    const table = document.querySelector('table.demo-table');
    if (!actionContainer || !table) return;

    const codes = extractCourseCodes();
    if (codes.length === 0) return;

    const btn = document.createElement('button');
    btn.id = 'btn-ubg-copy-krs';
    btn.type = 'button';
    btn.className = 'btn btn-success btn-xs';
    btn.style.marginLeft = '6px';
    btn.style.fontWeight = 'bold';
    btn.style.boxShadow = '1px 1px 2px rgba(0,0,0,0.2)';
    btn.innerHTML = '<i class="fa fa-copy"></i> Salin Semua Kode MK (' + codes.length + ')';

    btn.addEventListener('click', () => {
      const payload = codes.join('\n');
      copyToClipboard(payload).then(() => {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa fa-check"></i> ' + codes.length + ' Tersalin!';
        btn.className = 'btn btn-warning btn-xs';

        showNotification(codes.length);

        setTimeout(() => {
          btn.innerHTML = originalHtml;
          btn.className = 'btn btn-success btn-xs';
        }, 2500);
      });
    });

    actionContainer.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectButton);
  } else {
    injectButton();
  }

  const observer = new MutationObserver(() => {
    injectButton();
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
