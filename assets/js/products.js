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
      return;
    }
  } else {
    renderCategories(list);
  }
}

function renderProducts(list) {
  const grid = document.getElementById('main-product-grid');
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty-cart">No products found.</div>';
    return;
  }
  grid.innerHTML = list
    .map(
      (p) => {
        const url = productImageUrl(p.image_url);
        const slug = makeSlug(p.name || '');
        return `<a class="product-link" href="product.html?slug=${encodeURIComponent(slug)}"><article class="product-card" data-id="${p.id}">
          <div class="product-thumb">${url ? `<img class="product-img" src="${url}" alt="${p.name}">` : ''}</div>
          <h3>${p.name}</h3>
          <p class="price">${formatRM(Number(p.price))}</p>
          <button class="btn btn-outline" type="button" data-id="${p.id}">Add to Cart</button>
        </article></a>`;
      }
    )
    .join('');
}

function renderProductsSkeleton(count = 8) {
  const grid = document.getElementById('main-product-grid');
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
let featuredProductsList = [];
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
  // Use pre-computed tokens if available
  const nameT = p._nameToks || tokensFromText(p.name || '');
  const descT = p._descToks || tokensFromText(p.description || '');
  
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
    allProductsSearch = products.slice().map((p) => ({
      ...p,
      description: '',
      _nameToks: tokensFromText(p.name || ''),
      _descToks: []
    }));
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
      description: p.description || '',
      // Pre-compute tokens to avoid doing it on every search keystroke
      _nameToks: tokensFromText(p.name || ''),
      _descToks: tokensFromText(p.description || '')
    }));
    // Use push to avoid O(N^2) array copying
    for (const item of list) all.push(item);
    
    if (data.length < pageSize) break;
    from += pageSize;
    if (all.length >= 5000) break;
  }
  allProductsSearch = all.length ? all : [];
}
function performSearch(q) {
  const grid = document.getElementById('main-product-grid');
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

const gridEl = document.getElementById('main-product-grid');
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

async function loadFeaturedProducts() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;
  
  // Skeleton
  grid.innerHTML = Array(4).fill('<article class="product-card"><div class="product-thumb"><div class="skeleton-block"></div></div><h3><span class="skeleton-line"></span></h3></article>').join('');

  const client = window.supabaseClient;
  
  if (!client) {
     featuredProductsList = (window.products || []).slice(0, 4);
  } else {
    // Fetch 4 items, let's just take the first 4 for now. 
    // Ideally we would order by popularity or a 'featured' flag.
    const { data } = await client
      .from('products')
      .select('id,name,price,image_url')
      .limit(4); 
    if (data) featuredProductsList = data;
  }

  if (!featuredProductsList.length) {
    grid.innerHTML = '';
    return;
  }

  grid.innerHTML = featuredProductsList.map(p => {
        const url = productImageUrl(p.image_url);
        const slug = makeSlug(p.name || '');
        return `<a class="product-link" href="product.html?slug=${encodeURIComponent(slug)}"><article class="product-card" data-id="${p.id}">
          <div class="product-thumb">${url ? `<img class="product-img" src="${url}" alt="${p.name}">` : ''}</div>
          <h3>${p.name}</h3>
          <p class="price">${formatRM(Number(p.price))}</p>
          <button class="btn btn-outline" type="button" data-id="${p.id}">Add to Cart</button>
        </article></a>`;
  }).join('');
}

if (window.supabaseClient) {
  loadProducts(currentPage);
  loadCategories();
  loadFeaturedProducts();
} else {
  window.addEventListener('supabase-ready', () => {
    loadProducts(currentPage);
    loadCategories();
    loadFeaturedProducts();
  });
}



const mainGrid = document.getElementById('main-product-grid');
const featuredGrid = document.getElementById('featured-grid');

function handleGridClick(event) {
    const button = event.target.closest('button[data-id]');
    if (button) {
      event.preventDefault(); // Prevent link navigation if inside <a>
      event.stopPropagation();
      const id = button.dataset.id;
      const product =
        currentProducts.find((p) => String(p.id) === String(id)) ||
        featuredProductsList.find((p) => String(p.id) === String(id)) ||
        { id, name: '', price: 0, image_url: '' };
      
      // Basic check if product is valid
      if (!product || !product.name) return;
      
      addToCart(product);
      if (window.flyToCartFrom) window.flyToCartFrom(button);
      return;
    }
    // Card click is handled by the wrapping <a> tag naturally, 
    // but if we want JS navigation (like the old code did), we can keep it.
    // The new HTML wraps <article> in <a class="product-link"> so we don't strictly need JS for navigation.
    // But the old code had JS navigation. I'll leave the <a> tag doing the work.
}

if (mainGrid) mainGrid.addEventListener('click', handleGridClick);
if (featuredGrid) featuredGrid.addEventListener('click', handleGridClick);

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
  // Listen for Enter key
  searchInputEl.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      searchBtnEl.click();
    }
  });

  searchBtnEl.addEventListener('click', async () => {
    const query = searchInputEl.value.trim();

    // Check if we are on index.html (Home)
    const path = window.location.pathname;
    const isHome = path === '/' || path.endsWith('/index.html') || path.endsWith('/');
    
    if (isHome) {
      // Redirect to products.html with query (or just products.html if empty)
      if (query) {
        window.location.href = `products.html?q=${encodeURIComponent(query)}`;
      } else {
        window.location.href = `products.html`;
      }
      return;
    }

    // Otherwise, perform search in-place (e.g. on products.html)
    const grid = document.getElementById('main-product-grid');
    if (grid) renderProductsSkeleton(8);
    searchBtnEl.disabled = true;
    
    // If query is empty, we just reload default products
    if (!query) {
      isSearchMode = false;
      await loadProducts(1);
      searchBtnEl.disabled = false;
      // Update URL to remove query param if present
      const url = new URL(window.location);
      url.searchParams.delete('q');
      window.history.pushState({}, '', url);
      return;
    }

    if (!allProductsSearch.length) await loadAllProductsForSearch();
    performSearch(query);
    searchBtnEl.disabled = false;
    
    // Update URL with query param
    const url = new URL(window.location);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url);
  });
}

// Check for URL query params on load (for products.html)
window.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q && searchInputEl) {
    searchInputEl.value = q;
    const grid = document.getElementById('main-product-grid');
    if (grid) renderProductsSkeleton(8);

    // Wait for Supabase/Products to be ready if needed, or just trigger search
    // We need to ensure products are loaded or loadAllProductsForSearch is called
    if (window.supabaseClient) {
       if (!allProductsSearch.length) await loadAllProductsForSearch();
       performSearch(q);
    } else {
       window.addEventListener('supabase-ready', async () => {
         if (!allProductsSearch.length) await loadAllProductsForSearch();
         performSearch(q);
       });
    }
  }
});
