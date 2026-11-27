(() => {
  const $ = (selector) => document.querySelector(selector);
  const rows = $('#rows');
  const status = $('#status');
  const dialog = $('#details');
  const details = $('#detail-content');
  let page = 0;
  let count = 0;
  let request = 0;
  const pageSize = 25;
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const sessionDisplay = (item) => Array.isArray(item.session_labels) ? item.session_labels.join('; ') : item.session_label || '';

  function params(extra = {}) {
    const query = new URLSearchParams({ page: String(page), page_size: String(pageSize), search: $('#search').value.trim(), session_key: $('#session').value, accommodation_assistance: $('#accommodation').value, ...extra });
    for (const [key, value] of [...query.entries()]) if (!value) query.delete(key);
    return query;
  }

  async function api(query = params()) {
    const response = await fetch(`/api/admin-minister-registrations?${query}`, { credentials: 'same-origin', cache: 'no-store' });
    if (response.status === 401 || response.status === 403) { location.replace('/admin/login'); throw new Error('Your admin session has expired.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Unable to load minister registrations.');
    return data;
  }

  function render(items) {
    rows.innerHTML = items.map((item) => `<tr data-id="${escape(item.id)}"><td><strong>${escape(item.full_name)}</strong><br><small>${escape(item.registration_reference)}</small></td><td>${escape(item.email)}<br>${escape(item.phone)}</td><td>${escape(item.church_name)}<br>${escape(item.ministerial_position)}</td><td>${escape(item.city)}, ${escape(item.country)}</td><td>${escape(sessionDisplay(item))}</td><td>${escape(item.accommodation_assistance === 'not_sure' ? 'Not sure' : item.accommodation_assistance)}</td><td>${escape(item.status || 'pending')}</td><td>${escape(new Date(item.created_at).toLocaleString())}</td></tr>`).join('');
    rows.querySelectorAll('tr').forEach((row) => row.addEventListener('click', () => showDetails(row.dataset.id)));
  }

  async function load() {
    const current = ++request;
    status.textContent = 'Loading registrations…';
    try {
      const data = await api();
      if (current !== request) return;
      count = data.count || 0;
      render(data.registrations || []);
      $('#total').textContent = count.toLocaleString();
      $('#page-count').textContent = String((data.registrations || []).length);
      $('#page-info').textContent = count ? `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, count)} of ${count}` : 'No registrations found';
      $('#previous').disabled = page === 0;
      $('#next').disabled = (page + 1) * pageSize >= count;
      status.textContent = count ? '' : 'No minister registrations match these filters.';
    } catch (error) {
      if (current !== request) return;
      status.textContent = error.message;
      rows.replaceChildren();
    }
  }

  async function showDetails(id) {
    try {
      const data = await api(new URLSearchParams({ id }));
      const item = data.registration;
      const fields = [
        ['Name', item.full_name], ['Reference', item.registration_reference], ['Email', item.email], ['Phone', item.phone],
        ['Church / ministry', item.church_name], ['Position', item.ministerial_position], ['Location', `${item.city}, ${item.country}`],
        ['Gender', item.gender || 'Not provided'], ['Sessions', sessionDisplay(item)], ['Accompanying persons', item.accompanying_persons],
        ['Accommodation assistance', item.accommodation_assistance], ['Expected arrival', item.expected_arrival_date || 'Not provided'],
        ['Additional information', item.additional_information || 'None'], ['Status', item.status || 'pending'], ['Received', new Date(item.created_at).toLocaleString()]
      ];
      const currentStatus = ['pending', 'confirmed', 'declined'].includes(item.status) ? item.status : 'pending';
      details.innerHTML = `<div class="detail-grid">${fields.map(([label, value]) => `<div class="detail-item"><span>${escape(label)}</span><strong>${escape(value)}</strong></div>`).join('')}</div><div class="minister-status-update"><label for="minister-detail-status">Registration status<select id="minister-detail-status"><option value="pending"${currentStatus === 'pending' ? ' selected' : ''}>Awaiting review</option><option value="confirmed"${currentStatus === 'confirmed' ? ' selected' : ''}>Confirmed</option><option value="declined"${currentStatus === 'declined' ? ' selected' : ''}>Declined</option></select></label><button id="minister-status-save" class="button-secondary" type="button">Save status</button><p id="minister-status-feedback" class="message" role="status" aria-live="polite"></p></div>`;
      $('#minister-status-save').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        const feedback = $('#minister-status-feedback');
        button.disabled = true;
        feedback.textContent = 'Saving status…';
        try {
          const response = await fetch('/api/admin-minister-registrations', {
            method: 'PATCH',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, status: $('#minister-detail-status').value })
          });
          const result = await response.json().catch(() => ({}));
          if (response.status === 401 || response.status === 403) {
            location.replace('/admin/login');
            return;
          }
          if (!response.ok) throw new Error(result.error || 'Unable to update registration status.');
          feedback.textContent = 'Status updated.';
          await load();
        } catch (error) {
          feedback.textContent = error.message || 'Unable to update registration status.';
        } finally {
          button.disabled = false;
        }
      });
      dialog.showModal();
    } catch (error) { status.textContent = error.message; }
  }

  let searchTimer;
  $('#search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { page = 0; load(); }, 250); });
  $('#session').addEventListener('change', () => { page = 0; load(); });
  $('#accommodation').addEventListener('change', () => { page = 0; load(); });
  $('#refresh').addEventListener('click', load);
  $('#previous').addEventListener('click', () => { page = Math.max(0, page - 1); load(); });
  $('#next').addEventListener('click', () => { if ((page + 1) * pageSize < count) page += 1; load(); });
  $('#export').addEventListener('click', async () => {
    const button = $('#export'); button.disabled = true; status.textContent = 'Preparing CSV…';
    try {
      const query = params({ export: 'csv' });
      const response = await fetch(`/api/admin-minister-registrations?${query}`, { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 401 || response.status === 403) { location.replace('/admin/login'); return; }
      if (!response.ok) throw new Error('Unable to export minister registrations.');
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'pastors-ministers-registrations.csv'; link.click(); URL.revokeObjectURL(url); status.textContent = '';
    } catch (error) { status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  $('#logout').addEventListener('click', async () => { try { await fetch('/api/admin-auth', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'logout' }) }); } finally { location.replace('/admin/login'); } });
  $('#close-details').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  load();
})();
