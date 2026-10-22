import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const connectionString = process.env.TEST_DATABASE_URL;
const describeWithDatabase = connectionString ? describe : describe.skip;

describeWithDatabase('database financial constraints', () => {
  const client = new Client({ connectionString });
  const categoryId = randomUUID();
  const productId = randomUUID();
  const variantId = randomUUID();
  const customerId = randomUUID();
  const orderId = randomUUID();

  beforeAll(async () => {
    await client.connect();
    await client.query('BEGIN');
    await client.query('INSERT INTO categories (id, name, slug) VALUES ($1, $2, $3)', [categoryId, 'Test', `test-${categoryId}`]);
    await client.query('INSERT INTO products (id, category_id, name) VALUES ($1, $2, $3)', [productId, categoryId, 'Test']);
    await client.query(
      'INSERT INTO product_variants (id, product_id, sku, name, price) VALUES ($1, $2, $3, $4, $5)',
      [variantId, productId, `SKU-${variantId}`, 'Test', '99.99'],
    );
    await client.query('INSERT INTO customers (id, name, phone) VALUES ($1, $2, $3)', [customerId, 'Cliente prueba', '55550000']);
    await client.query(
      'INSERT INTO orders (id, public_code, customer_id, total_amount, commission_amount) VALUES ($1, $2, $3, $4, $5)',
      [orderId, `VNT-${randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`, customerId, '99.99', '10.00'],
    );
  });

  afterAll(async () => {
    await client.query('ROLLBACK');
    await client.end();
  });

  it('accepts the exact 10% commission snapshot below Q100', async () => {
    await expect(
      client.query(
        `INSERT INTO order_items
          (order_id, product_variant_id, product_name_snapshot, variant_name_snapshot, sku_snapshot, unit_price, quantity, subtotal, commission_rate, commission_amount)
         VALUES ($1, $2, 'Producto', 'Variante', 'SKU-SNAPSHOT', 99.99, 1, 99.99, 0.1000, 10.00)`,
        [orderId, variantId],
      ),
    ).resolves.toMatchObject({ rowCount: 1 });
  });

  it('rejects a manipulated commission rate at Q100', async () => {
    await client.query('SAVEPOINT invalid_commission');
    await expect(
      client.query(
        `INSERT INTO order_items
          (order_id, product_variant_id, product_name_snapshot, variant_name_snapshot, sku_snapshot, unit_price, quantity, subtotal, commission_rate, commission_amount)
         VALUES ($1, $2, 'Producto', 'Variante', 'SKU-SNAPSHOT', 100.00, 1, 100.00, 0.1000, 10.00)`,
        [orderId, variantId],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await client.query('ROLLBACK TO SAVEPOINT invalid_commission');
  });

  it('rejects duplicate public order codes', async () => {
    const code = `VNT-${randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase()}`;
    await client.query(
      'INSERT INTO orders (public_code, customer_id, total_amount, commission_amount) VALUES ($1, $2, 1, 0.10)',
      [code, customerId],
    );
    await client.query('SAVEPOINT duplicate_code');
    await expect(
      client.query(
        'INSERT INTO orders (public_code, customer_id, total_amount, commission_amount) VALUES ($1, $2, 1, 0.10)',
        [code, customerId],
      ),
    ).rejects.toMatchObject({ code: '23505' });
    await client.query('ROLLBACK TO SAVEPOINT duplicate_code');
  });
});
