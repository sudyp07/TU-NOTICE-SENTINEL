const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

export function maskEmail(email = '') {
  const [name, domain] = String(email).split('@');
  if (!name || !domain) return 'hidden';
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(2, name.length - 2))}@${domain}`;
}

export function buildEmail(notices, firstRun = false) {
  const subject = firstRun
    ? `TU Notice Sentinel — Latest ${notices.length} Notices`
    : `TU Notice Sentinel — ${notices.length} New Notice${notices.length === 1 ? '' : 's'}`;
  const rows = notices.map((notice, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(notice.bsDate || notice.adDate || 'Date unavailable')}</td>
      <td>${escapeHtml(notice.title)}</td>
      <td><a href="${escapeHtml(notice.url)}">Open notice</a></td>
    </tr>`).join('');
  const text = notices
    .map((notice, index) => `${index + 1}. ${notice.bsDate || notice.adDate || 'Date unavailable'} | ${notice.title}\n${notice.url}`)
    .join('\n\n');

  return {
    subject,
    html: `<h2>🎓 TU Notice Sentinel</h2><p>${firstRun ? 'Initial notice digest' : 'New TU notices detected'}</p><table border="1" cellpadding="8"><tr><th>#</th><th>Date</th><th>Notice</th><th>Link</th></tr>${rows}</table>`,
    text,
  };
}
