
const PAGE_SIZE = 20;
let currentProducts = [];
let currentPage = 1;
let totalCount = 0;
let totalPages = 1;
let allCategoryProducts = [];
let isSearchMode = false;
let searchResults = [];
const searchInputEl = document.getElementById('search-input');
const searchBtnEl = document.getElementById('search-btn');
async function fetchCategoryProductsDirect(categoryName, categoryId) {
  const env = window.__ENV || {};
  const base = env.SUPABASE_URL || '';
  const key = env.SUPABASE_ANON_KEY || '';
  if (!base || !key) return [];
  const filter = (Number.isFinite(categoryId) && categoryId > 0)
    ? `category_id=eq.${encodeURIComponent(categoryId)}`
    : `category=eq.${encodeURIComponent(categoryName)}`;
  const url = `${base}/rest/v1/products?select=id,name,price,image_url,description&${filter}&order=created_at.desc`;
  try {
    const res = await fetch(url, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      image_url: p.image_url || '',
      description: p.description || ''
    })) : [];
  } catch (_) {
    return [];
  }
}
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function makeSlug(s) {
  const base = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base ? base + '-' : '';
}
function toks(s) {
  return norm(s).split(/\s+/).filter(Boolean);
}
function tokensFromText(s) {
  const set = new Set();
  toks(s).forEach((w) => set.add(w));
  return Array.from(set);
}
function firstToken(s) {
  const arr = toks(s);
  return arr.length ? arr[0] : '';
}
function mapQueryToken(t) {
  return t === 'iphone' ? 'phone' : t;
}
function scoreProduct(qTokens, p) {
  const nameT = tokensFromText(p.name || '');
  const descT = tokensFromText(p.description || '');
  const pFirst = firstToken(p.name || '');
  let s = 0;
  const qFirst = qTokens[0] || '';
  if (qFirst) {
    if (pFirst === qFirst) s += 8;
    else if (pFirst.includes(qFirst) || qFirst.includes(pFirst)) s += 4;
  }
  for (let i = 0; i < qTokens.length; i++) {
    const q = qTokens[i];
    if (nameT.includes(q)) s += 4;
    else if (descT.includes(q)) s += 2;
    else {
      let hit = false;
      for (const pt of nameT) {
        if (pt.includes(q) || q.includes(pt)) { s += 1; hit = true; break; }
      }
      if (!hit) {
        for (const pt of descT) {
          if (pt.includes(q) || q.includes(pt)) { s += 0.5; hit = true; break; }
        }
      }
    }
  }
  const cov = qTokens.length ? qTokens.filter((q) => nameT.includes(q) || descT.includes(q)).length / qTokens.length : 0;
  s += cov * 2;
  return s;
}
async function loadAllCategoryProducts(categoryName, categoryId) {
  const client = window.supabaseClient;
  if (!client) {
    const direct = await fetchCategoryProductsDirect(categoryName, categoryId);
    allCategoryProducts = direct.length ? direct : [];
    return;
  }
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const { data, error } = await client
      .from('products')
      .select('id,name,price,image_url,description')
      .eq((Number.isFinite(categoryId) && categoryId > 0) ? 'category_id' : 'category', (Number.isFinite(categoryId) && categoryId > 0) ? categoryId : categoryName)
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) {
      const direct = await fetchCategoryProductsDirect(categoryName, categoryId);
      allCategoryProducts = direct.length ? direct : [];
      return;
    }
    if (!data || !data.length) break;
    const list = data.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      image_url: p.image_url || '',
      description: p.description || ''
    }));
    all = all.concat(list);
    if (data.length < pageSize) break;
    from += pageSize;
    if (all.length >= 5000) break;
  }
  allCategoryProducts = all.length ? all : [];
}
function performSearch(categoryName, q) {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;
  const query = norm(q);
  if (!query) {
    isSearchMode = false;
    loadCategoryProducts(categoryName, 1);
    return;
  }
  const qTokens = toks(query).map(mapQueryToken);
  let base = allCategoryProducts.length ? allCategoryProducts : currentProducts.slice();
  if (typeof window.detectModel === 'function') {
    const m = window.detectModel(query);
    if (m && m.modelPhrase) {
      const phrase = norm(m.modelPhrase);
      const filtered = base.filter((p) => {
        const n = norm(p.name || '');
        const d = norm(p.description || '');
        return n.includes(phrase) || d.includes(phrase);
      });
      if (filtered.length) base = filtered;
    }
  }
  const displayTerms = new Set(['lcd', 'display', 'oled', 'amoled', 'screen']);
  const hasDisplayTerm = qTokens.some((t) => displayTerms.has(t));
  let scored;
  if (hasDisplayTerm) {
    const lcdBase = base.filter((p) => {
      const n = norm(p.name || '');
      const d = norm(p.description || '');
      return n.includes('lcd') || d.includes('lcd');
    });
    const otherBase = base.filter((p) => {
      const n = norm(p.name || '');
      const d = norm(p.description || '');
      return !(n.includes('lcd') || d.includes('lcd'));
    });
    const scoredLcd = lcdBase
      .map((p) => ({ p, s: scoreProduct(qTokens, p) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
    const scoredOther = otherBase
      .map((p) => ({ p, s: scoreProduct(qTokens, p) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
    scored = scoredLcd.concat(scoredOther);
  } else {
    scored = base
      .map((p) => ({ p, s: scoreProduct(qTokens, p) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
  }
  if (!scored.length) {
    grid.innerHTML = '<div class="empty-cart">No products found in this category.</div>';
    const info = document.getElementById('page-info');
    if (info) info.textContent = 'Page 1 of 1';
    const prev = document.getElementById('prev-page');
    const next = document.getElementById('next-page');
    if (prev) prev.disabled = true;
    if (next) next.disabled = true;
    return;
  }
  isSearchMode = true;
  searchResults = scored;
  totalCount = scored.length;
  totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  currentPage = 1;
  const start = 0;
  const end = PAGE_SIZE;
  currentProducts = searchResults.slice(start, end);
  renderProducts(currentProducts);
  renderPager();
}

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
        return `<article class="product-card" data-id="${p.id}">
          <div class="product-thumb">${url ? `<img class="product-img" src="${url}" alt="${p.name}">` : ''}</div>
          <h3>${p.name}</h3>
          <p class="price">${formatRM(Number(p.price))}</p>
          <button class="btn btn-outline" type="button" data-id="${p.id}">Add to Cart</button>
        </article>`;
      }
    )
    .join('');
}

function renderProductsSkeleton(count = 8) {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;
  const cards = Array.from({ length: count }).map(() => {
    return `<article class="product-card">
      <div class="product-thumb"><div class="skeleton-block"></div></div>
      <h3><span class="skeleton-line" style="width:70%"></span></h3>
      <p class="price"><span class="skeleton-line" style="width:40%"></span></p>
    </article>`;
  }).join('');
  grid.innerHTML = cards;
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

async function loadCategoryProducts(categoryName, page = 1, categoryId) {
  currentPage = Math.max(1, page);
  const gridEl = document.querySelector('.product-grid');
  const client = window.supabaseClient;
  if (!client || !gridEl) {
    gridEl.innerHTML = '<div class="empty-cart">Unable to load products.</div>';
    return;
  }

  renderProductsSkeleton(8);

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await client
    .from('products')
    .select('id,name,price,image_url', { count: 'exact' })
    .eq((Number.isFinite(categoryId) && categoryId > 0) ? 'category_id' : 'category', (Number.isFinite(categoryId) && categoryId > 0) ? categoryId : categoryName)
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
    loadCategoryProducts(categoryName, currentPage, id);
    loadAllCategoryProducts(categoryName, id);
  } else {
    window.addEventListener('supabase-ready', () => {
      loadCategoryProducts(categoryName, currentPage, id);
      loadAllCategoryProducts(categoryName, id);
    });
  }

  const grid = document.querySelector('.product-grid');
  if (grid) {
    grid.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-id]');
      if (button) {
        const productId = button.dataset.id;
        const product = currentProducts.find((p) => String(p.id) === String(productId));
        if (product) {
          addToCart(product);
          if (window.flyToCartFrom) window.flyToCartFrom(button);
        }
        return;
      }
      const card = event.target.closest('.product-card');
      if (card && card.dataset.id) {
        const id = card.dataset.id;
        const product = currentProducts.find((p) => String(p.id) === String(id)) || null;
        const slug = makeSlug(product ? (product.name || '') : '');
        window.location.href = `/product?slug=${encodeURIComponent(slug)}`;
      }
    });
  }

  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        if (isSearchMode) {
          currentPage += 1;
          const start = (currentPage - 1) * PAGE_SIZE;
          const end = start + PAGE_SIZE;
          currentProducts = searchResults.slice(start, end);
          renderProducts(currentProducts);
          renderPager();
        } else {
          loadCategoryProducts(categoryName, currentPage + 1);
        }
      }
    });
  }
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        if (isSearchMode) {
          currentPage -= 1;
          const start = (currentPage - 1) * PAGE_SIZE;
          const end = start + PAGE_SIZE;
          currentProducts = searchResults.slice(start, end);
          renderProducts(currentProducts);
          renderPager();
        } else {
          loadCategoryProducts(categoryName, currentPage - 1);
        }
      }
    });
  }
  if (searchBtnEl && searchInputEl) {
    searchBtnEl.addEventListener('click', async () => {
      const gridEl = document.querySelector('.product-grid');
      if (gridEl) renderProductsSkeleton(8);
      searchBtnEl.disabled = true;
      if (!allCategoryProducts.length) await loadAllCategoryProducts(categoryName);
      performSearch(categoryName, searchInputEl.value || '');
      searchBtnEl.disabled = false;
    });
  }
}

init();
