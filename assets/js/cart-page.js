const itemsContainer = document.querySelector('.cart-items');
const totalEl = document.querySelector('.cart-total');
const countEl = document.querySelector('.cart-count');

async function fetchServerPrices(ids) {
  const client = window.supabaseClient;
  if (!client || !Array.isArray(ids) || !ids.length) return {};
  const { data, error } = await client
    .from('products')
    .select('id,price')
    .in('id', ids);
  if (error || !data) return {};
  const map = {};
  for (const row of data) {
    map[String(row.id)] = Number(row.price);
  }
  return map;
}

async function renderCart() {
  const items = getCartItems();
  if (!itemsContainer) return;
  let effectiveItems = items;
  if (items.length === 0) {
    itemsContainer.innerHTML = '<div class="empty-cart">Your cart is empty.</div>';
  } else {
    const ids = Array.from(new Set(items.map((i) => String(i.id))));
    const priceMap = await fetchServerPrices(ids);
    const displayItems = items.map((i) => ({
      ...i,
      price: Number.isFinite(priceMap[String(i.id)]) ? priceMap[String(i.id)] : Number(i.price)
    }));
    itemsContainer.innerHTML = displayItems
      .map(
        (item) =>
          `<div class="cart-item" data-id="${item.id}">
            <div class="item-thumb">${(() => { const u = productImageUrl(item.image_url); return u ? `<img class="product-img" src="${u}" alt="${item.name}">` : ''; })()}</div>
            <div class="item-info">
              <h3>${item.name}</h3>
              <p class="price">${formatRM(item.price)}</p>
            </div>
            <div class="item-actions">
              <div class="qty-control">
                <button class="qty-btn" type="button" aria-label="Decrease" data-dec="${item.id}">−</button>
                <input class="qty-input" type="number" min="1" value="${item.quantity}" data-id="${item.id}">
                <button class="qty-btn" type="button" aria-label="Increase" data-inc="${item.id}">+</button>
              </div>
              <button class="btn btn-outline" type="button" data-remove="${item.id}">Remove</button>
            </div>
          </div>`
      )
      .join('');
    effectiveItems = displayItems;
  }
  updateSummary(effectiveItems);
}

window.renderCart = renderCart;

function updateSummary(items) {
  if (countEl) {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    countEl.textContent = count;
    countEl.classList.add('bump');
    setTimeout(() => countEl.classList.remove('bump'), 350);
  }
  if (totalEl) {
    const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
    totalEl.textContent = formatRM(total);
    totalEl.classList.add('bump');
    setTimeout(() => totalEl.classList.remove('bump'), 350);
  }
}

if (itemsContainer) {
  itemsContainer.addEventListener('click', (event) => {
    const removeButton = event.target.closest('button[data-remove]');
    if (removeButton) {
      const id = removeButton.dataset.remove;
      const itemEl = removeButton.closest('.cart-item');
      if (itemEl) {
        itemEl.classList.add('removing');
        setTimeout(() => {
          removeFromCart(id);
          renderCart();
        }, 180);
      } else {
        removeFromCart(id);
        renderCart();
      }
      return;
    }
    const decBtn = event.target.closest('button[data-dec]');
    if (decBtn) {
      const id = decBtn.dataset.dec;
      const input = itemsContainer.querySelector(`input[data-id="${id}"]`);
      const current = Math.max(1, Number(input && input.value) || 1);
      const next = Math.max(1, current - 1);
      setItemQuantity(id, next);
      renderCart();
      return;
    }
    const incBtn = event.target.closest('button[data-inc]');
    if (incBtn) {
      const id = incBtn.dataset.inc;
      const input = itemsContainer.querySelector(`input[data-id="${id}"]`);
      const current = Math.max(1, Number(input && input.value) || 1);
      const next = current + 1;
      setItemQuantity(id, next);
      renderCart();
      return;
    }
  });

  itemsContainer.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-id]');
    if (!input) return;
    const id = input.dataset.id;
    const quantity = Number(input.value);
    if (!Number.isFinite(quantity)) return;
    setItemQuantity(id, quantity);
    renderCart();
  });
}

(function attachClose() {
  const closeBtn = document.getElementById('cart-close');
  if (!closeBtn) return;
  closeBtn.addEventListener('click', () => {
    if (window.history.length > 1) window.history.back();
    else window.location.href = 'index.html';
  });
})();
(async () => { await renderCart(); })();
