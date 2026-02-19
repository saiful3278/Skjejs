const CART_KEY = 'shop_cart';

function sameId(a, b) {
  return String(a) === String(b);
}

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
  const existing = items.find((item) => sameId(item.id, product.id));
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({ ...product, quantity: 1 });
  }
  saveCartItems(items);
  updateCartBadge();
}

function removeFromCart(id) {
  const items = getCartItems().filter((item) => !sameId(item.id, id));
  saveCartItems(items);
  updateCartBadge();
}

function setItemQuantity(id, quantity) {
  const items = getCartItems()
    .map((item) =>
      sameId(item.id, id) ? { ...item, quantity: Number(quantity) } : item
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

function flyToCartFrom(el) {
  try {
    const cart = document.querySelector('.cart-link');
    if (!cart) return;
    const cartRect = cart.getBoundingClientRect();
    let img = null;
    let startRect = null;
    if (el) {
      const card = el.closest('.product-card');
      if (card) img = card.querySelector('img.product-img');
    }
    if (!img) {
      const mediaImg = document.querySelector('.media-slider img');
      if (mediaImg) img = mediaImg;
    }
    if (img) startRect = img.getBoundingClientRect();
    else if (el) startRect = el.getBoundingClientRect();
    else startRect = cartRect;
    const size = Math.max(40, Math.min(80, startRect.width || 60));
    const startLeft = startRect.left + (startRect.width ? startRect.width / 2 : 0) - size / 2;
    const startTop = startRect.top + (startRect.height ? startRect.height / 2 : 0) - size / 2;
    const endLeft = cartRect.left + cartRect.width / 2 - size / 2;
    const endTop = cartRect.top + cartRect.height / 2 - size / 2;
    const dx = endLeft - startLeft;
    const dy = endTop - startTop;
    const node = img && img.src ? new Image() : document.createElement('div');
    if (img && img.src) node.src = img.src;
    if (!(img && img.src)) {
      node.style.background = 'linear-gradient(135deg, var(--hero-grad-start), var(--hero-grad-end))';
      node.style.border = '1px solid var(--border)';
    }
    node.className = 'fly-img';
    node.style.position = 'fixed';
    node.style.left = `${startLeft}px`;
    node.style.top = `${startTop}px`;
    node.style.width = `${size}px`;
    node.style.height = `${size}px`;
    node.style.transform = 'translate(0px, 0px) scale(1)';
    node.style.opacity = '1';
    document.body.appendChild(node);
    requestAnimationFrame(() => {
      node.style.transform = `translate(${Math.round(dx)}px, ${Math.round(dy)}px) scale(0.2)`;
      node.style.opacity = '0.6';
    });
    const removeNode = () => {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    };
    node.addEventListener('transitionend', removeNode, { once: true });
    setTimeout(removeNode, 900);
    cart.classList.add('bump');
    setTimeout(() => cart.classList.remove('bump'), 450);
  } catch (_) {}
}

window.flyToCartFrom = flyToCartFrom;
