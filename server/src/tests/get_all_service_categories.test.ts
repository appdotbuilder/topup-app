import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceProvidersTable } from '../db/schema';
import { getAllServiceCategories } from '../handlers/get_all_service_categories';
import { type ServiceCategory } from '../schema';

describe('getAllServiceCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no service providers exist', async () => {
    const result = await getAllServiceCategories();
    
    expect(result).toEqual([]);
  });

  it('should return distinct categories from active service providers', async () => {
    // Create test service providers with different categories
    await db.insert(serviceProvidersTable).values([
      {
        name: 'Steam',
        category: 'games',
        logo_url: 'steam.png',
        is_active: true
      },
      {
        name: 'GoPay',
        category: 'e_money',
        logo_url: 'gopay.png',
        is_active: true
      },
      {
        name: 'Telkomsel',
        category: 'pulsa',
        logo_url: 'telkomsel.png',
        is_active: true
      },
      {
        name: 'Another Gaming Platform',
        category: 'games',
        logo_url: 'gaming2.png',
        is_active: true
      }
    ]).execute();

    const result = await getAllServiceCategories();

    // Should return distinct categories only
    expect(result).toHaveLength(3);
    expect(result).toContain('games');
    expect(result).toContain('e_money');
    expect(result).toContain('pulsa');
    
    // Verify each result is a valid ServiceCategory
    result.forEach(category => {
      expect(['games', 'e_money', 'pulsa', 'data', 'tlp_sms', 'masa_aktif', 'pln', 'voucher', 'streaming', 'pascabayar']).toContain(category);
    });
  });

  it('should exclude inactive service providers', async () => {
    // Create mix of active and inactive providers
    await db.insert(serviceProvidersTable).values([
      {
        name: 'Active Games Provider',
        category: 'games',
        logo_url: 'active.png',
        is_active: true
      },
      {
        name: 'Inactive Streaming Provider',
        category: 'streaming',
        logo_url: 'inactive.png',
        is_active: false
      },
      {
        name: 'Active E-Money Provider',
        category: 'e_money',
        logo_url: 'emoney.png',
        is_active: true
      }
    ]).execute();

    const result = await getAllServiceCategories();

    // Should only return categories from active providers
    expect(result).toHaveLength(2);
    expect(result).toContain('games');
    expect(result).toContain('e_money');
    expect(result).not.toContain('streaming');
  });

  it('should return categories in sorted order', async () => {
    // Create providers with categories that will test alphabetical ordering
    await db.insert(serviceProvidersTable).values([
      {
        name: 'Voucher Provider',
        category: 'voucher',
        logo_url: 'voucher.png',
        is_active: true
      },
      {
        name: 'Data Provider',
        category: 'data',
        logo_url: 'data.png',
        is_active: true
      },
      {
        name: 'Games Provider',
        category: 'games',
        logo_url: 'games.png',
        is_active: true
      }
    ]).execute();

    const result = await getAllServiceCategories();

    // Should be sorted alphabetically
    expect(result).toEqual(['data', 'games', 'voucher']);
  });

  it('should handle all possible service categories', async () => {
    // Create providers for all possible categories
    const allCategories: ServiceCategory[] = [
      'games', 'e_money', 'pulsa', 'data', 'tlp_sms', 
      'masa_aktif', 'pln', 'voucher', 'streaming', 'pascabayar'
    ];

    const providers = allCategories.map((category, index) => ({
      name: `Provider ${index + 1}`,
      category,
      logo_url: `${category}.png`,
      is_active: true
    }));

    await db.insert(serviceProvidersTable).values(providers).execute();

    const result = await getAllServiceCategories();

    // Should return all categories in sorted order
    expect(result).toHaveLength(10);
    expect(result).toEqual([
      'data', 'e_money', 'games', 'masa_aktif', 'pascabayar',
      'pln', 'pulsa', 'streaming', 'tlp_sms', 'voucher'
    ]);
  });

  it('should handle mixed active/inactive providers with same category', async () => {
    // Create multiple providers with same category, some active and some inactive
    await db.insert(serviceProvidersTable).values([
      {
        name: 'Active Games Provider 1',
        category: 'games',
        logo_url: 'games1.png',
        is_active: true
      },
      {
        name: 'Inactive Games Provider',
        category: 'games',
        logo_url: 'games2.png',
        is_active: false
      },
      {
        name: 'Active Games Provider 2',
        category: 'games',
        logo_url: 'games3.png',
        is_active: true
      }
    ]).execute();

    const result = await getAllServiceCategories();

    // Should still return the category if at least one provider is active
    expect(result).toEqual(['games']);
  });
});