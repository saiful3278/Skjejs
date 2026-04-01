-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id),
  status text DEFAULT 'pending', -- pending, paid, shipped, cancelled
  total_amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email text;
-- Remove FK to avoid insert timing issues; we still store user_id and enforce via RLS
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

-- Create Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id bigint REFERENCES products(id), -- Assuming products.id is bigint
  quantity int DEFAULT 1,
  unit_price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policies for Orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
-- Allow users to view their own orders
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
-- Allow users to insert their own orders
CREATE POLICY "Users can insert own orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow public (unauthenticated) to insert orders (guest checkout)
DROP POLICY IF EXISTS "Public can insert orders" ON orders;
CREATE POLICY "Public can insert orders" ON orders
  FOR INSERT WITH CHECK (true);
-- Allow public/admin read access for dashboard (Adjust as needed for security)
-- For this demo, we allow authenticated users to see all orders (e.g. admin)
-- Ideally, you'd have an 'is_admin' flag or separate role.
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
CREATE POLICY "Admins can view all orders" ON orders
  FOR SELECT USING (true); 
-- Allow authenticated users (e.g., admin) to update orders
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;
CREATE POLICY "Admins can update all orders" ON orders
  FOR UPDATE USING (auth.uid() IS NOT NULL) WITH CHECK (true);

-- Policies for Order Items
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
CREATE POLICY "Users can insert own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );

-- Allow public (unauthenticated) to insert order items
DROP POLICY IF EXISTS "Public can insert order items" ON order_items;
CREATE POLICY "Public can insert order items" ON order_items
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
CREATE POLICY "Admins can view all order items" ON order_items
  FOR SELECT USING (true);
