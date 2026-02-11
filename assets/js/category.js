
const PAGE_SIZE = 20;
let currentProducts = [];
let currentPage = 1;
let totalCount = 0;
let totalPages = 1;

function getCategoryInfo() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  const name = params.get('name');
  return { id, name };
}

function renderProducts(list) {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-cart">No products found in this category.</div>';
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

async function loadCategoryProducts(categoryName, page = 1) {
  currentPage = Math.max(1, page);
  const gridEl = document.querySelector('.product-grid');
  const client = window.supabaseClient;
  if (!client || !gridEl) {
    gridEl.innerHTML = '<div class="empty-cart">Unable to load products.</div>';
    return;
  }

  gridEl.innerHTML = '<div class="loading"></div>';

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await client
    .from('products')
    .select('id,name,price,image_url', { count: 'exact' })
    .eq('category', categoryName)
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

function init() {
  const { id, name } = getCategoryInfo();
  const categoryName = name ? decodeURIComponent(name) : '';
  if (!categoryName) {
    document.querySelector('.product-grid').innerHTML = '<div class="empty-cart">No category selected.</div>';
    return;
  }

  const categoryNameEl = document.getElementById('category-name');
  if (categoryNameEl) {
    categoryNameEl.textContent = categoryName || 'Category';
  }

  if (window.supabaseClient) {
    loadCategoryProducts(categoryName, currentPage);
  } else {
    window.addEventListener('supabase-ready', () => {
      loadCategoryProducts(categoryName, currentPage);
    });
  }

  const grid = document.querySelector('.product-grid');
  if (grid) {
    grid.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-id]');
      if (!button) return;
      const productId = Number(button.dataset.id);
      const product = currentProducts.find((p) => p.id === productId);
      if (product) {
        addToCart(product);
      }
    });
  }

  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) loadCategoryProducts(categoryName, currentPage - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) loadCategoryProducts(categoryName, currentPage + 1);
    });
  }
}

init();
