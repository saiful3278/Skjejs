const itemsContainer = document.querySelector('.cart-items');
const totalEl = document.querySelector('.cart-total');
const countEl = document.querySelector('.cart-count');

function renderCart() {
  const items = getCartItems();
  if (!itemsContainer) return;
  if (items.length === 0) {
    itemsContainer.innerHTML = '<div class="empty-cart">Your cart is empty.</div>';
  } else {
    itemsContainer.innerHTML = items
      .map(
        (item) =>
          `<div class="cart-item" data-id="${item.id}">
            <div class="item-thumb">${(() => { const u = productImageUrl(item.image_url); return u ? `<img class="product-img" src="${u}" alt="${item.name}">` : ''; })()}</div>
            <div class="item-info">
              <h3>${item.name}</h3>
              <p class="price">$${item.price.toFixed(2)}</p>
            </div>
            <div class="item-actions">
              <input class="qty-input" type="number" min="1" value="${item.quantity}" data-id="${item.id}">
              <button class="btn btn-outline" type="button" data-remove="${item.id}">Remove</button>
            </div>
          </div>`
      )
      .join('');
  }
  updateSummary(items);
}

window.renderCart = renderCart;

function updateSummary(items) {
  if (countEl) {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    countEl.textContent = count;
  }
  if (totalEl) {
    totalEl.textContent = `$${calculateTotal(items).toFixed(2)}`;
  }
}

if (itemsContainer) {
  itemsContainer.addEventListener('click', (event) => {
    const removeButton = event.target.closest('button[data-remove]');
    if (!removeButton) return;
    const id = Number(removeButton.dataset.remove);
    removeFromCart(id);
    renderCart();
  });

  itemsContainer.addEventListener('input', (event) => {
    const input = event.target.closest('input[data-id]');
    if (!input) return;
    const id = Number(input.dataset.id);
    const quantity = Number(input.value);
    if (!Number.isFinite(quantity)) return;
    setItemQuantity(id, quantity);
    renderCart();
  });
}

renderCart();
