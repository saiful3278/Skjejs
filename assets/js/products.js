const products = [
  { id: 1, name: 'Classic Tee', price: 29.0, image_url: '' },
  { id: 2, name: 'Running Shoes', price: 79.0, image_url: '' },
  { id: 3, name: 'Leather Wallet', price: 49.0, image_url: '' },
  { id: 4, name: 'Wireless Headphones', price: 129.0, image_url: '' },
  { id: 5, name: 'Smart Watch', price: 199.0, image_url: '' }
];



function categoryImageUrl(path) {
  const url = productImageUrl(path);
  if (url) return url;
  return 'data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"140\" height=\"90\" viewBox=\"0 0 140 90\"><rect width=\"140\" height=\"90\" fill=\"%23f3f4f6\"/><rect x=\"35\" y=\"25\" width=\"70\" height=\"40\" rx=\"8\" fill=\"%239ca3af\"/><path d=\"M45 35 h15 l5 8 h30 v12 h-50 z\" fill=\"%238b97a5\"/></svg>';
}

function renderCategories(list) {
  const row = document.getElementById('category-row');
  if (!row) return;
  if (!list || list.length === 0) {
    row.innerHTML = '';
    return;
  }
  const filtered = list.filter((c) => {
    const name = c && c.name ? String(c.name) : '';
    return name.trim().toUpperCase() !== 'REVIEW_NEEDED';
  });
  if (!filtered.length) {
    row.innerHTML = '';
    return;
  }
  row.innerHTML = filtered
    .map((c) => {
      const url = categoryImageUrl(c.image_url);
      return `<a href="category.html?id=${c.id}&name=${encodeURIComponent(c.name)}" class="mini-card">
        <div class="mini-thumb"><img src="${url}" alt="${c.name}"></div>
        <div class="mini-title">${c.name}</div>
      </a>`;
    })
    .join('');
}

async function fetchCategoriesDirect() {
  const env = window.__ENV || {};
  const base = env.SUPABASE_URL || '';
  const key = env.SUPABASE_ANON_KEY || '';
  if (!base || !key) return [];
  const url = `${base}/rest/v1/categories?select=*&order=id.asc`;
  try {
    const res = await fetch(url, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`
      }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (_) {
    return [];
  }
}

async function loadCategories() {
  const row = document.getElementById('category-row');
  if (!row) return;
  row.innerHTML = '<span class="loading"></span>';
  const client = window.supabaseClient;
  if (!client) {
    const direct = await fetchCategoriesDirect();
    if (direct && direct.length) {
      const list = direct.map((c) => ({ id: c.id, name: c.name, image_url: c.image_url || '' }));
      renderCategories(list);
      return;
    } else {
      renderCategories([]);
      return;
    }
  }
  const { data, error } = await client
    .from('categories')
    .select('*')
    .order('id', { ascending: true });
  if (error) {
    const direct = await fetchCategoriesDirect();
    if (direct && direct.length) {
      const list = direct.map((c) => ({ id: c.id, name: c.name, image_url: c.image_url || '' }));
      renderCategories(list);
      return;
    } else {
      renderCategories([]);
      return;
    }
  }
  const list = (data || []).map((c) => ({
    id: c.id,
    name: c.name,
    image_url: c.image_url || ''
  }));
  if (!list.length) {
    const direct = await fetchCategoriesDirect();
    if (direct && direct.length) {
      const list2 = direct.map((c) => ({ id: c.id, name: c.name, image_url: c.image_url || '' }));
      renderCategories(list2);
    } else {
      renderCategories([]);
    }
  } else {
    renderCategories(list);
  }
}

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
          <p class="price">${formatRM(Number(p.price))}</p>
          <button class="btn btn-outline" type="button" data-id="${p.id}">Add to Cart</button>
        </article>`;
      }
    )
    .join('');
}

const PAGE_SIZE = 20;
let currentProducts = [];
let currentPage = 1;
let totalCount = 0;
let totalPages = 1;

const gridEl = document.querySelector('.product-grid');
if (gridEl) {
  gridEl.innerHTML = '<div class="loading"></div>';
}

function renderPager() {
  const info = document.getElementById('page-info');
  const prev = document.getElementById('prev-page');
  const next = document.getElementById('next-page');
  if (info) {
    info.textContent = `Page ${currentPage} of ${totalPages}`;
  }
  if (prev) prev.disabled = currentPage <= 1;
  if (next) next.disabled = currentPage >= totalPages;
}

async function loadProducts(page = 1) {
  currentPage = Math.max(1, page);
  const client = window.supabaseClient;
  if (!client || !gridEl) {
    totalCount = products.length;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    currentProducts = products.slice(start, end);
    renderProducts(currentProducts);
    renderPager();
    return;
  }
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error, count } = await client
    .from('products')
    .select('id,name,price,image_url', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
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
  totalCount = Number.isFinite(count) ? count : list.length;
  totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  currentProducts = list.slice(0, PAGE_SIZE);
  renderProducts(currentProducts);
  renderPager();
}

if (window.supabaseClient) {
  loadProducts(currentPage);
  loadCategories();
} else {
  window.addEventListener('supabase-ready', () => {
    loadProducts(currentPage);
    loadCategories();
  });
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

const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
if (prevBtn) {
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) loadProducts(currentPage - 1);
  });
}
if (nextBtn) {
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) loadProducts(currentPage + 1);
  });
}
