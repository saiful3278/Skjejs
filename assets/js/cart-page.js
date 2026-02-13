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
              <input class="qty-input" type="number" min="1" value="${item.quantity}" data-id="${item.id}">
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
  }
  if (totalEl) {
    const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
    totalEl.textContent = formatRM(total);
  }
}

if (itemsContainer) {
  itemsContainer.addEventListener('click', (event) => {
    const removeButton = event.target.closest('button[data-remove]');
    if (!removeButton) return;
    const id = removeButton.dataset.remove;
    removeFromCart(id);
    renderCart();
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

(async () => { await renderCart(); })();
