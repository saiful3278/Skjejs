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

const PAGE_SIZE = 20;
let currentProducts = [];
let currentPage = 1;
let totalCount = 0;
let totalPages = 1;
let allProductsSearch = [];
let isSearchMode = false;
let searchResults = [];
const searchInputEl = document.getElementById('search-input');
const searchBtnEl = document.getElementById('search-btn');
const DISPLAY_TERMS = new Set(['lcd', 'display', 'oled', 'amoled', 'screen']);
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
  const nameStr = norm(p.name || '');
  const descStr = norm(p.description || '');
  const pFirst = firstToken(p.name || '');
  let s = 0;
  const qFirst = qTokens[0] || '';
  if (qFirst) {
    if (pFirst === qFirst) s += 8;
    else if (pFirst.includes(qFirst) || qFirst.includes(pFirst)) s += 4;
  }
  const hasDisplay = qTokens.some((t) => DISPLAY_TERMS.has(t));
  const nameHasLCD = nameT.includes('lcd') || nameStr.includes('lcd');
  const nameHasOtherDisplay = (!nameHasLCD) && (nameT.some((t) => DISPLAY_TERMS.has(t)) || ['display','oled','amoled','screen'].some((d) => nameStr.includes(d)));
  const modelTokens = qTokens.filter((t) => !DISPLAY_TERMS.has(t));
  let modelMatchCountName = 0;
  for (const mt of modelTokens) {
    if (nameT.includes(mt) || nameStr.includes(mt)) modelMatchCountName += 1;
  }
  const modelRatioName = modelTokens.length ? modelMatchCountName / modelTokens.length : 0;
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
  if (hasDisplay) {
    if (nameHasLCD && modelRatioName > 0) s += 16 + Math.floor(modelRatioName * 8);
    else if (nameHasOtherDisplay && modelRatioName > 0) s += 10 + Math.floor(modelRatioName * 6);
    else if ((descStr.includes('lcd') || ['display','oled','amoled','screen'].some((d) => descStr.includes(d))) && modelRatioName > 0) s += 6 + Math.floor(modelRatioName * 4);
  }
  const cov = qTokens.length ? qTokens.filter((q) => nameT.includes(q) || descT.includes(q)).length / qTokens.length : 0;
  s += cov * 2;
  return s;
}
async function loadAllProductsForSearch() {
  const client = window.supabaseClient;
  if (!client) {
    allProductsSearch = products.slice().map((p) => ({ ...p, description: '' }));
    return;
  }
  const pageSize = 1000;
  let from = 0;
  let all = [];
  while (true) {
    const { data, error } = await client
      .from('products')
      .select('id,name,price,image_url,description')
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) break;
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
  allProductsSearch = all.length ? all : [];
}
function performSearch(q) {
  const grid = document.querySelector('.product-grid');
  if (!grid) return;
  const query = norm(q);
  if (!query) {
    isSearchMode = false;
    loadProducts(1);
    return;
  }
  const qTokens = toks(query).map(mapQueryToken);
  let base = allProductsSearch.length ? allProductsSearch : currentProducts.slice();
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
  const hasDisplayTerm = qTokens.some((t) => DISPLAY_TERMS.has(t));
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
    grid.innerHTML = '<div class="empty-cart">No products found.</div>';
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

const gridEl = document.querySelector('.product-grid');
if (gridEl) {
  renderProductsSkeleton(8);
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
  renderProductsSkeleton(8);
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
    if (button) {
      const id = button.dataset.id;
      const product =
        currentProducts.find((p) => String(p.id) === String(id)) ||
        { id, name: '', price: 0, image_url: '' };
      if (!product) return;
      addToCart(product);
      if (window.flyToCartFrom) window.flyToCartFrom(button);
      return;
    }
    const card = event.target.closest('.product-card');
    if (card && card.dataset.id) {
      const id = card.dataset.id;
      const product =
        currentProducts.find((p) => String(p.id) === String(id)) ||
        null;
      const slug = makeSlug(product ? (product.name || '') : '');
      window.location.href = `/product?slug=${encodeURIComponent(slug)}`;
    }
  });
}

const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
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
        loadProducts(currentPage - 1);
      }
    }
  });
}
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
        loadProducts(currentPage + 1);
      }
    }
  });
}
if (searchBtnEl && searchInputEl) {
  searchBtnEl.addEventListener('click', async () => {
    const grid = document.querySelector('.product-grid');
    if (grid) renderProductsSkeleton(8);
    searchBtnEl.disabled = true;
    if (!allProductsSearch.length) await loadAllProductsForSearch();
    performSearch(searchInputEl.value || '');
    searchBtnEl.disabled = false;
  });
}
