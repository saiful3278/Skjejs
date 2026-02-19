-- Temporary script to assign a category to existing products
UPDATE products
SET category_id = 1
WHERE category_id IS NULL;
