window.productImageUrl = function (path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const client = window.supabaseClient;
  if (!client) return '';
  const { data } = client.storage.from('products-images').getPublicUrl(path);
  return data && data.publicUrl ? data.publicUrl : '';
};
