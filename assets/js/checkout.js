const checkoutButton = document.querySelector('.cart-summary .btn.btn-primary');

async function placeOrder() {
  const client = window.supabaseClient;
  if (!client || !checkoutButton) return;
  const { data: userData } = await client.auth.getUser();
  const user = userData && userData.user ? userData.user : null;
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  const items = getCartItems();
  if (!items.length) return;
  const total = calculateTotal(items);
  const { data: order, error: orderError } = await client
    .from('orders')
    .insert({ user_id: user.id, status: 'pending', total_amount: total })
    .select('id')
    .single();
  if (orderError || !order) {
    alert('Unable to place order.');
    return;
  }
  const rows = items.map((item) => ({
    order_id: order.id,
    product_id: item.id,
    quantity: item.quantity,
    unit_price: item.price
  }));
  const { error: itemsError } = await client.from('order_items').insert(rows);
  if (itemsError) {
    alert('Unable to add items to order.');
    return;
  }
  clearCart();
  if (window.renderCart) window.renderCart();
  alert('Order placed successfully.');
}

if (checkoutButton) {
  checkoutButton.addEventListener('click', placeOrder);
}
