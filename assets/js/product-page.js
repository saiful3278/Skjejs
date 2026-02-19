const titleEl = document.getElementById('product-title');
const priceEl = document.getElementById('product-price');
const descFullEl = document.getElementById('product-desc-full');
const descDetailsEl = document.getElementById('product-desc-details');
const featureListEl = document.getElementById('feature-list');
const mediaEl = document.getElementById('product-media');
const addBtn = document.getElementById('product-add');
const sliderEl = document.getElementById('product-slider');
const slidesEl = document.getElementById('product-slides');
const thumbsEl = document.getElementById('product-thumbs');
const prevBtn = document.getElementById('slide-prev');
const nextBtn = document.getElementById('slide-next');
const stockEl = document.getElementById('product-stock');
const skuEl = document.getElementById('product-sku');
const badgeEl = document.getElementById('discount-badge');
const qtyInput = document.getElementById('product-qty');
const qtyMinus = document.getElementById('qty-minus');
const qtyPlus = document.getElementById('qty-plus');
const buyBtn = document.getElementById('product-buy');
const deliveryLocationEl = document.getElementById('delivery-location');
const deliveryDateEl = document.getElementById('delivery-date');
const shippingCostEl = document.getElementById('shipping-cost');
const relatedRow = document.getElementById('related-row');
const recentRow = document.getElementById('recent-row');
const relPrev = document.getElementById('rel-prev');
const relNext = document.getElementById('rel-next');
const rvPrev = document.getElementById('rv-prev');
const rvNext = document.getElementById('rv-next');

let currentIndex = 0;
let totalSlides = 0;
let productData = null;

(function normalizePath() {
  try {
    const p = window.location && window.location.pathname;
    if (!p) return;
    if (p.endsWith('/product.html') || p.endsWith('product.html')) {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      history.replaceState({}, '', `/product${search}${hash}`);
    }
  } catch (_) {}
})();

function showSkeleton() {
  if (slidesEl) {
    slidesEl.innerHTML = '<div class="skeleton-block skeleton-media skeleton-static"></div>';
  }
  if (titleEl) {
    titleEl.innerHTML = '<span class="skeleton-line skeleton-static" style="width:60%"></span>';
  }
  if (priceEl) {
    priceEl.innerHTML = '<span class="skeleton-line skeleton-static" style="width:35%"></span>';
  }
}

function setSlide(i) {
  if (!slidesEl) return;
  currentIndex = Math.max(0, Math.min(i, totalSlides - 1));
  slidesEl.style.transform = `translateX(-${currentIndex * 100}%)`;
  const allThumbs = thumbsEl ? Array.from(thumbsEl.querySelectorAll('.thumb')) : [];
  allThumbs.forEach((t, idx) => t.classList.toggle('active', idx === currentIndex));
  const imgs = Array.from(slidesEl.querySelectorAll('.slide-img'));
  imgs.forEach((img) => {
    img.classList.remove('zoomed');
    img.style.setProperty('--scale', 1);
    img.style.setProperty('--tx', '0px');
    img.style.setProperty('--ty', '0px');
  });
}

function attachSwipe() {
  if (!sliderEl) return;
  let startX = 0;
  let moveX = 0;
  sliderEl.addEventListener('pointerdown', (e) => {
    const img = slidesEl && slidesEl.querySelectorAll('.slide-img')[currentIndex];
    if (img && img.classList.contains('zoomed')) return;
    startX = e.clientX;
    moveX = 0;
    sliderEl.setPointerCapture(e.pointerId);
  });
  sliderEl.addEventListener('pointermove', (e) => {
    if (!startX) return;
    moveX = e.clientX - startX;
  });
  sliderEl.addEventListener('pointerup', () => {
    if (!startX) return;
    const threshold = 40;
    if (moveX > threshold) setSlide(currentIndex - 1);
    else if (moveX < -threshold) setSlide(currentIndex + 1);
    startX = 0;
    moveX = 0;
  });
}

function makeSlug(s) {
  const base = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base ? base + '-' : '';
}
function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function toks(s) {
  return norm(s).split(/\s+/).filter(Boolean);
}
function firstToken(s) {
  const arr = toks(s);
  return arr.length ? arr[0] : '';
}

function attachZoom() {
  if (!slidesEl) return;
  const imgs = Array.from(slidesEl.querySelectorAll('.slide-img'));
  imgs.forEach((img) => {
    let drag = null;
    img.addEventListener('click', () => {
      const isZoom = img.classList.toggle('zoomed');
      img.style.setProperty('--scale', isZoom ? 2 : 1);
      if (!isZoom) {
        img.style.setProperty('--tx', '0px');
        img.style.setProperty('--ty', '0px');
      }
    });
    img.addEventListener('pointerdown', (e) => {
      if (!img.classList.contains('zoomed')) return;
      drag = {
        x: e.clientX,
        y: e.clientY,
        tx: parseFloat(img.style.getPropertyValue('--tx') || '0'),
        ty: parseFloat(img.style.getPropertyValue('--ty') || '0')
      };
      img.setPointerCapture(e.pointerId);
    });
    img.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      img.style.setProperty('--tx', `${drag.tx + dx}px`);
      img.style.setProperty('--ty', `${drag.ty + dy}px`);
    });
    img.addEventListener('pointerup', () => {
      drag = null;
    });
  });
}

function miniCard(p) {
  const name = p.name || p.title || '';
  const url = productImageUrl(p.image_url || (Array.isArray(p.images) && p.images[0]) || '');
  const slug = makeSlug(name);
  return `<a class="mini-card" href="/product?slug=${encodeURIComponent(slug)}">
    <div class="mini-thumb">${url ? `<img src="${url}" alt="${name}">` : ''}</div>
    <div class="mini-title">${name}</div>
    <div class="mini-price">${formatRM(Number(p.price || 0))}</div>
  </a>`;
}

function renderRow(container, list) {
  if (!container) return;
  container.innerHTML = (list || []).map(miniCard).join('');
}

function attachRowScroll(container, prevBtn, nextBtn) {
  if (!container) return;
  const amount = 320;
  if (prevBtn) prevBtn.addEventListener('click', () => container.scrollBy({ left: -amount, behavior: 'smooth' }));
  if (nextBtn) nextBtn.addEventListener('click', () => container.scrollBy({ left: amount, behavior: 'smooth' }));
}

function updateRecentlyViewed(p) {
  try {
    const key = 'recent_products';
    const raw = localStorage.getItem(key);
    let arr = raw ? JSON.parse(raw) : [];
    arr = arr.filter((x) => x && x.id !== p.id);
    arr.unshift({ id: p.id, name: p.name, price: p.price, image_url: p.image_url });
    arr = arr.slice(0, 12);
    localStorage.setItem(key, JSON.stringify(arr));
  } catch (_) {}
}

function loadRecent(currentId) {
  try {
    const raw = localStorage.getItem('recent_products');
    const arr = raw ? JSON.parse(raw) : [];
    const list = arr.filter((x) => x && x.id !== currentId);
    renderRow(recentRow, list);
    attachRowScroll(recentRow, rvPrev, rvNext);
  } catch (_) {}
}

async function loadRelated(currentId) {
  const client = window.supabaseClient;
  if (!client) return;
  const { data, error } = await client.from('products').select('*').limit(12);
  if (error || !data) {
    renderRow(relatedRow, []);
    return;
  }
  const list = data
    .filter((p) => p.id !== currentId)
    .map((p) => ({
      id: p.id,
      name: p.name || p.title || '',
      price: Number(p.price || 0),
      image_url: Array.isArray(p.images) && p.images.length ? p.images[0] : (p.image_url || '')
    }));
  renderRow(relatedRow, list);
  attachRowScroll(relatedRow, relPrev, relNext);
}

async function loadProduct() {
  const client = window.supabaseClient;
  if (!client || !titleEl || !priceEl || !mediaEl || !addBtn) return;
  showSkeleton();
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const slugParamRaw = params.get('slug') || '';
  const slugParam = String(slugParamRaw || '').toLowerCase();
  let data = null;
  if (id) {
    const res = await client.from('products').select('*').eq('id', id).single();
    if (!res.error && res.data) data = res.data;
  } else if (slugParam) {
    const slugLower = slugParam.endsWith('-') ? slugParam : `${slugParam}-`;
    const token = firstToken(slugParam.replace(/-/g, ' '));
    let found = null;
    if (token) {
      let from = 0;
      const pageSize = 1000;
      while (!found) {
        const r1 = await client
          .from('products')
          .select('*')
          .ilike('name', `%${token}%`)
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (r1.error || !Array.isArray(r1.data) || !r1.data.length) break;
        for (let i = 0; i < r1.data.length; i++) {
          const p = r1.data[i];
          const nm = p.name || p.title || '';
          if (makeSlug(nm).toLowerCase() === slugLower) { found = p; break; }
        }
        if (found) break;
        if (r1.data.length < pageSize) break;
        from += pageSize;
      }
      if (!found) {
        let from2 = 0;
        const pageSize2 = 1000;
        while (!found) {
          const r2 = await client
            .from('products')
            .select('*')
            .ilike('title', `%${token}%`)
            .order('created_at', { ascending: false })
            .range(from2, from2 + pageSize2 - 1);
          if (r2.error || !Array.isArray(r2.data) || !r2.data.length) break;
          for (let i = 0; i < r2.data.length; i++) {
            const p = r2.data[i];
            const nm = p.name || p.title || '';
            if (makeSlug(nm).toLowerCase() === slugLower) { found = p; break; }
          }
          if (found) break;
          if (r2.data.length < pageSize2) break;
          from2 += pageSize2;
        }
      }
    } else {
      let from3 = 0;
      const pageSize3 = 1000;
      while (!found) {
        const r3 = await client
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from3, from3 + pageSize3 - 1);
        if (r3.error || !Array.isArray(r3.data) || !r3.data.length) break;
        for (let i = 0; i < r3.data.length; i++) {
          const p = r3.data[i];
          const nm = p.name || p.title || '';
          if (makeSlug(nm).toLowerCase() === slugLower) { found = p; break; }
        }
        if (found) break;
        if (r3.data.length < pageSize3) break;
        from3 += pageSize3;
      }
    }
    if (found) data = found;
  }
  if (!data) {
    if (descFullEl) descFullEl.textContent = 'Product not found.';
    return;
  }
  productData = {
    id: data.id,
    name: data.name || data.title || 'Product',
    price: Number(data.price || 0),
    image_url: Array.isArray(data.images) && data.images.length ? data.images[0] : (data.image_url || '')
  };
  const title = productData.name;
  titleEl.textContent = title;
  const price = productData.price;
  const saleRaw = data.sale_price ?? data.discount_price ?? null;
  const sale = saleRaw != null ? Number(saleRaw) : NaN;
  const hasDiscount = Number.isFinite(sale) && sale > 0 && sale < price;
  if (hasDiscount) {
    const pct = Math.round((1 - sale / price) * 100);
    priceEl.innerHTML = `<span class="price-regular">${formatRM(price)}</span> <span class="price-discount">${formatRM(sale)}</span>`;
    if (badgeEl) {
      badgeEl.textContent = `-${pct}%`;
      badgeEl.style.display = 'inline-block';
    }
  } else {
    priceEl.textContent = formatRM(price);
    if (badgeEl) badgeEl.style.display = 'none';
  }
  if (stockEl) {
    const s = Number(data.stock);
    if (Number.isFinite(s)) {
      if (s <= 0) stockEl.textContent = 'Out of Stock';
      else if (s <= 5) stockEl.textContent = `Only ${s} left`;
      else stockEl.textContent = 'In Stock';
    } else {
      stockEl.textContent = '';
    }
  }
  if (skuEl) {
    const sku = data.sku || '';
    skuEl.textContent = sku ? `${sku}` : '';
  }
  const descriptionText = data.description || 'No description available.';
  if (descFullEl) descFullEl.textContent = descriptionText;
  if (featureListEl) {
    if (Array.isArray(data.features) && data.features.length) {
      featureListEl.innerHTML = data.features
        .slice(0, 5)
        .map((f) => `<li class="feature-item"><span class="feature-icon">✓</span><span>${f}</span></li>`)
        .join('');
    } else {
      featureListEl.innerHTML = [
        '1 month warranty',
        'Self-damage not covered'
      ]
        .map((f) => `<li class="feature-item"><span class="feature-icon">✓</span><span>${f}</span></li>`)
        .join('');
    }
  }
  const paths = Array.isArray(data.images) && data.images.length ? data.images : (data.image_url ? [data.image_url] : []);
  const urls = paths.map((p) => productImageUrl(p)).filter(Boolean);
  if (slidesEl) {
    slidesEl.innerHTML = urls.map((u) => `<div class="slide"><img class="slide-img" src="${u}" alt="${data.name}"></div>`).join('');
    totalSlides = urls.length || 1;
    setSlide(0);
    attachSwipe();
    attachZoom();
  }
  if (thumbsEl) {
    thumbsEl.innerHTML = urls.slice(0, 8).map((u, idx) => `<button class="thumb ${idx === 0 ? 'active' : ''}" data-idx="${idx}"><img src="${u}" alt=""></button>`).join('');
    thumbsEl.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-idx]');
      if (!b) return;
      setSlide(Number(b.dataset.idx));
    });
  }
  addBtn.addEventListener('click', () => {
    const qty = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;
    for (let i = 0; i < qty; i++) addToCart(productData);
    if (window.flyToCartFrom) window.flyToCartFrom(document.querySelector('.media-slider img') || addBtn);
    setTimeout(() => {
      const ring = addBtn.querySelector('.spin-ring');
      if (ring) ring.remove();
    }, 0);
  });
  if (qtyMinus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      const v = Math.max(2, Number(qtyInput.value) || 1);
      qtyInput.value = v - 1;
    });
  }
  if (qtyPlus && qtyInput) {
    qtyPlus.addEventListener('click', () => {
      const v = Math.max(1, Number(qtyInput.value) || 1);
      qtyInput.value = v + 1;
    });
  }
  if (buyBtn) {
    buyBtn.addEventListener('click', () => {
      const qty = qtyInput ? Math.max(1, Number(qtyInput.value) || 1) : 1;
      for (let i = 0; i < qty; i++) addToCart(productData);
      if (window.flyToCartFrom) window.flyToCartFrom(document.querySelector('.media-slider img') || buyBtn);
      setTimeout(() => {
        const ring = buyBtn.querySelector('.spin-ring');
        if (ring) ring.remove();
      }, 0);
      window.location.href = 'cart.html';
    });
  }
  if (deliveryLocationEl && deliveryDateEl && shippingCostEl) {
    const updateDelivery = () => {
      const loc = deliveryLocationEl.value.trim();
      if (!loc) {
        deliveryDateEl.textContent = '—';
        shippingCostEl.textContent = '—';
        return;
      }
      const now = new Date();
      const eta = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const d = `${eta.getDate().toString().padStart(2, '0')}/${(eta.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${eta.getFullYear()}`;
      deliveryDateEl.textContent = d;
      shippingCostEl.textContent = formatRM(10);
    };
    deliveryLocationEl.addEventListener('input', updateDelivery);
  }
  updateRecentlyViewed(productData);
  loadRecent(productData.id);
  loadRelated(productData.id);
}

if (window.supabaseClient) {
  showSkeleton(); loadProduct();
} else {
  showSkeleton(); window.addEventListener('supabase-ready', loadProduct);
}
