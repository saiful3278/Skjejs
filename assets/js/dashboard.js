/* Imports and Setup */
function getSupabase() {
  return window.supabaseClient;
}

const tableBody = document.querySelector('#productsTable tbody');
const toggleSingle = document.getElementById('toggle-single');
const toggleBulk = document.getElementById('toggle-bulk');
const singleCard = document.getElementById('single-card');
const bulkCard = document.getElementById('bulk-card');
const singleUpload = document.getElementById('singleUpload');
const homeSection = document.getElementById('home-section');
const productsSection = document.getElementById('products-section');
const categoriesSection = document.getElementById('categories-section');
const createCategoryForm = document.getElementById('create-category-form');
const categoriesTableBody = document.querySelector('#categoriesTable tbody');
const viewLinks = document.querySelectorAll('#nav-popover a[data-view]');
const navMenu = document.getElementById('nav-popover') || document.getElementById('nav-drawer');
const filterCategorySelect = document.getElementById('filter-category-select');
let currentCategoryFilter = '';
let currentCategoryFilterId = null;
const PRODUCTS_PAGE_SIZE = 100;
let allProducts = [];
let currentProductsPage = 1;
let existingProductTitleSet = null;
let productsTotalCount = 0;
let productsTotalPages = 1;
let bulkSelectAllFilter = false;
let categoryMode = false;
let catFrom = 0;
const CATEGORY_PAGE_SIZE = 1000;
let catHasMore = false;
let catLoading = false;
let categoryScrollHandler = null;

// Auto Category Helpers
let __categoryNamesCache = null;
async function getCategoryNames() {
  if (__categoryNamesCache) return __categoryNamesCache;
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from('categories').select('name');
  if (error) return [];
  __categoryNamesCache = (data || []).map((r) => (r && r.name) ? String(r.name) : '').filter(Boolean);
  return __categoryNamesCache;
}
function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function mostSpecific(names) {
  return names.slice().sort((a, b) => b.length - a.length)[0];
}
function autoCategory(title, description, categoryNames) {
  const t = String(title || '').toLowerCase();
  const d = String(description || '').toLowerCase();
  const matchesTitle = [];
  const matchesDesc = [];
  (categoryNames || []).forEach((cat) => {
    const c = String(cat || '').toLowerCase();
    if (!c) return;
    const esc = escapeRegex(c);
    const rePhrase = new RegExp(`\\b${esc}\\b`, 'i');
    const reLoose = new RegExp(`(^|[^a-z0-9])${esc}(?=$|[^a-z]|\\d)`, 'i');
    let hit = false;
    if (t && (rePhrase.test(t) || reLoose.test(t))) {
      hit = true;
    } else if (d && (rePhrase.test(d) || reLoose.test(d))) {
      hit = true;
    }
    if (!hit) {
      const tokens = c.split(/[^a-z0-9]+/i).filter((tok) => tok.length >= 3);
      for (const tok of tokens) {
        const e2 = escapeRegex(tok);
        const reTight = new RegExp(`\\b${e2}\\b`, 'i');
        const reFlex = new RegExp(`(^|[^a-z0-9])${e2}(?=$|[^a-z]|\\d)`, 'i');
        if ((t && (reTight.test(t) || reFlex.test(t))) || (d && (reTight.test(d) || reFlex.test(d)))) {
          hit = true;
          break;
        }
      }
    }
    if (hit) {
      if (t && (rePhrase.test(t) || reLoose.test(t))) matchesTitle.push(cat);
      else matchesDesc.push(cat);
    }
  });
  if (matchesTitle.length) return mostSpecific(matchesTitle);
  if (matchesDesc.length) return mostSpecific(matchesDesc);
  return 'UNCATEGORIZED';
}
function compileMatchers(categoryNames) {
  const arr = [];
  (categoryNames || []).forEach((cat) => {
    const c = String(cat || '').toLowerCase();
    if (!c) return;
    const esc = escapeRegex(c);
    const rePhrase = new RegExp(`\\b${esc}\\b`, 'i');
    const reLoose = new RegExp(`(^|[^a-z0-9])${esc}(?=$|[^a-z]|\\d)`, 'i');
    const tokens = c.split(/[^a-z0-9]+/i).filter((tok) => tok.length >= 3).map((tok) => {
      const e2 = escapeRegex(tok);
      return {
        reTight: new RegExp(`\\b${e2}\\b`, 'i'),
        reFlex: new RegExp(`(^|[^a-z0-9])${e2}(?=$|[^a-z]|\\d)`, 'i')
      };
    });
    arr.push({ cat, rePhrase, reLoose, tokens });
  });
  return arr;
}
function detectCategoryFast(title, description, matchers) {
  const t = String(title || '').toLowerCase();
  const d = String(description || '').toLowerCase();
  const matchesTitle = [];
  const matchesDesc = [];
  (matchers || []).forEach((m) => {
    let hit = false;
    if (t && (m.rePhrase.test(t) || m.reLoose.test(t))) {
      hit = true;
    } else if (d && (m.rePhrase.test(d) || m.reLoose.test(d))) {
      hit = true;
    }
    if (!hit) {
      for (const tok of m.tokens) {
        if ((t && (tok.reTight.test(t) || tok.reFlex.test(t))) || (d && (tok.reTight.test(d) || tok.reFlex.test(d)))) {
          hit = true;
          break;
        }
      }
    }
    if (hit) {
      if (t && (m.rePhrase.test(t) || m.reLoose.test(t))) matchesTitle.push(m.cat);
      else matchesDesc.push(m.cat);
    }
  });
  if (matchesTitle.length) return mostSpecific(matchesTitle);
  if (matchesDesc.length) return mostSpecific(matchesDesc);
  return 'UNCATEGORIZED';
}
function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}
async function retryOp(fn, retries = 3, delay = 600) {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt += 1;
      if (attempt > retries) throw e;
      await sleep(delay * attempt);
    }
  }
}
function shouldRemoveCategory(error) {
  if (!error) return false;
  const msg = String(error.message || '');
  return error.code === '42703' || error.code === 'PGRST204' || msg.includes('column "category"') || msg.includes('column category') || msg.includes('schema cache');
}

function rowHtml(p) {
  const catText = p && p.category ? String(p.category) : '';
  const catId = p && p.category_id ? p.category_id : null;
  const mapped = catId ? categoryNameFromId(catId) : '';
  const resolved = mapped || catText;
  const displayCat = !resolved || resolved === 'REVIEW_NEEDED' ? 'UNCATEGORIZED' : resolved;
  return `<tr>
    <td><input type="checkbox" class="product-select" value="${p.id}"></td>
    <td>${p.name || p.title || ''}</td>
    <td>${formatRM(Number(p.price || 0))}</td>
    <td>${p.sku || '-'}</td>
    <td>${p.stock ?? '-'}</td>
    <td>${displayCat}</td>
    <td>
      <button class="btn btn-outline" data-edit="${p.id}">Edit</button>
      <button class="btn btn-primary" data-delete="${p.id}">Delete</button>
    </td>
  </tr>`;
}
function insertRowsIncremental(list) {
  if (!tableBody) return;
  const BATCH_SIZE = 500;
  let i = 0;
  tableBody.innerHTML = '';
  function step() {
    const end = Math.min(i + BATCH_SIZE, list.length);
    let html = '';
    for (let j = i; j < end; j++) {
      const p = list[j];
      if (p) html += rowHtml(p);
    }
    if (html) tableBody.insertAdjacentHTML('beforeend', html);
    i = end;
    if (i < list.length) {
      setTimeout(step, 0);
    } else {
      const pageInfoEl = document.getElementById('products-page-info');
      const prevBtn = document.getElementById('products-prev');
      const nextBtn = document.getElementById('products-next');
      if (pageInfoEl) pageInfoEl.textContent = `Page ${productsTotalCount ? 1 : 0} / 1`;
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      if (typeof updateBulkUI === 'function') updateBulkUI();
    }
  }
  step();
}
function ensureCategoryLoader() {
  if (categoryScrollHandler) return;
  categoryScrollHandler = () => {
    if (!categoryMode || catLoading || !catHasMore) return;
    const nearBottom = (window.innerHeight + window.scrollY) >= (document.body.scrollHeight - 300);
    if (nearBottom) fetchCategoryChunk();
  };
  window.addEventListener('scroll', categoryScrollHandler);
}
function detachCategoryLoader() {
  if (categoryScrollHandler) {
    window.removeEventListener('scroll', categoryScrollHandler);
    categoryScrollHandler = null;
  }
}
async function initCategoryMode() {
  const supabase = getSupabase();
  if (!supabase || !tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="7"><span class="loading"></span></td></tr>';
  let q = supabase.from('products').select('id', { count: 'exact' });
  if (currentCategoryFilter === 'UNCATEGORIZED') {
    q = q.or('category_id.is.null,category.is.null,category.eq.UNCATEGORIZED,category.eq.,category.eq.REVIEW_NEEDED');
  } else {
    if (currentCategoryFilterId && Number.isFinite(currentCategoryFilterId)) {
      const name = String(currentCategoryFilter || '');
      q = q.or(`category_id.eq.${currentCategoryFilterId},category.eq.${name}`);
    } else {
      q = q.eq('category', currentCategoryFilter);
    }
  }
  const { error, count } = await q.limit(1);
  if (error) {
    tableBody.innerHTML = '<tr><td colspan="7">Unable to load products.</td></tr>';
    return;
  }
  productsTotalCount = Number.isFinite(count) ? count : 0;
  productsTotalPages = 1;
  currentProductsPage = 1;
  tableBody.innerHTML = '';
  catFrom = 0;
  catHasMore = true;
  catLoading = false;
  categoryMode = true;
  ensureCategoryLoader();
  await fetchCategoryChunk();
}
async function fetchCategoryChunk() {
  if (catLoading || !categoryMode) return;
  const supabase = getSupabase();
  if (!supabase || !tableBody) return;
  catLoading = true;
  let q = supabase.from('products').select('*').order('created_at', { ascending: false });
  if (currentCategoryFilter === 'UNCATEGORIZED') {
    q = q.or('category_id.is.null,category.is.null,category.eq.UNCATEGORIZED,category.eq.,category.eq.REVIEW_NEEDED');
  } else {
    if (currentCategoryFilterId && Number.isFinite(currentCategoryFilterId)) {
      const name = String(currentCategoryFilter || '');
      q = q.or(`category_id.eq.${currentCategoryFilterId},category.eq.${name}`);
    } else {
      q = q.eq('category', currentCategoryFilter);
    }
  }
  const { data, error } = await q.range(catFrom, catFrom + CATEGORY_PAGE_SIZE - 1);
  if (error) {
    tableBody.innerHTML = '<tr><td colspan="7">Unable to load products.</td></tr>';
    catLoading = false;
    return;
  }
  const list = Array.isArray(data) ? data : [];
  catFrom += list.length;
  if (list.length < CATEGORY_PAGE_SIZE) catHasMore = false;
  insertRowsIncremental(list);
  const listTotalEl = document.getElementById('list-total-products');
  if (listTotalEl) listTotalEl.textContent = productsTotalCount;
  const pageInfoEl = document.getElementById('products-page-info');
  const prevBtn = document.getElementById('products-prev');
  const nextBtn = document.getElementById('products-next');
  if (pageInfoEl) pageInfoEl.textContent = `Page ${productsTotalCount ? 1 : 0} / 1`;
  if (prevBtn) prevBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;
  catLoading = false;
}

async function loadProducts() {
  const supabase = getSupabase();
  if (!supabase || !tableBody) return;
  detachCategoryLoader();
  categoryMode = false;
  currentProductsPage = 1;
  renderProductsTablePage(currentProductsPage);
}

async function renderProductsTablePage(page) {
  if (!tableBody) return;
  const supabase = getSupabase();
  if (!supabase) return;
  tableBody.innerHTML = '<tr><td colspan="7"><span class="loading"></span></td></tr>';
  try {
    if (!currentCategoryFilter) {
      const from = Math.max(0, (page - 1) * PRODUCTS_PAGE_SIZE);
      const to = from + PRODUCTS_PAGE_SIZE - 1;
      let q = supabase.from('products').select('*', { count: 'exact' }).order('created_at', { ascending: false });
      const { data, error, count } = await q.range(from, to);
      if (error) {
        tableBody.innerHTML = '<tr><td colspan="7">Unable to load products.</td></tr>';
        return;
      }
      const list = Array.isArray(data) ? data : [];
      await getCategoryMap(); // ensure id->name cache ready
      allProducts = list.slice(0, PRODUCTS_PAGE_SIZE);
      productsTotalCount = Number.isFinite(count) ? count : list.length;
      productsTotalPages = Math.max(1, Math.ceil(productsTotalCount / PRODUCTS_PAGE_SIZE));
      currentProductsPage = Math.min(Math.max(1, page), productsTotalPages);
      tableBody.innerHTML = '';
      for (const p of allProducts) {
        tableBody.insertAdjacentHTML('beforeend', rowHtml(p));
      }
      const listTotalEl = document.getElementById('list-total-products');
      if (listTotalEl) listTotalEl.textContent = productsTotalCount;
      if (typeof updateBulkUI === 'function') updateBulkUI();
      const pageInfoEl = document.getElementById('products-page-info');
      const prevBtn = document.getElementById('products-prev');
      const nextBtn = document.getElementById('products-next');
      if (pageInfoEl) {
        pageInfoEl.textContent = `Page ${productsTotalCount ? currentProductsPage : 0} / ${productsTotalPages}`;
      }
      if (prevBtn) prevBtn.disabled = !productsTotalCount || currentProductsPage <= 1;
      if (nextBtn) nextBtn.disabled = !productsTotalCount || currentProductsPage >= productsTotalPages;
    } else {
      await initCategoryMode();
    }
  } catch (_) {
    tableBody.innerHTML = '<tr><td colspan="7">Unable to load products.</td></tr>';
  }
}

function showView(view) {
  if (!homeSection || !productsSection) return; // categoriesSection is optional
  
  homeSection.style.display = 'none';
  productsSection.style.display = 'none';
  if (categoriesSection) categoriesSection.style.display = 'none';

  if (view === 'home') {
    homeSection.style.display = 'block';
  } else if (view === 'categories' && categoriesSection) {
    categoriesSection.style.display = 'block';
    loadCategoriesManagement();
  } else {
    productsSection.style.display = 'block';
    loadFilterCategories();
  }
  try { localStorage.setItem('dashboard_view', view); } catch (_) {}
}

async function loadFilterCategories() {
  if (!filterCategorySelect || filterCategorySelect.dataset.loaded === 'true') return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { data, error } = await supabase.from('categories').select('id,name').order('id', { ascending: true });
  if (error) return;
  (data || [])
    .filter((c) => String(c.name || '').trim().toUpperCase() !== 'REVIEW_NEEDED')
    .forEach((c) => {
      const opt = document.createElement('option');
      opt.value = c.name;
      opt.textContent = c.name;
      opt.dataset.id = String(c.id);
      filterCategorySelect.appendChild(opt);
    });
  // ensure cache for id->name mapping is ready
  await getCategoryMap();
  filterCategorySelect.dataset.loaded = 'true';
}

if (filterCategorySelect) {
  filterCategorySelect.addEventListener('change', () => {
    currentCategoryFilter = filterCategorySelect.value || '';
    const sel = filterCategorySelect.options[filterCategorySelect.selectedIndex];
    const idStr = sel && sel.dataset ? sel.dataset.id : '';
    const idNum = idStr ? Number(idStr) : null;
    currentCategoryFilterId = (Number.isFinite(idNum) && idNum > 0) ? idNum : null;
    loadProducts();
  });
}

async function updateStats() {
  const supabase = getSupabase();
  if (!supabase) {
    console.error('Supabase not ready in updateStats');
    return;
  }
  
  // Fetch Products Stats
  // We use count: 'exact' to get the true total even if data is limited
  const { data, error, count } = await supabase.from('products').select('price, stock', { count: 'exact' });
  if (error) {
    console.error('Error fetching products for stats:', error);
    // Continue to try fetching orders even if products fail
  }
  
  const rows = data || [];
  console.log('Stats - Products fetched:', rows.length, 'Total Count:', count);
  
  const totalProducts = count || rows.length;
  const totalStock = rows.reduce((sum, p) => sum + (parseInt(p.stock) || 0), 0);
  const sumPrice = rows.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const avgPrice = totalProducts ? sumPrice / totalProducts : 0;
  const inventoryValue = rows.reduce((sum, p) => {
    const price = Number(p.price) || 0;
    const stock = parseInt(p.stock) || 0;
    return sum + price * stock;
  }, 0);

  // Fetch Orders Stats
  const { data: orders, error: ordersError } = await supabase.from('orders').select('total_amount');
  if (ordersError) {
    console.error('Error fetching orders for stats:', ordersError);
  }
  
  const totalSales = (orders || []).reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  console.log('Stats - Orders fetched:', (orders || []).length, 'Total Sales:', totalSales);

  const elProducts = document.getElementById('stats-products');
  const elStock = document.getElementById('stats-stock');
  const elAvg = document.getElementById('stats-avg-price');
  const elInv = document.getElementById('stats-inventory');
  const elSales = document.getElementById('stats-sales');

  if (elProducts) elProducts.textContent = String(totalProducts);
  if (elStock) elStock.textContent = String(totalStock);
  if (elAvg) elAvg.textContent = formatRM(avgPrice);
  if (elInv) elInv.textContent = formatRM(inventoryValue);
  if (elSales) elSales.textContent = formatRM(totalSales);
}

if (navMenu) {
  navMenu.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-view]');
    if (!link) return;
    e.preventDefault();
    const view = link.getAttribute('data-view');
    showView(view);
    if (view === 'home') updateStats();
    if (view === 'products') loadProducts();
  });
}
if (toggleSingle) {
  toggleSingle.addEventListener('click', () => {
    singleCard.style.display = singleCard.style.display === 'none' ? 'block' : 'none';
  });
}

if (toggleBulk) {
  toggleBulk.addEventListener('click', () => {
    bulkCard.style.display = bulkCard.style.display === 'none' ? 'block' : 'none';
  });
}

const productsPrevBtn = document.getElementById('products-prev');
const productsNextBtn = document.getElementById('products-next');
if (productsPrevBtn) {
  productsPrevBtn.addEventListener('click', () => {
    renderProductsTablePage(currentProductsPage - 1);
  });
}
if (productsNextBtn) {
  productsNextBtn.addEventListener('click', () => {
    renderProductsTablePage(currentProductsPage + 1);
  });
}

if (singleUpload) {
  singleUpload.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    const supabase = getSupabase();
    if (!supabase) return alert('Supabase client not ready.');
    const newProduct = {
      title: form.title.value.trim(),
      price: parseFloat(form.price.value),
      sku: form.sku.value.trim(),
      stock: parseInt(form.stock.value),
      images: (form.images.value || '')
        .split(',')
        .map((i) => i.trim())
        .filter(Boolean)
    };
    if (!newProduct.title || !Number.isFinite(newProduct.price)) return;
    if (submitBtn) {
      submitBtn.textContent = 'Uploading...';
      addButtonSpinner(submitBtn);
    }
    const fullInsert = {
      title: newProduct.title,
      price: newProduct.price,
      sku: newProduct.sku,
      stock: newProduct.stock,
      images: newProduct.images,
      category: 'UNCATEGORIZED'
    };
    try {
      let { error } = await supabase.from('products').insert([fullInsert]);
      if (error) {
        const fallback = {
          name: newProduct.title,
          price: newProduct.price,
          image_url: newProduct.images[0] || ''
        };
        ({ error } = await supabase.from('products').insert([fallback]));
      }
      if (error) return alert(error.message || 'Unable to save product.');
      alert('Product uploaded!');
      form.reset();
      loadProducts();
    } finally {
      if (submitBtn) {
        submitBtn.textContent = originalText || 'Upload Product';
        removeButtonSpinner(submitBtn);
      }
    }
  });
}

function splitCsvRow(row) {
  const out = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      if (inQuotes && row[i + 1] === '"') {
        buf += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  out.push(buf.trim());
  return out;
}

function normalizeCsvHeader(value) {
  return value
    .replace(/^\uFEFF/, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
    .toLowerCase();
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const headers = splitCsvRow(lines[0]).map((h) => normalizeCsvHeader(h));
  const idxTitle = headers.indexOf('title');
  const idxPrice = headers.indexOf('price');
  const idxDesc = headers.indexOf('description');
  const idxImages = headers.indexOf('images');
  const idxSku = headers.indexOf('sku');
  const idxStock = headers.indexOf('stock');
  let idxCategory = headers.indexOf('category');
  if (idxCategory < 0) idxCategory = headers.indexOf('categories');
  if (idxTitle < 0 || idxPrice < 0) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    const title = cols[idxTitle] || '';
    const price = Number(cols[idxPrice] || 0);
    const description = idxDesc >= 0 ? cols[idxDesc] || '' : '';
    const imagesRaw = idxImages >= 0 ? cols[idxImages] || '' : '';
    const sku = idxSku >= 0 ? cols[idxSku] || '' : '';
    const stock = idxStock >= 0 ? parseInt(cols[idxStock] || '0') : 0;
    const categoryRaw = idxCategory >= 0 ? (cols[idxCategory] || '') : '';
    const cleanedImagesRaw = imagesRaw.replace(/^`|`$/g, '');
    const images = cleanedImagesRaw
      .split(cleanedImagesRaw.includes('|') ? '|' : ',')
      .map((i) => i.trim())
      .filter(Boolean);
    const category = (categoryRaw && categoryRaw.trim()) ? categoryRaw.trim() : 'UNCATEGORIZED';
    if (!title || !Number.isFinite(price)) continue;
    rows.push({ title, price, description, images, sku, stock, category });
  }
  return rows;
}

const csvFileInput = document.getElementById('csvUpload');
const uploadCsvBtn = document.getElementById('uploadCSV');
const uploadStatusEl = document.getElementById('upload-status');
const duplicateInfoEl = document.getElementById('duplicate-info');
const ignoreTitleDupEl = document.getElementById('ignore-duplicate-title');
const uploadProgressEl = document.getElementById('upload-progress');
const uploadProgressBarEl = document.getElementById('upload-progress-bar');
const uploadProgressLabelEl = document.getElementById('upload-progress-label');
let preparedProducts = [];

function normalizeCategoryName(name) {
  return String(name || '').trim().toLowerCase();
}
let __categoryMapCache = null; // { lowerName -> id }
let __categoryIdToNameMapCache = null; // { id -> name }
async function getCategoryMap() {
  if (__categoryMapCache) return __categoryMapCache;
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase.from('categories').select('id,name');
  if (error) return {};
  const map = {};
  const reverse = {};
  (data || []).forEach((c) => {
    const nm = c && c.name ? String(c.name) : '';
    const id = c && c.id ? c.id : null;
    if (!nm || !id) return;
    map[normalizeCategoryName(nm)] = id;
    reverse[id] = nm;
  });
  __categoryMapCache = map;
  __categoryIdToNameMapCache = reverse;
  return map;
}
function categoryNameFromId(id) {
  if (!__categoryIdToNameMapCache) return '';
  return __categoryIdToNameMapCache[id] || '';
}
async function hasProductCategoryTextColumn() {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from('products').select('category').limit(1);
  return !error;
}
function ensureSupabaseReady() {
  const c = getSupabase();
  if (c) return Promise.resolve(c);
  return new Promise((resolve) => {
    window.addEventListener('supabase-ready', () => {
      resolve(getSupabase());
    }, { once: true });
  });
}
async function updateCsvDuplicateInfo(products) {
  if (!duplicateInfoEl || !Array.isArray(products)) return;
  duplicateInfoEl.textContent = 'Checking against existing products...';
  duplicateInfoEl.style.color = 'var(--text-muted)';
  const supabase = await ensureSupabaseReady();
  if (!supabase) {
    if (Array.isArray(allProducts) && allProducts.length) {
      const set = new Set(
        allProducts
          .map((p) => (p && (p.name || p.title)) ? String(p.name || p.title).trim().toLowerCase() : '')
          .filter(Boolean)
      );
      existingProductTitleSet = set;
      const count = products.reduce((acc, p) => {
        const key = (p && p.title ? String(p.title) : '').trim().toLowerCase();
        if (!key) return acc;
        return set.has(key) ? acc + 1 : acc;
      }, 0);
      duplicateInfoEl.textContent = count > 0 ? `Rows with titles already in products: ${count}` : 'No titles in this file match existing products.';
      duplicateInfoEl.style.color = count > 0 ? 'var(--error)' : 'var(--text-muted)';
      return;
    } else {
      duplicateInfoEl.textContent = 'Checking using current list...';
      duplicateInfoEl.style.color = 'var(--text-muted)';
      try {
        await loadProducts();
        const set = new Set(
          allProducts
            .map((p) => (p && (p.name || p.title)) ? String(p.name || p.title).trim().toLowerCase() : '')
            .filter(Boolean)
        );
        existingProductTitleSet = set;
        const count = products.reduce((acc, p) => {
          const key = (p && p.title ? String(p.title) : '').trim().toLowerCase();
          if (!key) return acc;
          return set.has(key) ? acc + 1 : acc;
        }, 0);
        duplicateInfoEl.textContent = count > 0 ? `Rows with titles already in products: ${count}` : 'No titles in this file match existing products.';
        duplicateInfoEl.style.color = count > 0 ? 'var(--error)' : 'var(--text-muted)';
        return;
      } catch (_) {
        duplicateInfoEl.textContent = 'Unable to check duplicates against existing products.';
        duplicateInfoEl.style.color = 'var(--error)';
        return;
      }
    }
  }
  const PAGE_SIZE = 1000;
  let from = 0;
  let loaded = 0;
  let set = new Set();
  while (true) {
    const { data, error } = await supabase
      .from('products')
      .select('name,title')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (Array.isArray(allProducts) && allProducts.length) {
        set = new Set(
          allProducts
            .map((p) => (p && (p.name || p.title)) ? String(p.name || p.title).trim().toLowerCase() : '')
            .filter(Boolean)
        );
        break;
      } else {
        duplicateInfoEl.textContent = 'Checking using current list...';
        duplicateInfoEl.style.color = 'var(--text-muted)';
        try {
          await loadProducts();
          set = new Set(
            allProducts
              .map((p) => (p && (p.name || p.title)) ? String(p.name || p.title).trim().toLowerCase() : '')
              .filter(Boolean)
          );
          break;
        } catch (_) {
          duplicateInfoEl.textContent = 'Unable to check duplicates against existing products.';
          duplicateInfoEl.style.color = 'var(--error)';
          return;
        }
      }
    }
    const chunk = data || [];
    loaded += chunk.length;
    chunk.forEach((p) => {
      const raw = (p && (p.name || p.title)) ? String(p.name || p.title) : '';
      const key = raw.trim().toLowerCase();
      if (!key) return;
      set.add(key);
    });
    if (duplicateInfoEl) {
      duplicateInfoEl.textContent = `Checking... loaded ${loaded}`;
      duplicateInfoEl.style.color = 'var(--text-muted)';
    }
    if (!chunk.length || chunk.length < PAGE_SIZE) break;
    from += chunk.length;
  }
  existingProductTitleSet = set;
  const count = products.reduce((acc, p) => {
    const key = (p && p.title ? String(p.title) : '').trim().toLowerCase();
    if (!key) return acc;
    return set.has(key) ? acc + 1 : acc;
  }, 0);
  if (count > 0) {
    duplicateInfoEl.textContent = `Rows with titles already in products: ${count}`;
    duplicateInfoEl.style.color = 'var(--error)';
  } else {
    duplicateInfoEl.textContent = 'No titles in this file match existing products.';
    duplicateInfoEl.style.color = 'var(--text-muted)';
  }
}

if (csvFileInput && uploadCsvBtn) {
  // 1. Listen for file selection to preview
  csvFileInput.addEventListener('change', async () => {
    uploadCsvBtn.disabled = true;
    uploadCsvBtn.textContent = 'Processing...';
    preparedProducts = [];
    if (uploadStatusEl) uploadStatusEl.textContent = '';
    if (duplicateInfoEl) {
      duplicateInfoEl.textContent = '';
      duplicateInfoEl.style.color = 'var(--text-muted)';
    }
    
    if (!csvFileInput.files.length) {
      uploadCsvBtn.textContent = 'Select File';
      return;
    }
    
    const file = csvFileInput.files[0];
    const text = await file.text();
    const products = parseCsv(text);
    
    if (!products.length) {
      if (uploadStatusEl) uploadStatusEl.textContent = 'No valid products found in CSV.';
      uploadCsvBtn.textContent = 'Select File';
      return;
    }
    
    preparedProducts = products;
    if (uploadStatusEl) {
      uploadStatusEl.textContent = `${products.length} products discovered. Ready to upload.`;
      uploadStatusEl.style.color = 'var(--text-main)';
    }
    existingProductTitleSet = null;
    await updateCsvDuplicateInfo(products);
    uploadCsvBtn.textContent = 'Start Upload';
    uploadCsvBtn.disabled = false;
  });

  // 2. Upload on click
  uploadCsvBtn.addEventListener('click', async () => {
    const supabase = getSupabase();
    if (!supabase) return alert('Supabase client not ready.');
    
    if (!preparedProducts.length) return alert('No products to upload. Please select a valid CSV.');

    const categoryMap = await getCategoryMap();
    const hasCategoryText = await hasProductCategoryTextColumn();

    // Batch upload logic
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;
    let toUpload = preparedProducts.slice();
    if (ignoreTitleDupEl && ignoreTitleDupEl.checked) {
      const filtered = [];
      const set = existingProductTitleSet;
      toUpload.forEach((p) => {
        const key = (p && p.title ? String(p.title) : '').trim().toLowerCase();
        if (set && key && set.has(key)) {
          return;
        }
        filtered.push(p);
      });
      toUpload = filtered;
      if (!toUpload.length) {
        removeButtonSpinner(uploadCsvBtn);
        uploadCsvBtn.textContent = 'Select File';
        uploadCsvBtn.disabled = true;
        if (uploadStatusEl) uploadStatusEl.textContent = 'No products to upload after removing duplicate titles.';
        return;
      }
    }
    
    uploadCsvBtn.textContent = 'Uploading...';
    addButtonSpinner(uploadCsvBtn);
    if (uploadProgressEl && uploadProgressBarEl && uploadProgressLabelEl) {
      uploadProgressEl.style.display = 'block';
      uploadProgressBarEl.style.width = '0%';
      uploadProgressLabelEl.style.display = 'block';
      uploadProgressLabelEl.textContent = '0%';
    }
    const total = toUpload.length;

    for (let i = 0; i < total; i += BATCH_SIZE) {
      const batch = toUpload.slice(i, i + BATCH_SIZE);
      
      // Update status
      if (uploadStatusEl) {
        uploadStatusEl.textContent = `Uploading... ${Math.min(i + BATCH_SIZE, total)} / ${total}`;
      }
      if (uploadProgressBarEl && uploadProgressLabelEl) {
        const completed = Math.min(i + BATCH_SIZE, total);
        const pct = total ? Math.round((completed / total) * 100) : 0;
        uploadProgressBarEl.style.width = `${pct}%`;
        uploadProgressLabelEl.textContent = `${pct}% (${completed}/${total})`;
      }

      // Try primary insert
      const normalizedBatch = batch.map((p) => {
        const catName = p.category || '';
        const catId = categoryMap[normalizeCategoryName(catName)] || null;
        const obj = {
          title: p.title,
          price: p.price,
          description: p.description,
          images: p.images,
          image_url: (p.images && p.images[0]) || '',
          sku: p.sku,
          stock: p.stock
        };
        if (catId) obj.category_id = catId;
        if (hasCategoryText && catName) obj.category = catName;
        return obj;
      });
      let { error } = await supabase.from('products').insert(normalizedBatch);
      
      // Retry with fallback schema if primary fails
      if (error) {
        console.warn('Batch insert failed, trying fallback schema...', error);
        const fallbackBatch = batch.map((p) => {
          const catName = p.category || '';
          const catId = categoryMap[normalizeCategoryName(catName)] || null;
          const obj = {
            name: p.title,
            price: p.price,
            description: p.description,
            image_url: (p.images && p.images[0]) || '',
            sku: p.sku,
            stock: p.stock
          };
          if (catId) obj.category_id = catId;
          if (hasCategoryText && catName) obj.category = catName;
          return obj;
        });
        ({ error } = await supabase.from('products').insert(fallbackBatch));
      }

      if (error) {
        console.error('Batch upload error:', error);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    uploadCsvBtn.textContent = 'Start Upload'; 
    removeButtonSpinner(uploadCsvBtn);
    uploadCsvBtn.disabled = true; 
    // Actually, let's reset the file input so they have to select again
    csvFileInput.value = '';
    preparedProducts = [];
    if (uploadProgressEl && uploadProgressBarEl && uploadProgressLabelEl) {
      uploadProgressBarEl.style.width = '100%';
      uploadProgressLabelEl.textContent = `100% (${total}/${total})`;
      setTimeout(() => {
        uploadProgressEl.style.display = 'none';
        uploadProgressLabelEl.style.display = 'none';
      }, 800);
    }

    if (errorCount > 0) {
      if (uploadStatusEl) uploadStatusEl.textContent = `Upload complete. Success: ${successCount}, Failed: ${errorCount}.`;
      alert(`Upload complete with issues.\nSuccess: ${successCount}\nFailed: ${errorCount}\nCheck console for details.`);
    } else {
      if (uploadStatusEl) uploadStatusEl.textContent = `Successfully uploaded ${successCount} products!`;
      alert(`Successfully uploaded ${successCount} products!`);
    }

    // Ensure category is set for uploaded rows by title/name (in case schema ignored it)
    try {
      for (const p of toUpload) {
        if (!p || !p.category || p.category === 'UNCATEGORIZED') continue;
        const cat = String(p.category).trim();
        if (!cat) continue;
        const title = (p.title || '').trim();
        const catId = categoryMap[normalizeCategoryName(cat)] || null;
        if (!title) continue;
        if (catId) {
          await supabase.from('products').update({ category_id: catId }).eq('title', title);
          await supabase.from('products').update({ category_id: catId }).eq('name', title);
        }
        if (hasCategoryText) {
          await supabase.from('products').update({ category: cat }).eq('title', title);
          await supabase.from('products').update({ category: cat }).eq('name', title);
        }
      }
    } catch (_) {}

    loadProducts();
    // Re-enable button but reset state logic handled by file input change
    uploadCsvBtn.textContent = 'Select File'; 
  });
}

if (tableBody) {
  tableBody.addEventListener('click', async (e) => {
    const supabase = getSupabase();
    if (!supabase) return alert('Supabase client not ready.');
    const del = e.target.closest('button[data-delete]');
    const edit = e.target.closest('button[data-edit]');
    if (del) {
      const id = del.dataset.delete;
      const prevText = del.textContent;
      del.textContent = 'Deleting...';
      addButtonSpinner(del);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        if (error.code === '23503' || error.message.includes('foreign key')) {
           if (confirm('This product is in existing orders. Force delete? (Removes from order history)')) {
             const { error: iErr } = await supabase.from('order_items').delete().eq('product_id', id);
             if (iErr) return alert('Force delete failed: ' + iErr.message);
             const { error: rErr } = await supabase.from('products').delete().eq('id', id);
             if (rErr) return alert('Retry failed: ' + rErr.message);
             loadProducts();
             return;
           }
        }
        alert('Delete failed: ' + error.message);
        del.textContent = prevText;
        removeButtonSpinner(del);
        return;
      }
      loadProducts();
      del.textContent = prevText;
      removeButtonSpinner(del);
    } else if (edit) {
      const id = edit.dataset.edit;
      const { data, error } = await supabase.from('products').select('*').eq('id', id).limit(1).single();
      if (error) return alert('Unable to load product.');
      const layer = document.getElementById('product-edit-layer');
      const form = document.getElementById('edit-product-form');
      const idInput = document.getElementById('edit-product-id');
      const nameInput = document.getElementById('edit-product-name');
      const priceInput = document.getElementById('edit-product-price');
      if (idInput) idInput.value = id;
      if (nameInput) nameInput.value = (data && (data.name || data.title)) || '';
      if (priceInput) priceInput.value = String((data && Number(data.price)) || 0);
      if (layer) layer.style.display = 'flex';
    }
  });
}

// Bulk Actions Logic
const selectAllCheckbox = document.getElementById('select-all');
const bulkToolbar = document.getElementById('bulk-toolbar');
const selectedCountEl = document.getElementById('selected-count');
const btnBulkCategory = document.getElementById('btn-bulk-category');
const btnBulkDelete = document.getElementById('btn-bulk-delete');
const bulkCategorySelect = document.getElementById('bulk-category-select');
const btnBulkAuto = document.getElementById('btn-bulk-auto');
const autoDetectStatusEl = document.getElementById('auto-detect-status');
const btnDuplicateCheck = document.getElementById('btn-duplicate-check');

function updateBulkUI() {
  const checkboxes = document.querySelectorAll('.product-select');
  const checked = document.querySelectorAll('.product-select:checked');
  const count = bulkSelectAllFilter && currentCategoryFilter ? productsTotalCount : checked.length;
  if (selectedCountEl) selectedCountEl.textContent = count;
  if (bulkToolbar) {
    const show = (bulkSelectAllFilter && currentCategoryFilter) || checked.length > 0;
    bulkToolbar.style.display = show ? 'flex' : 'none';
    if (show) {
      loadBulkCategories();
    }
  }
  if (selectAllCheckbox) {
    if (bulkSelectAllFilter && currentCategoryFilter) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = checkboxes.length > 0 && checkboxes.length === checked.length;
      selectAllCheckbox.indeterminate = checked.length > 0 && checked.length < checkboxes.length;
    }
  }
}

async function loadBulkCategories() {
  if (!bulkCategorySelect || bulkCategorySelect.dataset.loaded === 'true') return;
  const supabase = getSupabase();
  if (!supabase) return;
  const { data, error } = await supabase.from('categories').select('name').order('name', { ascending: true });
  if (error) {
    bulkCategorySelect.innerHTML = '<option value="">Unable to load categories</option>';
    bulkCategorySelect.disabled = true;
    if (btnBulkCategory) btnBulkCategory.disabled = true;
    const btnBulkAuto = document.getElementById('btn-bulk-auto');
    if (btnBulkAuto) btnBulkAuto.disabled = true;
    return;
  }
  const names = (data || [])
    .map((r) => (r && r.name ? String(r.name) : ''))
    .filter((name) => name && name.trim().toUpperCase() !== 'REVIEW_NEEDED');
  bulkCategorySelect.innerHTML = '<option value="">Select Category...</option>';
  names.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    bulkCategorySelect.appendChild(opt);
  });
  bulkCategorySelect.disabled = false;
  if (btnBulkCategory) btnBulkCategory.disabled = false;
  const btnBulkAuto2 = document.getElementById('btn-bulk-auto');
  if (btnBulkAuto2) btnBulkAuto2.disabled = false;
  bulkCategorySelect.dataset.loaded = 'true';
}

if (selectAllCheckbox) {
  selectAllCheckbox.addEventListener('change', (e) => {
    const checkboxes = document.querySelectorAll('.product-select');
    if (currentCategoryFilter) {
      bulkSelectAllFilter = e.target.checked;
      // Reflect in visible rows for UX without heavy DOM work
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      updateBulkUI();
    } else {
      checkboxes.forEach(cb => cb.checked = e.target.checked);
      updateBulkUI();
    }
  });
}

if (tableBody) {
  tableBody.addEventListener('change', (e) => {
    if (e.target.classList.contains('product-select')) {
      // If virtual "select all by filter" was active and user unchecks one item, exit virtual mode
      if (bulkSelectAllFilter && currentCategoryFilter && !e.target.checked) {
        bulkSelectAllFilter = false;
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
      }
      updateBulkUI();
    }
  });
}

async function getAllIdsForCurrentFilter() {
  const supabase = getSupabase();
  if (!supabase) return [];
  let q = supabase.from('products').select('id');
  if (currentCategoryFilter === 'UNCATEGORIZED') {
    q = q.or('category_id.is.null,category.is.null,category.eq.UNCATEGORIZED,category.eq.,category.eq.REVIEW_NEEDED');
  } else {
    if (currentCategoryFilterId && Number.isFinite(currentCategoryFilterId)) {
      const name = String(currentCategoryFilter || '');
      q = q.or(`category_id.eq.${currentCategoryFilterId},category.eq.${name}`);
    } else {
      q = q.eq('category', currentCategoryFilter);
    }
  }
  const PAGE = 1000;
  let from = 0;
  let ids = [];
  while (true) {
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) break;
    if (!data || !data.length) break;
    ids = ids.concat((data || []).map((r) => r.id));
    if (data.length < PAGE) break;
    from += PAGE;
    if (ids.length >= productsTotalCount) break;
  }
  return ids;
}
async function getSelectedIds() {
  if (currentCategoryFilter && bulkSelectAllFilter) {
    return await getAllIdsForCurrentFilter();
  }
  return Array.from(document.querySelectorAll('.product-select:checked')).map(cb => cb.value);
}

if (btnBulkDelete) {
  btnBulkDelete.addEventListener('click', async () => {
    const ids = await getSelectedIds();
    if (!ids.length) return;
    
    // Batch delete to avoid URL length limits and handle errors progressively
    const BATCH_SIZE = 50;
    let deletedCount = 0;
    let forceDelete = false;
    let errorMsg = '';
    
    btnBulkDelete.textContent = 'Deleting...';
    addButtonSpinner(btnBulkDelete);
    
    const supabase = getSupabase();

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        
        // If force delete was authorized previously, clean up dependencies first
        if (forceDelete) {
            const { error: itemErr } = await supabase.from('order_items').delete().in('product_id', chunk);
            if (itemErr) console.error('Error clearing order items:', itemErr);
        }

        let { error } = await supabase.from('products').delete().in('id', chunk);
        
        if (error) {
             // Check for Foreign Key Violation
             if ((error.code === '23503' || error.message.includes('foreign key')) && !forceDelete) {
                  if (confirm('Some products are associated with existing orders. Force delete ALL selected items? (This removes them from order records)')) {
                       forceDelete = true;
                       
                       // Retry this chunk with cleanup
                       const { error: itemErr } = await supabase.from('order_items').delete().in('product_id', chunk);
                       if (itemErr) {
                           errorMsg = 'Failed to clear order history: ' + itemErr.message;
                           break;
                       }
                       
                       const { error: retryError } = await supabase.from('products').delete().in('id', chunk);
                       if (retryError) {
                           errorMsg = 'Retry failed: ' + retryError.message;
                           break;
                       }
                       deletedCount += chunk.length;
                  } else {
                       errorMsg = 'Cancelled by user due to order dependencies.';
                       break;
                  }
             } else {
                  errorMsg = error.message;
                  break;
             }
        } else {
             deletedCount += chunk.length;
        }
    }
    
    btnBulkDelete.textContent = 'Delete Selected';
    removeButtonSpinner(btnBulkDelete);

    if (deletedCount > 0) {
        alert(`Successfully deleted ${deletedCount} products.` + (errorMsg ? ` Stopped: ${errorMsg}` : ''));
        loadProducts();
        if (bulkToolbar) bulkToolbar.style.display = 'none';
        bulkSelectAllFilter = false;
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
    } else if (errorMsg) {
        alert('Delete failed: ' + errorMsg);
    }
  });
}

if (btnBulkCategory) {
  btnBulkCategory.addEventListener('click', async () => {
    const category = bulkCategorySelect ? bulkCategorySelect.value : '';
    
    const ids = await getSelectedIds();
    if (!ids.length) return;
    if (!category) return alert('Please select a category.');
    
    const supabase = getSupabase();
    if (!supabase) return;
    
    // Batch update
    const BATCH_SIZE = 50;
    let updatedCount = 0;
    btnBulkCategory.textContent = 'Updating...';
    addButtonSpinner(btnBulkCategory);

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const chunk = ids.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('products').update({ category: category }).in('id', chunk);
        
        if (error) {
            console.error(error);
            alert('Batch update failed: ' + error.message);
            break;
        }
        updatedCount += chunk.length;
    }

    btnBulkCategory.textContent = 'Set Category';
    removeButtonSpinner(btnBulkCategory);

    if (updatedCount > 0) {
      alert(`Updated ${updatedCount} products!`);
      loadProducts();
      if (bulkToolbar) bulkToolbar.style.display = 'none';
      bulkSelectAllFilter = false;
      if (selectAllCheckbox) selectAllCheckbox.checked = false;
      if (bulkCategorySelect) bulkCategorySelect.value = '';
    }
  });
}

if (btnBulkAuto) {
  btnBulkAuto.addEventListener('click', async () => {
    const ids = await getSelectedIds();
    if (!ids.length) return;
    const supabase = getSupabase();
    if (!supabase) return;
    btnBulkAuto.textContent = 'Detecting...';
    addButtonSpinner(btnBulkAuto);
    const totalSelected = ids.length;
    if (autoDetectStatusEl) autoDetectStatusEl.textContent = `Detecting... 0 / ${totalSelected} | candidates 0 | updated 0`;
    const cats = await getCategoryNames();
    const matchers = compileMatchers(cats);
    let updatedCount = 0;
    let scannedCount = 0;
    let targetsSeen = 0;
    const CHUNK = 100;
    const chunks = [];
    for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));
    const CONCURRENCY = 4;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const slice = chunks.slice(i, i + CONCURRENCY);
      await Promise.all(
        slice.map(async (chunk) => {
          const loadFn = async () => {
            const { data, error } = await supabase.from('products').select('id,name,description,category').in('id', chunk);
            if (error) throw new Error(error.message);
            return data || [];
          };
          let rows;
          try {
            rows = await retryOp(loadFn, 3, 700);
          } catch (e) {
            return;
          }
          scannedCount += rows.length;
          const targets = rows.filter((p) => {
            const cat = p && p.category ? String(p.category).trim().toUpperCase() : '';
            return !cat || cat === 'REVIEW_NEEDED' || cat === 'UNCATEGORIZED';
          });
          targetsSeen += targets.length;
          if (!targets.length) {
            if (autoDetectStatusEl) autoDetectStatusEl.textContent = `Detecting... ${Math.min(scannedCount, totalSelected)} / ${totalSelected} | candidates ${targetsSeen} | updated ${updatedCount}`;
            return;
          }
          const groups = {};
          for (const p of targets) {
            const title = (p && p.name) || '';
            const desc = (p && p.description) || '';
            const rawCat = detectCategoryFast(title, desc, matchers);
            const cat = !rawCat || rawCat === 'REVIEW_NEEDED' ? 'UNCATEGORIZED' : rawCat;
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(p.id);
          }
          const UPDATE_BATCH = 50;
          const catsList = Object.keys(groups);
          for (let k = 0; k < catsList.length; k += 1) {
            const cat = catsList[k];
            const idsForCat = groups[cat];
            for (let j = 0; j < idsForCat.length; j += UPDATE_BATCH) {
              const sub = idsForCat.slice(j, j + UPDATE_BATCH);
              const updateFn = async () => {
                const { error: uErr } = await supabase.from('products').update({ category: cat }).in('id', sub);
                if (uErr) throw new Error(uErr.message);
              };
              try {
                await retryOp(updateFn, 3, 700);
                updatedCount += sub.length;
              } catch (_) {}
            }
          }
          if (autoDetectStatusEl) autoDetectStatusEl.textContent = `Detecting... ${Math.min(scannedCount, totalSelected)} / ${totalSelected} | candidates ${targetsSeen} | updated ${updatedCount}`;
        })
      );
    }
    btnBulkAuto.textContent = 'Auto Detect';
    removeButtonSpinner(btnBulkAuto);
    if (autoDetectStatusEl) autoDetectStatusEl.textContent = `Done: scanned ${scannedCount} / ${totalSelected} | candidates ${targetsSeen} | updated ${updatedCount}`;
    if (updatedCount > 0) {
      alert(`Updated ${updatedCount} products!`);
      loadProducts();
      if (bulkToolbar) bulkToolbar.style.display = 'none';
      bulkSelectAllFilter = false;
      if (selectAllCheckbox) selectAllCheckbox.checked = false;
      if (bulkCategorySelect) bulkCategorySelect.value = '';
    }
  });
}

if (btnDuplicateCheck) {
  btnDuplicateCheck.addEventListener('click', async () => {
    const ids = await getSelectedIds();
    if (!ids.length) return;
    if (ids.length < 2) {
      alert('Select at least 2 products to check duplicates.');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return alert('Supabase client not ready.');
    btnDuplicateCheck.textContent = 'Checking...';
    addButtonSpinner(btnDuplicateCheck);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,title,sku,description')
      .in('id', ids);
    btnDuplicateCheck.textContent = 'Duplicate Checker';
    removeButtonSpinner(btnDuplicateCheck);
    if (error) {
      alert('Unable to load products for duplicate check.');
      return;
    }
    const rows = data || [];
    const bySku = {};
    rows.forEach((p) => {
      const sku = (p && p.sku ? String(p.sku) : '').trim().toLowerCase();
      if (sku) {
        if (!bySku[sku]) bySku[sku] = [];
        bySku[sku].push(p);
      }
    });
    const lines = [];
    Object.keys(bySku).forEach((key) => {
      if (bySku[key].length > 1) {
        const idsLine = bySku[key].map((p) => p.id).join(', ');
        lines.push(`Exact SKU match "${key}" -> IDs: ${idsLine}`);
      }
    });
    function normalizeText(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    }
    function textTokens(value) {
      return normalizeText(value)
        .split(/\s+/)
        .filter((w) => w.length >= 3);
    }
    function similarityScore(tokensA, tokensB) {
      if (!tokensA.length || !tokensB.length) return 0;
      const setA = new Set(tokensA);
      const setB = new Set(tokensB);
      let intersection = 0;
      setA.forEach((t) => {
        if (setB.has(t)) intersection += 1;
      });
      const union = setA.size + setB.size - intersection;
      if (!union) return 0;
      return intersection / union;
    }
    const SIM_THRESHOLD = 0.5;
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i];
        const b = rows[j];
        const textA = `${a && (a.name || a.title) ? a.name || a.title : ''} ${a && a.description ? a.description : ''}`;
        const textB = `${b && (b.name || b.title) ? b.name || b.title : ''} ${b && b.description ? b.description : ''}`;
        const tokensA = textTokens(textA);
        const tokensB = textTokens(textB);
        const score = similarityScore(tokensA, tokensB);
        if (score >= SIM_THRESHOLD) {
          const labelA = (a && (a.name || a.title)) || '';
          const labelB = (b && (b.name || b.title)) || '';
          lines.push(
            `Similar text (score ${score.toFixed(2)}): ID ${a.id} "${labelA}" ↔ ID ${b.id} "${labelB}"`
          );
        }
      }
    }
    if (!lines.length) {
      alert('No duplicates found among selected products.');
    } else {
      alert('Possible duplicates:\n\n' + lines.join('\n'));
    }
  });
}

function initDashboard() {
  const saved = (() => { try { return localStorage.getItem('dashboard_view'); } catch (_) { return null; } })() || 'products';
  showView(saved);
  if (saved === 'products') loadProducts();
  if (saved === 'home') updateStats();
}
if (getSupabase()) {
  initDashboard();
} else {
  window.addEventListener('supabase-ready', () => {
    initDashboard();
  });
}

/* Categories Management Logic */
const btnCancelEdit = document.getElementById('btn-cancel-edit');
const btnSaveCategory = document.getElementById('btn-save-category');
const editCategoryIdInput = document.getElementById('edit-category-id');
const categoryFormTitle = document.getElementById('category-form-title');

function addButtonSpinner(btn) {
  if (!btn) return;
  btn.disabled = true;
  if (!btn.querySelector('.loading')) {
    const sp = document.createElement('span');
    sp.className = 'loading';
    sp.style.marginLeft = '8px';
    btn.appendChild(sp);
  }
}
function removeButtonSpinner(btn) {
  if (!btn) return;
  const sp = btn.querySelector('.loading');
  if (sp) sp.remove();
  btn.disabled = false;
}

async function loadCategoriesManagement() {
  if (!categoriesTableBody) return;
  const supabase = getSupabase();
  if (!supabase) return;
  
  categoriesTableBody.innerHTML = '<tr><td colspan="6"><span class="loading"></span></td></tr>';
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id', { ascending: true });
  
  if (error) {
    if (error.code === '42P01') { // undefined_table
       categoriesTableBody.innerHTML = '<tr><td colspan="6">Table "categories" does not exist. Please create it in Supabase.</td></tr>';
    } else {
       categoriesTableBody.innerHTML = '<tr><td colspan="6">Error loading categories.</td></tr>';
       console.error(error);
    }
    return;
  }
  
  categoriesTableBody.innerHTML = '';
  if (!data || data.length === 0) {
    categoriesTableBody.innerHTML = '<tr><td colspan="6">No categories found.</td></tr>';
    return;
  }

  let categoryCounts = {};
  const { data: productsForCount, error: productsErr } = await supabase
    .from('products')
    .select('category');
  if (!productsErr && productsForCount) {
    productsForCount.forEach((p) => {
      const key = p && p.category ? String(p.category) : '';
      if (!key) return;
      categoryCounts[key] = (categoryCounts[key] || 0) + 1;
    });
  }

  (data || []).forEach((c, i) => {
    const rawName = c && c.name ? String(c.name) : '';
    if (rawName.trim().toUpperCase() === 'REVIEW_NEEDED') return;
    const displayName = rawName;
    const img = productImageUrl(c.image_url || '');
    const desc = c.description || '-';
    // Escape single quotes for the onclick handler
    const safeName = (c.name || '').replace(/'/g, "\\'");
    const safeImg = (c.image_url || '').replace(/'/g, "\\'");
    const safeDesc = (c.description || '').replace(/'/g, "\\'");

    categoriesTableBody.insertAdjacentHTML('beforeend', `
      <tr>
        <td>${i + 1}</td>
        <td class="img-cell">${img ? `<img src="${img}" alt="${displayName}">` : ''}</td>
        <td>${displayName}</td>
        <td><div style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${desc}</div></td>
        <td>${categoryCounts[c.name] || 0}</td>
        <td>
           <button class="btn btn-outline" style="padding: 2px 8px; font-size: 12px;" 
             onclick="startEditCategory('${c.id}', '${safeName}', '${safeImg}', '${safeDesc}')">Edit</button>
           <button class="btn btn-primary" style="padding: 2px 8px; font-size: 12px; background:#e53e3e; border-color:#e53e3e;" 
             onclick="deleteCategory('${c.id}', this)">Delete</button>
        </td>
      </tr>
    `);
  });
}

const editLayer = document.getElementById('category-edit-layer');
const editForm = document.getElementById('edit-category-form');
const editModalId = document.getElementById('edit-modal-id');
const editNameInput = document.getElementById('edit-category-name');
const editFileInput = document.getElementById('edit-category-file');
const editDescInput = document.getElementById('edit-category-desc');
const editExistingImg = document.getElementById('edit-existing-image');
const btnCloseEditModal = document.getElementById('btn-close-edit-modal');
const btnCancelEditModal = document.getElementById('btn-cancel-edit-modal');

function openEditModal() {
  if (editLayer) editLayer.style.display = 'flex';
}
function closeEditModal() {
  if (editLayer) editLayer.style.display = 'none';
  if (editForm) editForm.reset();
  if (editModalId) editModalId.value = '';
  if (editExistingImg) editExistingImg.value = '';
}

window.startEditCategory = (id, name, img, desc) => {
  if (editModalId) editModalId.value = id;
  if (editNameInput) editNameInput.value = name;
  if (editExistingImg) editExistingImg.value = img;
  if (editDescInput) editDescInput.value = desc === 'null' ? '' : desc;
  if (editFileInput) editFileInput.value = '';
  openEditModal();
};

function resetCategoryForm() {
  if (createCategoryForm) createCategoryForm.reset();
  if (editCategoryIdInput) editCategoryIdInput.value = '';
  if (btnSaveCategory) btnSaveCategory.textContent = 'Add Category';
  if (categoryFormTitle) categoryFormTitle.textContent = 'Manage Categories';
  if (btnCancelEdit) btnCancelEdit.style.display = 'none';
  const fileInput = document.getElementById('new-category-file');
  if (fileInput) fileInput.required = true;
  const existingImgInput = document.getElementById('existing-category-image');
  if (existingImgInput) existingImgInput.value = '';
}

if (btnCloseEditModal) btnCloseEditModal.addEventListener('click', closeEditModal);
if (btnCancelEditModal) btnCancelEditModal.addEventListener('click', closeEditModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeEditModal();
});
if (editLayer) {
  editLayer.addEventListener('click', (e) => {
    if (e.target === editLayer) closeEditModal();
  });
}

const productEditLayer = document.getElementById('product-edit-layer');
const productEditForm = document.getElementById('edit-product-form');
const editProductId = document.getElementById('edit-product-id');
const editProductName = document.getElementById('edit-product-name');
const editProductPrice = document.getElementById('edit-product-price');
const btnCloseProductEdit = document.getElementById('btn-close-product-edit');
const btnCancelProductEdit = document.getElementById('btn-cancel-product-edit');

function openProductEditModal() {
  if (productEditLayer) productEditLayer.style.display = 'flex';
}
function closeProductEditModal() {
  if (productEditLayer) productEditLayer.style.display = 'none';
  if (productEditForm) productEditForm.reset();
  if (editProductId) editProductId.value = '';
}
if (btnCloseProductEdit) btnCloseProductEdit.addEventListener('click', closeProductEditModal);
if (btnCancelProductEdit) btnCancelProductEdit.addEventListener('click', closeProductEditModal);
if (productEditLayer) {
  productEditLayer.addEventListener('click', (e) => {
    if (e.target === productEditLayer) closeProductEditModal();
  });
}
if (productEditForm) {
  productEditForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) return;
    const id = editProductId ? editProductId.value : '';
    const name = editProductName ? editProductName.value.trim() : '';
    const price = editProductPrice ? Number(editProductPrice.value) : NaN;
    if (!id || !name || !Number.isFinite(price)) return;
    const saveBtn = document.getElementById('btn-save-product-edit');
    const prev = saveBtn ? saveBtn.textContent : '';
    if (saveBtn) { saveBtn.textContent = 'Saving...'; saveBtn.disabled = true; saveBtn.classList.add('loading'); }
    const { error } = await supabase.from('products').update({ name, price }).eq('id', id);
    if (saveBtn) { saveBtn.textContent = prev; saveBtn.disabled = false; saveBtn.classList.remove('loading'); }
    if (error) return alert('Update failed.');
    closeProductEditModal();
    loadProducts();
  });
}
window.deleteCategory = async (id, btn) => {
  if (!confirm('Delete this category?')) return;
  const supabase = getSupabase();
  addButtonSpinner(btn);
  const { error } = await supabase.from('categories').delete().eq('id', id);
  removeButtonSpinner(btn);
  if (error) alert('Error deleting: ' + error.message);
  else loadCategoriesManagement();
};

if (createCategoryForm) {
  createCategoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nameInput = document.getElementById('new-category-name');
    const fileInput = document.getElementById('new-category-file');
    const descInput = document.getElementById('new-category-desc');
    const saveBtn = document.getElementById('btn-save-category');
    
    const name = nameInput.value.trim();
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;
    const description = descInput.value.trim();

    if (!name) return alert('Category name is required');
    if (!file) return alert('Category image is required');
    
    const supabase = getSupabase();
    
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const path = `categories/${safeName}-${Date.now()}.${ext}`;
    addButtonSpinner(saveBtn);
    const { data: uploadData, error: uploadError } = await supabase.storage.from('products-images').upload(path, file, { upsert: true });
    if (uploadError) {
      alert('Upload failed: ' + uploadError.message);
      removeButtonSpinner(saveBtn);
      return;
    }
    const image_url = (uploadData && uploadData.path) ? uploadData.path : path;
    
    const { error } = await supabase
      .from('categories')
      .insert([{ name, image_url, description }]);
      
    if (error) {
       if (error.code === '42P01') alert('Table "categories" missing. Please create it in Supabase.');
       else alert('Error adding category: ' + error.message);
    } else {
       resetCategoryForm();
       loadCategoriesManagement();
    }
    removeButtonSpinner(saveBtn);
  });
}

if (editForm) {
  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = editModalId ? editModalId.value : '';
    const name = editNameInput ? editNameInput.value.trim() : '';
    const file = editFileInput && editFileInput.files ? editFileInput.files[0] : null;
    const description = editDescInput ? editDescInput.value.trim() : '';
    const existingPath = editExistingImg ? editExistingImg.value : '';
    const saveEditBtn = document.getElementById('btn-save-edit');
    if (!id) return closeEditModal();
    if (!name) return alert('Category name is required');
    const supabase = getSupabase();
    
    let image_url = existingPath;
    addButtonSpinner(saveEditBtn);
    if (file) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const safeName = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const path = `categories/${safeName}-${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('products-images').upload(path, file, { upsert: true });
      if (uploadError) {
        alert('Upload failed: ' + uploadError.message);
        removeButtonSpinner(saveEditBtn);
        return;
      }
      image_url = uploadData && uploadData.path ? uploadData.path : path;
    }
    
    const { error } = await supabase
      .from('categories')
      .update({ name, image_url, description })
      .eq('id', id);
    if (error) {
      alert('Error updating category: ' + error.message);
    } else {
      closeEditModal();
      loadCategoriesManagement();
    }
    removeButtonSpinner(saveEditBtn);
  });
}
