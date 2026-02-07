const titleEl = document.getElementById('product-title');
const priceEl = document.getElementById('product-price');
const descEl = document.getElementById('product-description');
const mediaEl = document.getElementById('product-media');
const addBtn = document.getElementById('product-add');

async function loadProduct() {
  const client = window.supabaseClient;
  if (!client || !titleEl || !priceEl || !descEl || !mediaEl || !addBtn) return;
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    descEl.textContent = 'Product not found.';
    return;
  }
  const { data, error } = await client
    .from('products')
    .select('id,name,description,price,image_url')
    .eq('id', id)
    .single();
  if (error || !data) {
    descEl.textContent = 'Product not found.';
    return;
  }
  titleEl.textContent = data.name || 'Product';
  priceEl.textContent = `$${Number(data.price).toFixed(2)}`;
  descEl.textContent = data.description || 'No description available.';
  const url = productImageUrl(data.image_url);
  if (url) {
    mediaEl.innerHTML = `<img src="${url}" alt="${data.name}">`;
  }
  addBtn.addEventListener('click', () => addToCart(data));
}

loadProduct();
