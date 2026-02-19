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

function renderRow(tbody, order, payStatus) {
  const tr = document.createElement('tr');
  const os = String(order.status || 'pending').toLowerCase();
  const ps = String(payStatus || '').toLowerCase();
  let displayStatus = os;
  if (os === 'cancelled') {
    displayStatus = 'Cancelled';
  } else if (os === 'delivered') {
    displayStatus = 'Delivered';
  } else if (os === 'shipped') {
    displayStatus = 'Shipped';
  } else if (os === 'paid') {
    displayStatus = 'Paid';
  } else {
    // pending or unknown: reflect payment state to avoid confusion
    displayStatus = ps === 'paid' ? 'Paid' : 'Pending Payment';
  }
  tr.innerHTML = `
    <td style="font-size:12px;">${order.id}</td>
    <td class="col-shrink">${timeAgo(order.created_at)}</td>
    <td>${displayStatus}</td>
    <td><button class="btn btn-primary btn-view" data-id="${order.id}">View</button></td>
  `;
  tbody.appendChild(tr);
}

async function loadOrders() {
  const c = getClient();
  if (!c) return;
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4"><span class="spin-ring"></span></td></tr>';
  const { data: orders, error } = await c.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) {
    tbody.innerHTML = '<tr><td colspan="4">Unable to load orders.</td></tr>';
    return;
  }
  tbody.innerHTML = '';
  let totalCount = 0;
  let paidCount = 0;
  let shippedCount = 0;
  let deliveredCount = 0;
  let cancelledCount = 0;
  let payPendingCount = 0;
  for (const o of (orders || [])) {
    totalCount += 1;
    let pay = 'pending';
    try {
      const { data: payments } = await c.from('payments').select('status').eq('order_id', o.id).order('created_at', { ascending: false }).limit(1);
      if (Array.isArray(payments) && payments.length) {
        pay = payments[0].status || 'pending';
      }
    } catch (_) {}
    const os = String(o.status || 'pending').toLowerCase();
    if (String(pay).toLowerCase() === 'pending' && os !== 'cancelled') payPendingCount += 1;
    if (os === 'paid') paidCount += 1;
    if (os === 'shipped') shippedCount += 1;
    if (os === 'delivered') deliveredCount += 1;
    if (os === 'cancelled') cancelledCount += 1;
    renderRow(tbody, o, pay);
  }
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };
  set('orders-total', totalCount);
  set('orders-pending', payPendingCount);
  set('orders-paid', paidCount);
  set('orders-shipped', shippedCount);
  set('orders-delivered', deliveredCount);
  set('orders-cancelled', cancelledCount);
  set('orders-delivered', deliveredCount);
}

async function markPaid(id) {
  const c = getClient();
  if (!c) return;
  // Update payment status (create if missing)
  const { data: payments } = await c.from('payments').select('id,status,amount,currency,provider').eq('order_id', id).order('created_at', { ascending: false }).limit(1);
  if (Array.isArray(payments) && payments.length) {
    const pid = payments[0].id;
    await c.from('payments').update({ status: 'paid' }).eq('id', pid);
  } else {
    await c.from('payments').insert({ order_id: id, status: 'paid', amount: 0, currency: 'RM', provider: 'duitnow' });
  }
  await c.from('orders').update({ status: 'paid' }).eq('id', id);
  await loadOrders();
}

async function markShipped(id) {
  const c = getClient();
  if (!c) return;
  await c.from('orders').update({ status: 'shipped' }).eq('id', id);
  await loadOrders();
}

async function markDelivered(id) {
  const c = getClient();
  if (!c) return;
  await c.from('orders').update({ status: 'delivered' }).eq('id', id);
  await loadOrders();
}

function attachActions() {
  const tbody = document.querySelector('#ordersTable tbody');
  if (!tbody) return;
  tbody.addEventListener('click', (e) => {
    const view = e.target.closest('.btn-view');
    if (!view) return;
    const id = view.dataset.id;
    if (!id) return;
    window.location.href = `order.html?id=${encodeURIComponent(id)}`;
  });
}

if (window.supabaseClient) {
  loadOrders(); attachActions();
} else {
  window.addEventListener('supabase-ready', () => { loadOrders(); attachActions(); });
}
