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

function markActive(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('active');
  }
}

function markDone(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('done');
    const icon = el.querySelector('.step-icon');
    if (icon) icon.textContent = '✓';
  }
}

function format(s) {
  return String(s || '').trim();
}

async function loadStatus() {
  const client = window.supabaseClient;
  if (!client) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;
  const { data: order, error: orderErr } = await client.from('orders').select('*').eq('id', id).single();
  if (orderErr || !order) return;
  setText('order-id', `Order: ${order.id}`);
  setText('order-date', formatDate(order.created_at));
  setText('order-total', formatRM(Number(order.total_amount || 0)));
  setText('order-status', format(order.status || 'pending'));
  let payStatus = 'pending';
  try {
    const { data: payments } = await client.from('payments').select('*').eq('order_id', id).order('created_at', { ascending: false }).limit(1);
    if (Array.isArray(payments) && payments.length) {
      payStatus = format(payments[0].status || 'pending');
    }
  } catch (_) {}
  setText('payment-status', payStatus);
  if (payStatus === 'pending') {
    markActive('step-verify');
  }
  if (payStatus === 'paid' || order.status === 'paid') {
    markDone('step-verify');
    markActive('step-paid');
  }
  if (order.status === 'shipped') {
    markDone('step-verify');
    markDone('step-paid');
    markActive('step-shipped');
  }
  if (order.status === 'delivered') {
    markDone('step-verify');
    markDone('step-paid');
    markDone('step-shipped');
    markActive('step-delivered');
  }
  const chip = document.getElementById('status-chip');
  if (chip) {
    let overall = format(order.status || '');
    if (!overall || overall === 'pending') {
      overall = payStatus === 'paid' ? 'paid' : 'pending';
    }
    chip.textContent = overall;
    chip.className = `status-chip ${overall}`;
  }
  const bar = document.getElementById('progress-bar');
  if (bar) {
    const orderMap = ['pending', 'paid', 'shipped', 'delivered'];
    let overall = format(order.status || '');
    if (!overall || overall === 'pending') {
      overall = payStatus === 'paid' ? 'paid' : 'pending';
    }
    const idx = Math.max(0, orderMap.indexOf(overall));
    const pct = Math.round((idx / (orderMap.length - 1)) * 100);
    bar.style.width = pct + '%';
    bar.className = `progress-bar ${overall}`;
  }
}

if (window.supabaseClient) {
  loadStatus();
} else {
  window.addEventListener('supabase-ready', loadStatus);
}
