function getSupabase() {
  return window.supabaseClient;
}

const tableBody = document.querySelector('#productsTable tbody');
const toggleSingle = document.getElementById('toggle-single');
const toggleBulk = document.getElementById('toggle-bulk');
const singleCard = document.getElementById('single-card');
const bulkCard = document.getElementById('bulk-card');
const singleUpload = document.getElementById('singleUpload');

function rowHtml(p) {
  const img = productImageUrl(p.image_url || '');
  return `<tr>
    <td>${p.name || p.title || ''}</td>
    <td>$${Number(p.price || 0).toFixed(2)}</td>
    <td>${p.sku || '-'}</td>
    <td>${p.stock ?? '-'}</td>
    <td class="img-cell">${img ? `<img src="${img}" alt="${p.name || ''}">` : ''}</td>
    <td>
      <button class="btn btn-outline" data-edit="${p.id}">Edit</button>
      <button class="btn btn-primary" data-delete="${p.id}">Delete</button>
    </td>
  </tr>`;
}

async function loadProducts() {
  const supabase = getSupabase();
  if (!supabase || !tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="6"><span class="loading"></span></td></tr>';
  const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
  if (error) {
    tableBody.innerHTML = '<tr><td colspan="6">Unable to load products.</td></tr>';
    return;
  }
  tableBody.innerHTML = '';
  (data || []).forEach((p) => {
    tableBody.insertAdjacentHTML('beforeend', rowHtml(p));
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

if (singleUpload) {
  singleUpload.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
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
    const fullInsert = {
      title: newProduct.title,
      price: newProduct.price,
      sku: newProduct.sku,
      stock: newProduct.stock,
      images: newProduct.images
    };
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

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length);
  if (!lines.length) return [];
  const headers = splitCsvRow(lines[0]).map((h) => h.trim().toLowerCase());
  const idxTitle = headers.indexOf('title');
  const idxPrice = headers.indexOf('price');
  const idxDesc = headers.indexOf('description');
  const idxImages = headers.indexOf('images');
  const idxSku = headers.indexOf('sku');
  const idxStock = headers.indexOf('stock');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvRow(lines[i]);
    const title = cols[idxTitle] || '';
    const price = Number(cols[idxPrice] || 0);
    const description = idxDesc >= 0 ? cols[idxDesc] || '' : '';
    const imagesRaw = idxImages >= 0 ? cols[idxImages] || '' : '';
    const sku = idxSku >= 0 ? cols[idxSku] || '' : '';
    const stock = idxStock >= 0 ? parseInt(cols[idxStock] || '0') : 0;
    const cleanedImagesRaw = imagesRaw.replace(/^`|`$/g, '');
    const images = cleanedImagesRaw
      .split(cleanedImagesRaw.includes('|') ? '|' : ',')
      .map((i) => i.trim())
      .filter(Boolean);
    if (!title || !Number.isFinite(price)) continue;
    rows.push({ title, price, description, images, sku, stock });
  }
  return rows;
}

const csvFileInput = document.getElementById('csvUpload');
const uploadCsvBtn = document.getElementById('uploadCSV');
if (uploadCsvBtn) {
  uploadCsvBtn.addEventListener('click', async () => {
    const supabase = getSupabase();
    if (!supabase) return alert('Supabase client not ready.');
    if (!csvFileInput || !csvFileInput.files.length) return alert('Select a CSV file');
    const file = csvFileInput.files[0];
    const text = await file.text();
    const products = parseCsv(text);
    if (!products.length) return alert('No valid rows found.');
    let { error } = await supabase.from('products').insert(products);
    if (error) {
      const fallbackRows = products.map((p) => ({
        name: p.title,
        price: p.price,
        description: p.description,
        image_url: (p.images && p.images[0]) || '',
        sku: p.sku,
        stock: p.stock
      }));
      ({ error } = await supabase.from('products').insert(fallbackRows));
    }
    if (error) return alert(error.message || 'Bulk upload failed.');
    alert('Bulk upload successful!');
    csvFileInput.value = '';
    loadProducts();
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
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert('Delete failed.');
        return;
      }
      loadProducts();
    } else if (edit) {
      const id = edit.dataset.edit;
      const name = prompt('New title:');
      const priceStr = prompt('New price:');
      const price = Number(priceStr || 0);
      if (!name || !Number.isFinite(price)) return;
      const { error } = await supabase.from('products').update({ name, price }).eq('id', id);
      if (error) {
        alert('Update failed.');
        return;
      }
      loadProducts();
    }
  });
}

if (getSupabase()) {
  loadProducts();
} else {
  window.addEventListener('supabase-ready', loadProducts);
}
