CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  amount numeric DEFAULT 0,
  currency text DEFAULT 'RM',
  status text DEFAULT 'pending',
  provider text,
  transaction_ref text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = payments.order_id 
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = payments.order_id 
        AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all payments" ON payments
  FOR SELECT USING (true);
