import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceProvidersTable, serviceProductsTable } from '../db/schema';
import { getServiceProducts } from '../handlers/get_service_products';

describe('getServiceProducts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active products for a provider', async () => {
    // Create test provider
    const providerResult = await db.insert(serviceProvidersTable)
      .values({
        name: 'Test Provider',
        category: 'games',
        is_active: true
      })
      .returning()
      .execute();

    const providerId = providerResult[0].id;

    // Create test products
    await db.insert(serviceProductsTable)
      .values([
        {
          provider_id: providerId,
          name: 'Game Credit 100',
          description: 'Gaming credit 100 coins',
          price: '15000.00',
          nominal_value: '100 coins',
          is_active: true
        },
        {
          provider_id: providerId,
          name: 'Game Credit 500',
          description: 'Gaming credit 500 coins',
          price: '70000.50',
          nominal_value: '500 coins',
          is_active: true
        }
      ])
      .execute();

    const result = await getServiceProducts(providerId);

    expect(result).toHaveLength(2);
    
    // Check first product
    const product1 = result.find(p => p.name === 'Game Credit 100');
    expect(product1).toBeDefined();
    expect(product1!.provider_id).toEqual(providerId);
    expect(product1!.description).toEqual('Gaming credit 100 coins');
    expect(product1!.price).toEqual(15000);
    expect(typeof product1!.price).toBe('number');
    expect(product1!.nominal_value).toEqual('100 coins');
    expect(product1!.is_active).toBe(true);
    expect(product1!.created_at).toBeInstanceOf(Date);

    // Check second product
    const product2 = result.find(p => p.name === 'Game Credit 500');
    expect(product2).toBeDefined();
    expect(product2!.price).toEqual(70000.5);
    expect(typeof product2!.price).toBe('number');
  });

  it('should only return active products', async () => {
    // Create test provider
    const providerResult = await db.insert(serviceProvidersTable)
      .values({
        name: 'Test Provider',
        category: 'pulsa',
        is_active: true
      })
      .returning()
      .execute();

    const providerId = providerResult[0].id;

    // Create active and inactive products
    await db.insert(serviceProductsTable)
      .values([
        {
          provider_id: providerId,
          name: 'Active Product',
          description: 'This is active',
          price: '10000.00',
          nominal_value: '10GB',
          is_active: true
        },
        {
          provider_id: providerId,
          name: 'Inactive Product',
          description: 'This is inactive',
          price: '20000.00',
          nominal_value: '20GB',
          is_active: false
        }
      ])
      .execute();

    const result = await getServiceProducts(providerId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Active Product');
    expect(result[0].is_active).toBe(true);
  });

  it('should return empty array for provider with no active products', async () => {
    // Create test provider
    const providerResult = await db.insert(serviceProvidersTable)
      .values({
        name: 'Empty Provider',
        category: 'data',
        is_active: true
      })
      .returning()
      .execute();

    const providerId = providerResult[0].id;

    const result = await getServiceProducts(providerId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent provider', async () => {
    const nonExistentProviderId = 99999;

    const result = await getServiceProducts(nonExistentProviderId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should not return products from other providers', async () => {
    // Create two test providers
    const provider1Result = await db.insert(serviceProvidersTable)
      .values({
        name: 'Provider 1',
        category: 'games',
        is_active: true
      })
      .returning()
      .execute();

    const provider2Result = await db.insert(serviceProvidersTable)
      .values({
        name: 'Provider 2',
        category: 'pulsa',
        is_active: true
      })
      .returning()
      .execute();

    const provider1Id = provider1Result[0].id;
    const provider2Id = provider2Result[0].id;

    // Create products for both providers
    await db.insert(serviceProductsTable)
      .values([
        {
          provider_id: provider1Id,
          name: 'Provider 1 Product',
          description: 'Product for provider 1',
          price: '10000.00',
          nominal_value: '100 coins',
          is_active: true
        },
        {
          provider_id: provider2Id,
          name: 'Provider 2 Product',
          description: 'Product for provider 2',
          price: '15000.00',
          nominal_value: '10GB',
          is_active: true
        }
      ])
      .execute();

    const result = await getServiceProducts(provider1Id);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Provider 1 Product');
    expect(result[0].provider_id).toEqual(provider1Id);
  });

  it('should handle products with null description', async () => {
    // Create test provider
    const providerResult = await db.insert(serviceProvidersTable)
      .values({
        name: 'Test Provider',
        category: 'voucher',
        is_active: true
      })
      .returning()
      .execute();

    const providerId = providerResult[0].id;

    // Create product with null description
    await db.insert(serviceProductsTable)
      .values({
        provider_id: providerId,
        name: 'Product Without Description',
        description: null,
        price: '25000.00',
        nominal_value: '50 credits',
        is_active: true
      })
      .execute();

    const result = await getServiceProducts(providerId);

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Product Without Description');
    expect(result[0].description).toBeNull();
    expect(result[0].price).toEqual(25000);
  });
});