const products = [
  { id: 1, name: 'Classic Tee', price: 29.0, image_url: '' },
  { id: 2, name: 'Running Shoes', price: 79.0, image_url: '' },
  { id: 3, name: 'Leather Wallet', price: 49.0, image_url: '' },
  { id: 4, name: 'Wireless Headphones', price: 129.0, image_url: '' },
  { id: 5, name: 'Smart Watch', price: 199.0, image_url: '' }
];

function renderProducts(list) {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-cart">No products found.</div>';
    return;
  }
  grid.innerHTML = list
    .map(
      (p) => {
        const url = productImageUrl(p.image_url);
        return `<article class="product-card">
          <div class="product-thumb">${url ? `<img class="product-img" src="${url}" alt="${p.name}">` : ''}</div>
          <h3><a href="product.html?id=${p.id}">${p.name}</a></h3>
          <p class="price">$${Number(p.price).toFixed(2)}</p>
          <button class="btn btn-outline" type="button" data-id="${p.id}">Add to Cart</button>
        </article>`;
      }
    )
    .join('');
}

let currentProducts = products;
const gridEl = document.querySelector('.product-grid');
if (gridEl) {
  gridEl.innerHTML = '<div class="loading"></div>';
}

async function loadProducts() {
  const client = window.supabaseClient;
  if (!client || !gridEl) {
    renderProducts(products);
    return;
  }
  const { data, error } = await client
    .from('products')
    .select('id,name,price,image_url')
    .order('created_at', { ascending: false });
  if (error) {
    gridEl.innerHTML = '<div class="empty-cart">Unable to load products.</div>';
    return;
  }
  const list = (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price),
    image_url: p.image_url || ''
  }));
  currentProducts = list.length ? list : products;
  renderProducts(currentProducts);
}

if (window.supabaseClient) {
  loadProducts();
} else {
  window.addEventListener('supabase-ready', loadProducts);
}

const grid = document.querySelector('.product-grid');
if (grid) {
  grid.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-id]');
    if (!button) return;
    const id = Number(button.dataset.id);
    const product =
      currentProducts.find((p) => p.id === id) ||
      { id, name: '', price: 0, image_url: '' };
    if (!product) return;
    addToCart(product);
  });
}
