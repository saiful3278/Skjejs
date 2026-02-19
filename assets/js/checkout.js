const checkoutButton = document.querySelector('.cart-summary .btn.btn-primary');
const emailInput = document.getElementById('buyer-email');
const nameInput = document.getElementById('buyer-name');
const phoneInput = document.getElementById('buyer-phone');
const addressInput = document.getElementById('buyer-address');
const paymentInputs = document.querySelectorAll('input[name="payment-method"]');
const deliveryInputs = document.querySelectorAll('input[name="delivery-option"]');

function getSelectedValue(nodeList) {
  const list = Array.from(nodeList || []);
  for (const n of list) {
    if (n && n.checked) return n.value;
  }
  return '';
}

function getEnv() {
  return window.__ENV || {};
}
function makeOrderRef() {
  const now = new Date();
  const y = String(now.getFullYear()).slice(2);
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const r = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  return `${y}${m}${d}${r}`;
}
function uuidv4() {
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c === 'x' ? r : (r&0x3|0x8)).toString(16);
  });
}
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }
async function loginViaEdge(email) {
  const client = window.supabaseClient;
  const env = getEnv();
  const base = env.SUPABASE_URL || '';
  const key = env.SUPABASE_ANON_KEY || '';
  if (!client || !base || !key || !email) return null;
  try {
    const res = await fetch(`${base}/functions/v1/email-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({ email })
    });
    if (!res.ok) return null;
    const json = await res.json();
    const token = json && json.token ? String(json.token) : '';
    if (!token) return null;
    const { data, error } = await client.auth.verifyOtp({ email, token, type: 'magiclink' });
    if (error) return null;
    return data && data.user ? data.user : null;
  } catch (_) {
    return null;
  }
}

async function ensureAuth(emailHint) {
  const client = window.supabaseClient;
  if (!client) return null;
  const { data: userData } = await client.auth.getUser();
  let user = userData && userData.user ? userData.user : null;
  if (!user) {
    if (emailHint) {
      const tmpPwd = `Auto${Math.random().toString(36).slice(2)}!${Date.now()}`;
      // Try to create or log in user using password flow
      try {
        const { data: signUpData, error: signUpError } = await client.auth.signUp({ email: emailHint, password: tmpPwd });
        if (signUpError) {
          const msg = String(signUpError.message || '').toLowerCase();
          const isExists = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
          if (isExists) {
            const pass = window.prompt('Email already exists. Enter password to login:');
            if (pass && pass.length >= 6) {
              const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email: emailHint, password: pass });
              if (!signInError && signInData && signInData.user) {
                return signInData.user;
              }
              alert('Login failed. Please login from the Login page.');
              try { localStorage.setItem('last_checkout_email', emailHint); } catch (_) {}
              window.location.href = 'login.html';
            } else {
              alert('Email already exists. Please login.');
              try { localStorage.setItem('last_checkout_email', emailHint); } catch (_) {}
              window.location.href = 'login.html';
            }
          }
        } else {
          // If email confirmations are disabled, this returns a session. Otherwise, continue anonymous.
          if (signUpData && signUpData.session && signUpData.user) {
            return signUpData.user;
          }
          // Try password login with the temporary password to establish session
          const { data: signInData2 } = await client.auth.signInWithPassword({ email: emailHint, password: tmpPwd });
          if (signInData2 && signInData2.user) return signInData2.user;
        }
      } catch (_) {}
    }
    // Do NOT use anonymous for checkout; require real account
  }
  return user;
}

async function waitForAuthUser(timeoutMs = 3000) {
  const client = window.supabaseClient;
  if (!client) return null;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const { data } = await client.auth.getUser();
    const u = data && data.user ? data.user : null;
    if (u) return u;
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}
async function syncCheckoutMetadata() {
  const client = window.supabaseClient;
  if (!client) return;
  if (!client) return;
  const email = emailInput ? emailInput.value.trim() : '';
  const name = nameInput ? nameInput.value.trim() : '';
  const phone = phoneInput ? phoneInput.value.trim() : '';
  const address = addressInput ? addressInput.value.trim() : '';
  try { localStorage.setItem('last_checkout_email', email); } catch (_) {}
  await ensureAuth(email);
  try {
    await client.auth.updateUser({ data: { checkout_email: email, checkout_name: name, checkout_phone: phone, checkout_address: address } });
  } catch (_) {}
}

async function prefillCheckoutFromUser() {
  const client = window.supabaseClient;
  if (!client) return;
  let email = '';
  let user = null;
  try {
    const { data } = await client.auth.getUser();
    user = data && data.user ? data.user : null;
    email = user && user.email ? user.email : '';
  } catch (_) {}
  if (user) {
    if (emailInput) {
      emailInput.value = email || '';
      emailInput.disabled = true;
    }
    const meta = user.user_metadata || {};
    const nm = meta.checkout_name || meta.name || '';
    const ph = meta.checkout_phone || meta.phone || '';
    const addrMeta = meta.checkout_address || '';
    if (nameInput && nm) nameInput.value = nm;
    if (phoneInput && ph) phoneInput.value = ph;
    if (addressInput && addrMeta) addressInput.value = addrMeta;
    if (addressInput && !addressInput.value) {
      try {
        const { data: addrs } = await client
          .from('addresses')
          .select('*')
          .eq('user_id', user.id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1);
        const a = Array.isArray(addrs) && addrs.length ? addrs[0] : null;
        if (a) {
          const lines = [a.line1, a.line2, a.line3, a.line4].filter(Boolean).join(', ');
          addressInput.value = lines || a.city || '';
        }
      } catch (_) {}
    }
  } else {
    try {
      const last = localStorage.getItem('last_checkout_email') || '';
      if (last && emailInput) {
        emailInput.value = last;
        emailInput.disabled = false;
      }
    } catch (_) {}
  }
}
async function insertOrderWithRetry(client, orderId, userId, total, email) {
  let attempts = 0;
  while (attempts < 3) {
    attempts += 1;
    let res = await client
      .from('orders')
      .insert({ id: orderId, user_id: userId, status: 'pending', total_amount: total, customer_email: email });
    if (res && res.error) {
      const msg = String(res.error.message || '').toLowerCase();
      if (msg.includes('customer_email')) {
        res = await client
          .from('orders')
          .insert({ id: orderId, user_id: userId, status: 'pending', total_amount: total });
      }
    }
    if (!res.error) return { ok: true };
    const emsg = String(res.error.message || '').toLowerCase();
    if (emsg.includes('orders_user_id_fkey') || emsg.includes('foreign key')) {
      await sleep(800);
      const u = (await client.auth.getUser()).data.user || await waitForAuthUser(2000);
      userId = u && u.id ? u.id : userId;
      continue;
    }
    return { ok: false, error: res.error };
  }
  return { ok: false, error: { message: 'Retry attempts exceeded' } };
}
if (emailInput) {
  emailInput.addEventListener('change', syncCheckoutMetadata);
  emailInput.addEventListener('blur', syncCheckoutMetadata);
}
if (nameInput) nameInput.addEventListener('change', syncCheckoutMetadata);
if (phoneInput) phoneInput.addEventListener('change', syncCheckoutMetadata);
if (addressInput) addressInput.addEventListener('change', syncCheckoutMetadata);

if (window.supabaseClient) {
  prefillCheckoutFromUser();
} else {
  window.addEventListener('supabase-ready', prefillCheckoutFromUser);
}

async function placeOrder() {
  const client = window.supabaseClient;
  if (!checkoutButton) return;
  const removeSpin = () => {
    const ring = checkoutButton && checkoutButton.querySelector('.spin-ring');
    if (ring) ring.remove();
    if (checkoutButton) checkoutButton.disabled = false;
  };
  const payment = getSelectedValue(paymentInputs);
  const delivery = getSelectedValue(deliveryInputs);
  if (!payment) {
    alert('Please select a payment method.');
    removeSpin();
    return;
  }
  if (payment !== 'duitnow') {
    alert('Only DuitNow is available.');
    removeSpin();
    return;
  }
  if (!delivery) {
    alert('Please select a delivery option.');
    removeSpin();
    return;
  }
  const email = emailInput ? emailInput.value.trim() : '';
  let user = null;
  const hasClient = !!client;
  if (hasClient) {
    let { data: userData } = await client.auth.getUser();
    user = userData && userData.user ? userData.user : null;
    if (!user) {
      user = await ensureAuth(email);
      if (!user) {
        user = await waitForAuthUser(2500);
      }
    }
    if (!user) {
      alert('Login required to place order. Please login and try again.');
      try { localStorage.setItem('last_checkout_email', email); } catch (_) {}
      removeSpin();
      window.location.href = 'login.html';
      return;
    }
  }
  const items = getCartItems();
  if (!items.length) return;
  async function fetchServerPrices(ids) {
    const c = window.supabaseClient;
    if (!c || !Array.isArray(ids) || !ids.length) return {};
    const { data, error } = await c.from('products').select('id,price').in('id', ids);
    if (error || !data) return {};
    const map = {};
    for (const row of data) {
      map[String(row.id)] = Number(row.price);
    }
    return map;
  }
  const ids = Array.from(new Set(items.map((i) => String(i.id))));
  const priceMap = await fetchServerPrices(ids);
  const displayItems = items.map((i) => ({
    ...i,
    price: Number.isFinite(priceMap[String(i.id)]) ? priceMap[String(i.id)] : NaN
  }));
  if (displayItems.some((i) => !Number.isFinite(i.price))) {
    alert('Unable to fetch product prices. Please try again.');
    removeSpin();
    return;
  }
  const total = displayItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const orderId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : uuidv4();
  const orderRef = makeOrderRef();
  const order = { id: orderId };
  if (hasClient && user) {
    const inserted = await insertOrderWithRetry(client, orderId, user.id, total, email);
    if (!inserted.ok) {
      alert('Unable to place order. ' + (inserted.error && inserted.error.message ? inserted.error.message : ''));
      removeSpin();
      return;
    }
    const rows = displayItems.map((item) => ({
      order_id: order.id || orderId,
      product_id: item.id,
      quantity: item.quantity,
      unit_price: item.price
    }));
    const { error: itemsError } = await client.from('order_items').insert(rows);
    if (itemsError) {
      alert('Unable to add items to order.');
      removeSpin();
      return;
    }
    try {
      const address = addressInput ? addressInput.value.trim() : '';
      if (address) {
        await client.from('addresses').insert({
          user_id: user ? user.id : null,
          type: 'shipping',
          line1: address,
          is_default: true,
          email: email
        });
      }
    } catch (_) {}
    try {
      await client.from('payments').insert({
        order_id: order.id,
        amount: total,
        currency: 'RM',
        status: 'pending',
        provider: 'duitnow'
      });
    } catch (_) {}
  }
  clearCart();
  if (window.renderCart) window.renderCart();
  removeSpin();
  window.location.href = `payment-duitnow.html?order_id=${encodeURIComponent(order.id)}&order_ref=${encodeURIComponent(orderRef)}&amount=${encodeURIComponent(total)}`;
}

if (checkoutButton) {
  checkoutButton.addEventListener('click', placeOrder);
}
