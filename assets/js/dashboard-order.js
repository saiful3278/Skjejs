function getClient() {
  return window.supabaseClient;
}

function timeAgo(s) {
  try {
    const d = new Date(s);
    const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
    if (!Number.isFinite(diffSec)) return '';
    if (diffSec < 60) return 'Just now';
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min} minute${min !== 1 ? 's' : ''} ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr !== 1 ? 's' : ''} ago`;
    const day = Math.floor(hr / 24);
    return `${day} day${day !== 1 ? 's' : ''} ago`;
  } catch (_) {
    return String(s || '');
  }
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(text || '');
}

async function ensureSupabase(timeoutMs = 3000) {
  const start = Date.now();
  while (!window.supabaseClient && Date.now() - start < timeoutMs) {
    await new Promise((r) => setTimeout(r, 200));
  }
  return window.supabaseClient || null;
}

async function loadOrderDetail() {
  const c = await ensureSupabase(3000);
  if (!c) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;
  const { data: order, error: orderErr } = await c.from('orders').select('*').eq('id', id).single();
  if (orderErr || !order) return;
  setText('order-id', order.id);
  setText('order-date', timeAgo(order.created_at));
  setText('order-total', formatRM(Number(order.total_amount || 0)));
  setText('order-status', String(order.status || 'pending'));
  setText('customer-email', String(order.customer_email || '—'));
  let payStatus = 'pending';
  try {
    const { data: payments } = await c.from('payments').select('status').eq('order_id', id).order('created_at', { ascending: false }).limit(1);
    if (Array.isArray(payments) && payments.length) {
      payStatus = payments[0].status || 'pending';
    }
  } catch (_) {}
  setText('payment-status', String(payStatus));
  const { data: items, error: itemsErr } = await c.from('order_items').select('product_id,quantity,unit_price').eq('order_id', id).order('created_at', { ascending: true });
  const tbody = document.querySelector('#itemsTable tbody');
  if (itemsErr || !tbody) return;
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4">No items.</td></tr>';
    return;
  }
  const ids = [...new Set(list.map((it) => it.product_id).filter((v) => v !== null && v !== undefined))];
  let names = {};
  if (ids.length) {
    try {
      const { data: prods } = await c.from('products').select('id,name').in('id', ids);
      (prods || []).forEach((p) => { names[String(p.id)] = String(p.name || 'Product'); });
    } catch (_) {}
  }
  tbody.innerHTML = '';
  list.forEach((it) => {
    const name = names[String(it.product_id)] || `Product #${it.product_id}`;
    const qty = Number(it.quantity || 1);
    const unit = Number(it.unit_price || 0);
    const line = qty * unit;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${name}</td>
      <td>${qty}</td>
      <td>${formatRM(unit)}</td>
      <td>${formatRM(line)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function markPaid() {
  const c = await ensureSupabase(3000);
  if (!c) { showToast('Service not ready', 'error'); return; }
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;
  const btn = document.getElementById('btn-mark-paid');
  addSpinner(btn);
  const { data: payments } = await c.from('payments').select('id,status').eq('order_id', id).order('created_at', { ascending: false }).limit(1);
  if (Array.isArray(payments) && payments.length) {
    const pid = payments[0].id;
    const { error } = await c.from('payments').update({ status: 'paid' }).eq('id', pid);
    if (error) { showToast('Unable to update payment', 'error'); removeSpinner(btn); return; }
  } else {
    const { error } = await c.from('payments').insert({ order_id: id, status: 'paid', amount: 0, currency: 'RM', provider: 'duitnow' });
    if (error) { showToast('Unable to create payment', 'error'); removeSpinner(btn); return; }
  }
  const { error: err2 } = await c.from('orders').update({ status: 'paid' }).eq('id', id);
  if (err2) { showToast('Unable to update order', 'error'); removeSpinner(btn); return; }
  await loadOrderDetail();
  removeSpinner(btn);
  showToast('Marked paid', 'success');
}

async function markShipped() {
  const c = await ensureSupabase(3000);
  if (!c) { showToast('Service not ready', 'error'); return; }
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;
  const btn = document.getElementById('btn-mark-shipped');
  addSpinner(btn);
  const { error } = await c.from('orders').update({ status: 'shipped' }).eq('id', id);
  if (error) { showToast('Unable to update order', 'error'); removeSpinner(btn); return; }
  await loadOrderDetail();
  removeSpinner(btn);
  showToast('Marked shipped', 'success');
}

async function markDelivered() {
  const c = await ensureSupabase(3000);
  if (!c) { showToast('Service not ready', 'error'); return; }
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;
  const btn = document.getElementById('btn-mark-delivered');
  addSpinner(btn);
  const { error } = await c.from('orders').update({ status: 'delivered' }).eq('id', id);
  if (error) { showToast('Unable to update order', 'error'); removeSpinner(btn); return; }
  await loadOrderDetail();
  removeSpinner(btn);
  showToast('Marked delivered', 'success');
}

async function cancelOrder() {
  const c = await ensureSupabase(3000);
  if (!c) { showToast('Service not ready', 'error'); return; }
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;
  const btn = document.getElementById('btn-cancel-order');
  addSpinner(btn);
  const { error } = await c.from('orders').update({ status: 'cancelled' }).eq('id', id);
  if (error) { showToast('Unable to update order', 'error'); removeSpinner(btn); return; }
  await loadOrderDetail();
  removeSpinner(btn);
  showToast('Order cancelled', 'success');
}

function attachControls() {
  const paidBtn = document.getElementById('btn-mark-paid');
  const shipBtn = document.getElementById('btn-mark-shipped');
  const delivBtn = document.getElementById('btn-mark-delivered');
  const cancelBtn = document.getElementById('btn-cancel-order');
  if (paidBtn) paidBtn.addEventListener('click', markPaid);
  if (shipBtn) shipBtn.addEventListener('click', markShipped);
  if (delivBtn) delivBtn.addEventListener('click', markDelivered);
  if (cancelBtn) cancelBtn.addEventListener('click', cancelOrder);
}

function addSpinner(btn) {
  if (!btn) return;
  btn.disabled = true;
  const ring = document.createElement('span');
  ring.className = 'spin-ring';
  ring.style.marginLeft = '8px';
  ring.setAttribute('aria-hidden', 'true');
  ring.dataset.spinner = 'true';
  btn.appendChild(ring);
}

function removeSpinner(btn) {
  if (!btn) return;
  btn.disabled = false;
  const ring = btn.querySelector('span[data-spinner="true"]');
  if (ring) ring.remove();
}
function showToast(text, type) {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.className = 'toast-wrap';
    document.body.appendChild(wrap);
  }
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : 'success'}`;
  el.textContent = String(text || '');
  wrap.appendChild(el);
  setTimeout(() => { el.remove(); }, 2500);
}
document.addEventListener('DOMContentLoaded', () => {
  attachControls();
  if (window.supabaseClient) {
    loadOrderDetail();
  } else {
    window.addEventListener('supabase-ready', loadOrderDetail);
  }
});
