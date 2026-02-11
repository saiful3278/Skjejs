const CART_KEY = 'shop_cart';

function getCartItems() {
  const data = localStorage.getItem(CART_KEY);
  const items = data ? JSON.parse(data) : [];
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
    quantity: item.quantity ? Number(item.quantity) : 1
  }));
}

function saveCartItems(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function addToCart(product) {
  const items = getCartItems();
  const existing = items.find((item) => item.id === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ ...product, quantity: 1 });
  }
  saveCartItems(items);
  updateCartBadge();
}

function removeFromCart(id) {
  const items = getCartItems().filter((item) => item.id !== id);
  saveCartItems(items);
  updateCartBadge();
}

function setItemQuantity(id, quantity) {
  const items = getCartItems()
    .map((item) =>
      item.id === id ? { ...item, quantity: Number(quantity) } : item
    )
    .filter((item) => item.quantity > 0);
  saveCartItems(items);
  updateCartBadge();
}

function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function updateCartBadge() {
  const badge = document.querySelector('.badge');
  if (!badge) return;
  const count = getCartItems().reduce((sum, item) => sum + item.quantity, 0);
  badge.textContent = count;
}

updateCartBadge();

function clearCart() {
  saveCartItems([]);
  updateCartBadge();
}
