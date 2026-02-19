let __checkoutItems = [];
async function fetchServerPrices(ids) {
  const client = window.supabaseClient;
  if (!client || !Array.isArray(ids) || !ids.length) return {};
  const { data, error } = await client.from('products').select('id,price').in('id', ids);
  if (error || !data) return {};
  const map = {};
  for (const row of data) {
    map[String(row.id)] = Number(row.price);
  }
  return map;
}
async function renderCheckoutItems() {
  const items = typeof getCartItems === 'function' ? getCartItems() : [];
  const container = document.getElementById('checkout-items');
  if (!container) return;
  const btn = document.getElementById('place-order-btn');
  if (!items.length) {
    container.innerHTML = '<div class="empty-cart">Your cart is empty. <a href="products.html">Continue shopping</a></div>';
    if (btn) btn.disabled = true;
    __checkoutItems = [];
    return;
  }
  const ids = Array.from(new Set(items.map((i) => String(i.id))));
  const priceMap = await fetchServerPrices(ids);
  const displayItems = items.map((i) => ({
    ...i,
    price: Number.isFinite(priceMap[String(i.id)]) ? priceMap[String(i.id)] : Number(i.price || 0)
  }));
  __checkoutItems = displayItems;
  if (btn) btn.disabled = false;
  container.innerHTML = displayItems
    .map((item) => {
      const url = typeof productImageUrl === 'function' ? productImageUrl(item.image_url) : '';
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || 0);
      const lineTotal = qty * price;
      return `
        <div class="cart-item" data-id="${item.id}">
          <div class="item-thumb">${url ? `<img class="product-img" src="${url}" alt="${item.name}">` : ''}</div>
          <div class="item-info">
            <h3>${item.name}</h3>
            <p class="price">${formatRM(price)}</p>
            <p class="text-muted">Qty: ${qty}</p>
          </div>
          <div class="item-total">
            <div class="price">${formatRM(lineTotal)}</div>
          </div>
        </div>
      `;
    })
    .join('');
}

function updateCheckoutSummary() {
  const items = Array.isArray(__checkoutItems) && __checkoutItems.length ? __checkoutItems : (typeof getCartItems === 'function' ? getCartItems() : []);
  const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0);
  const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  const deliveryInputs = Array.from(document.querySelectorAll('input[name=\"delivery-option\"]'));
  const selected = deliveryInputs.find((n) => n && n.checked);
  const stateEl = document.getElementById('buyer-state');
  const state = stateEl ? String(stateEl.value || '').trim() : '';
  let shippingText = formatRM(0);
  let shippingAmount = 0;
  if (selected && selected.value === 'lalamove') {
    shippingText = 'Pay on delivery';
    shippingAmount = 0;
  } else if (selected && (selected.value === 'jnt' || selected.value === 'gdex')) {
    const rates = { west_my: 9, east_my: 20 };
    const s = state.toLowerCase();
    if (!s) {
      shippingAmount = 0;
      shippingText = 'Enter state/postcode';
    } else {
      const isEast = s === 'sabah' || s === 'sarawak' || s === 'labuan';
      shippingAmount = isEast ? rates.east_my : rates.west_my;
      shippingText = formatRM(shippingAmount);
    }
  }
  const total = subtotal + shippingAmount;
  const countEl = document.querySelector('.cart-count');
  const subEl = document.querySelector('.cart-subtotal');
  const shipEl = document.querySelector('.shipping-cost');
  const totalEl = document.querySelector('.cart-total');
  if (countEl) countEl.textContent = itemCount;
  if (subEl) subEl.textContent = formatRM(subtotal);
  if (shipEl) shipEl.textContent = shippingText;
  if (totalEl) totalEl.textContent = formatRM(total);
}

document.addEventListener('DOMContentLoaded', () => {
  const start = () => { renderCheckoutItems().then(updateCheckoutSummary); };
  if (window.supabaseClient) start();
  else window.addEventListener('supabase-ready', start);
  const items = typeof getCartItems === 'function' ? getCartItems() : [];
  const badge = document.querySelector('.cart-link .badge');
  if (badge) {
    const totalItems = items.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
    badge.textContent = totalItems;
  }
  const deliveryInputs = document.querySelectorAll('input[name=\"delivery-option\"]');
  deliveryInputs.forEach((n) => n.addEventListener('change', updateCheckoutSummary));
  const stateEl = document.getElementById('buyer-state');
  if (stateEl) stateEl.addEventListener('change', updateCheckoutSummary);
  const streetEl = document.getElementById('buyer-street');
  const postcodeEl = document.getElementById('buyer-postcode');
  function stateFromPrefix(n) {
    if (n >= 1 && n <= 2) return 'Perlis';
    if (n >= 5 && n <= 9) return 'Kedah';
    if (n >= 10 && n <= 14) return 'Pulau Pinang';
    if (n >= 15 && n <= 18) return 'Kelantan';
    if (n >= 20 && n <= 24) return 'Terengganu';
    if (n >= 25 && n <= 28) return 'Pahang';
    if (n === 39 || n === 49 || n === 69) return 'Pahang';
    if (n >= 30 && n <= 36) return 'Perak';
    if (n >= 40 && n <= 48) return 'Selangor';
    if (n >= 50 && n <= 60) return 'Kuala Lumpur';
    if (n === 62) return 'Putrajaya';
    if (n >= 63 && n <= 68) return 'Selangor';
    if (n >= 70 && n <= 73) return 'Negeri Sembilan';
    if (n >= 75 && n <= 78) return 'Melaka';
    if (n >= 79 && n <= 86) return 'Johor';
    if (n === 87) return 'Labuan';
    if (n >= 88 && n <= 91) return 'Sabah';
    if (n >= 93 && n <= 98) return 'Sarawak';
    return '';
  }
  function syncHiddenAddress() {
    const street = streetEl ? String(streetEl.value || '').trim() : '';
    const postcode = postcodeEl ? String(postcodeEl.value || '').trim() : '';
    const state = stateEl ? String(stateEl.value || '').trim() : '';
    const combined = [street, postcode, state].filter(Boolean).join(', ');
    const hidden = document.getElementById('buyer-address');
    if (hidden) hidden.value = combined;
  }
  if (streetEl) streetEl.addEventListener('input', syncHiddenAddress);
  if (postcodeEl) postcodeEl.addEventListener('input', syncHiddenAddress);
  if (postcodeEl) {
    postcodeEl.addEventListener('input', () => {
      const v = String(postcodeEl.value || '').trim();
      const m = v.replace(/\D+/g, '');
      if (m.length >= 2) {
        const pref = parseInt(m.slice(0, 2), 10);
        const auto = stateFromPrefix(pref);
        if (auto && stateEl) {
          stateEl.value = auto;
          stateEl.dispatchEvent(new Event('change'));
        }
      }
    });
  }
  if (stateEl) stateEl.addEventListener('change', syncHiddenAddress);
  syncHiddenAddress();
});
