function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}
function formatDate(ts) {
  try {
    const d = new Date(ts);
    return d.toLocaleString();
  } catch (_) {
    return String(ts || '');
  }
}
function smoothScrollTo(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const header = document.querySelector('.site-header');
  const offset = header ? header.offsetHeight + 12 : 12;
  const y = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top: y, behavior: 'smooth' });
  el.classList.add('highlight');
  setTimeout(() => el.classList.remove('highlight'), 1400);
}
function attachStaticUI() {
  const grid = document.querySelector('.dashboard-grid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const card = e.target.closest('.nav-card[href^="#"]');
      if (!card) return;
      e.preventDefault();
      const href = card.getAttribute('href') || '';
      const anchor = href.startsWith('#') ? href.slice(1) : '';
      const id = anchor === 'recent-orders' ? 'panel-orders' : `panel-${anchor}`;
      const panel = document.getElementById(id);
      const all = document.querySelectorAll('.nav-panel');
      if (!panel) return;
      if (panel.classList.contains('open')) {
        panel.classList.remove('open', 'highlight');
        return;
      }
      all.forEach(p => { if (p !== panel) p.classList.remove('open', 'highlight'); });
      panel.classList.add('open', 'highlight');
      setTimeout(() => panel.classList.remove('highlight'), 1200);
    });
  }
  const editBtn = document.getElementById('edit-profile');
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      try {
        const client = window.supabaseClient;
        if (client) {
          const u = (await client.auth.getUser()).data.user;
          if (u) {
            const panel = document.getElementById('panel-addresses');
            const all = document.querySelectorAll('.nav-panel');
            if (panel) {
              if (panel.classList.contains('open')) {
                panel.classList.remove('open', 'highlight');
              } else {
                all.forEach(p => { if (p !== panel) p.classList.remove('open', 'highlight'); });
                panel.classList.add('open', 'highlight');
                setTimeout(() => panel.classList.remove('highlight'), 1200);
              }
            }
            return;
          }
        }
      } catch (_) {}
      try {
        const last = localStorage.getItem('last_checkout_email') || '';
        if (last) {
          const panel = document.getElementById('panel-addresses');
          const all = document.querySelectorAll('.nav-panel');
          if (panel) {
            if (panel.classList.contains('open')) {
              panel.classList.remove('open', 'highlight');
            } else {
              all.forEach(p => { if (p !== panel) p.classList.remove('open', 'highlight'); });
              panel.classList.add('open', 'highlight');
              setTimeout(() => panel.classList.remove('highlight'), 1200);
            }
          }
          return;
        }
      } catch (_) {}
      window.location.href = 'login.html';
    });
  }
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      const client = window.supabaseClient;
      if (!client) return;
      try {
        await client.auth.signOut();
      } catch (_) {}
      try { localStorage.removeItem('last_checkout_email'); } catch (_) {}
      const ring = logoutBtn.querySelector('.spin-ring');
      if (ring) ring.remove();
      window.location.href = 'index.html';
    });
  }
}
async function loadProfile() {
  const client = window.supabaseClient;
  if (!client) return;
  const nameEl = document.getElementById('profile-name');
  const emailEl = document.getElementById('profile-email');
  const avatarEl = document.getElementById('avatar-initials');
  const addrEl = document.getElementById('addresses-list');
  const ordersListEl = document.getElementById('orders-list');
  let email = '';
  try {
    const { data } = await client.auth.getUser();
    const user = data && data.user ? data.user : null;
    email = user && user.email ? user.email : '';
  } catch (_) {}
  if (!email) {
    try {
      const last = localStorage.getItem('last_checkout_email') || '';
      if (!last) {
        if (nameEl) nameEl.textContent = '—';
        if (emailEl) emailEl.textContent = 'Not signed in';
        if (avatarEl) avatarEl.textContent = '•';
        if (addrEl) addrEl.textContent = '';
        if (ordersListEl) ordersListEl.innerHTML = '<p class="empty-notice">No orders.</p>';
        return;
      }
      email = last;
      if (emailEl) emailEl.textContent = email;
      if (nameEl) nameEl.textContent = email.split('@')[0];
      if (avatarEl) avatarEl.textContent = (email[0] || '•').toUpperCase();
    } catch (_) {
      if (nameEl) nameEl.textContent = '—';
      if (emailEl) emailEl.textContent = 'Not signed in';
      if (avatarEl) avatarEl.textContent = '•';
      if (addrEl) addrEl.textContent = '';
      if (ordersListEl) ordersListEl.innerHTML = '<p class="empty-notice">No orders.</p>';
      return;
    }
  }
  try {
    const { data } = await client.auth.getUser();
    const user = data && data.user ? data.user : null;
    const full =
      (user && user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) ||
      '';
    const displayName = full || (email ? email.split('@')[0] : '');
    if (nameEl) nameEl.textContent = displayName || '—';
    if (emailEl) emailEl.textContent = email || '—';
    if (avatarEl) avatarEl.textContent = (displayName[0] || email[0] || '•').toUpperCase();
  } catch (_) {
    if (nameEl) nameEl.textContent = email ? email.split('@')[0] : '—';
    if (emailEl) emailEl.textContent = email || '—';
    if (avatarEl) avatarEl.textContent = (email[0] || '•').toUpperCase();
  }
  let addresses = [];
  try {
    const u = (await client.auth.getUser()).data.user;
    if (u) {
      const { data } = await client.from('addresses').select('*').eq('user_id', u.id).order('created_at', { ascending: false });
      addresses = Array.isArray(data) ? data : [];
    } else {
      const { data } = await client.from('addresses').select('*').eq('email', email).order('created_at', { ascending: false });
      addresses = Array.isArray(data) ? data : [];
    }
  } catch (_) {}
  if (addrEl) {
    if (!addresses.length) {
      addrEl.textContent = 'No saved addresses.';
    } else {
      addrEl.innerHTML = addresses.map((a) => {
        const lines = [a.line1, a.line2, a.line3, a.line4].filter(Boolean).join(', ');
        const city = a.city || '';
        const state = a.state || '';
        const pc = a.postcode || '';
        const country = a.country || '';
        const badge = a.is_default ? '<span class="badge" style="margin-left:8px;">Default</span>' : '';
        return `<div class="mini-card addr-card" 
          data-id="${a.id}"
          data-line1="${a.line1 || ''}"
          data-line2="${a.line2 || ''}"
          data-line3="${a.line3 || ''}"
          data-line4="${a.line4 || ''}"
          data-city="${city}"
          data-state="${state}"
          data-postcode="${pc}"
          data-country="${country}">
          <div class="mini-title">${lines}${badge}</div>
          <div class="mini-desc">${city} ${state} ${pc} ${country}</div>
          <div class="addr-actions">
            <button class="btn btn-outline addr-edit" type="button">Edit</button>
            <button class="btn btn-outline addr-delete" type="button">Delete</button>
          </div>
        </div>`;
      }).join('');
    }
  }
  let orders = [];
  try {
    const u = (await client.auth.getUser()).data.user;
    if (u) {
      const { data } = await client.from('orders').select('id,total_amount,status,created_at').eq('user_id', u.id).order('created_at', { ascending: false });
      orders = Array.isArray(data) ? data : [];
    } else {
      const { data } = await client.from('orders').select('id,total_amount,status,created_at').eq('customer_email', email).order('created_at', { ascending: false });
      orders = Array.isArray(data) ? data : [];
    }
  } catch (_) {}
  if (ordersListEl) {
    if (!orders.length) {
      ordersListEl.innerHTML = '<p class="empty-notice">No orders.</p>';
    } else {
      ordersListEl.innerHTML = orders.map((o) => {
        const total = formatRM(Number(o.total_amount || 0));
        const status = String(o.status || 'pending');
        const date = formatDate(o.created_at);
        const link = `order-status.html?id=${encodeURIComponent(o.id)}`;
        const statusClass =
          status === 'paid' ? 'status-paid' :
          status === 'shipped' ? 'status-shipped' :
          status === 'delivered' ? 'status-delivered' : 'status-pending';
        return `<div class="order-item">
          <div class="order-top">
            <span class="order-id">${o.id}</span>
            <span class="order-date">${date}</span>
            <span class="status-badge ${statusClass}">${status}</span>
          </div>
          <div class="order-bottom">
            <div class="order-total">${total}</div>
            <a class="btn btn-outline view-btn" href="${link}">View Details</a>
          </div>
        </div>`;
      }).join('');
    }
  }
}
attachStaticUI();
function bindAddressActions() {
  const list = document.getElementById('addresses-list');
  if (!list) return;
  list.addEventListener('click', async (e) => {
    const editBtn = e.target.closest('.addr-edit');
    const delBtn = e.target.closest('.addr-delete');
    const card = e.target.closest('.addr-card');
    if (!card) return;
    const id = card.getAttribute('data-id');
    const c = window.supabaseClient;
    if (editBtn) {
      e.preventDefault();
      const form = card.querySelector('.addr-edit-form');
      if (form) {
        form.style.display = form.style.display === 'none' ? 'grid' : 'none';
        return;
      }
      const html = `
        <div class="addr-edit-form">
          <input type="text" class="addr-input" name="line1" placeholder="Line 1" value="${card.getAttribute('data-line1') || ''}">
          <input type="text" class="addr-input" name="line2" placeholder="Line 2" value="${card.getAttribute('data-line2') || ''}">
          <input type="text" class="addr-input" name="city" placeholder="City" value="${card.getAttribute('data-city') || ''}">
          <input type="text" class="addr-input" name="state" placeholder="State" value="${card.getAttribute('data-state') || ''}">
          <input type="text" class="addr-input" name="postcode" placeholder="Postcode" value="${card.getAttribute('data-postcode') || ''}">
          <input type="text" class="addr-input" name="country" placeholder="Country" value="${card.getAttribute('data-country') || ''}">
          <div class="addr-edit-actions">
            <button type="button" class="btn btn-primary addr-save">Save</button>
            <button type="button" class="btn btn-outline addr-cancel">Cancel</button>
          </div>
        </div>`;
      card.insertAdjacentHTML('beforeend', html);
      const newForm = card.querySelector('.addr-edit-form');
      newForm.addEventListener('click', async (ev) => {
        const save = ev.target.closest('.addr-save');
        const cancel = ev.target.closest('.addr-cancel');
        if (cancel) {
          const r = cancel.querySelector('.spin-ring');
          if (r) r.remove();
          newForm.remove();
          return;
        }
        if (save) {
          if (!c) return;
          const payload = {
            line1: newForm.querySelector('input[name="line1"]').value || null,
            line2: newForm.querySelector('input[name="line2"]').value || null,
            city: newForm.querySelector('input[name="city"]').value || null,
            state: newForm.querySelector('input[name="state"]').value || null,
            postcode: newForm.querySelector('input[name="postcode"]').value || null,
            country: newForm.querySelector('input[name="country"]').value || null
          };
          const { error } = await c.from('addresses').update(payload).eq('id', id);
          if (error) {
            alert('Unable to save address.');
            const r = save.querySelector('.spin-ring');
            if (r) r.remove();
            return;
          }
          const r = save.querySelector('.spin-ring');
          if (r) r.remove();
          loadProfile();
        }
      });
      return;
    }
    if (delBtn) {
      e.preventDefault();
      if (!c) return;
      const ok = confirm('Delete this address?');
      if (!ok) return;
      const { error } = await c.from('addresses').delete().eq('id', id);
      if (error) {
        alert('Unable to delete address.');
        const r = delBtn.querySelector('.spin-ring');
        if (r) r.remove();
        return;
      }
      const r = delBtn.querySelector('.spin-ring');
      if (r) r.remove();
      card.remove();
    }
  });
}
bindAddressActions();
if (window.supabaseClient) {
  loadProfile();
} else {
  window.addEventListener('supabase-ready', loadProfile);
}
