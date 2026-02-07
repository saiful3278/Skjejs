
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xqeqkkkwjjjhzhakvatc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxZXFra2t3ampqaHpoYWt2YXRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMTMxMTEsImV4cCI6MjA4NTY4OTExMX0.2oYJvuMYT33lEemHE-id4qmsHRsYBIpjd2CaRjiuJxY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function probeColumns() {
  console.log('Probing columns...');

  const candidates = [
    'cart_id',
    'product_variant_id',
    'product_id',
    'qty',
    'quantity',
    'created_at'
  ];

  for (const col of candidates) {
    const { error } = await supabase.from("cart_items").select(col).limit(1);
    if (error) {
      console.log(`Column '${col}' does NOT exist (or other error):`, error.message);
    } else {
      console.log(`Column '${col}' EXISTS!`);
    }
  }
}

probeColumns();
