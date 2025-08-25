import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { serviceProvidersTable } from '../db/schema';
import { type GetServicesByCategoryInput, type ServiceCategory } from '../schema';
import { getServicesByCategory } from '../handlers/get_services_by_category';

describe('getServicesByCategory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return active service providers for specified category', async () => {
    // Create test service providers
    await db.insert(serviceProvidersTable)
      .values([
        {
          name: 'Game Provider 1',
          category: 'games',
          logo_url: 'https://example.com/logo1.png',
          is_active: true
        },
        {
          name: 'Game Provider 2',
          category: 'games',
          logo_url: null,
          is_active: true
        },
        {
          name: 'E-Money Provider',
          category: 'e_money',
          logo_url: 'https://example.com/logo2.png',
          is_active: true
        }
      ])
      .execute();

    const input: GetServicesByCategoryInput = {
      category: 'games'
    };

    const result = await getServicesByCategory(input);

    // Should return only games providers
    expect(result).toHaveLength(2);
    
    // Verify all returned providers are games category
    result.forEach(provider => {
      expect(provider.category).toBe('games');
      expect(provider.is_active).toBe(true);
      expect(provider.id).toBeDefined();
      expect(provider.created_at).toBeInstanceOf(Date);
    });

    // Verify specific providers
    const provider1 = result.find(p => p.name === 'Game Provider 1');
    const provider2 = result.find(p => p.name === 'Game Provider 2');
    
    expect(provider1).toBeDefined();
    expect(provider1?.logo_url).toBe('https://example.com/logo1.png');
    
    expect(provider2).toBeDefined();
    expect(provider2?.logo_url).toBe(null);
  });

  it('should exclude inactive service providers', async () => {
    // Create mix of active and inactive providers
    await db.insert(serviceProvidersTable)
      .values([
        {
          name: 'Active Provider',
          category: 'pulsa',
          logo_url: null,
          is_active: true
        },
        {
          name: 'Inactive Provider',
          category: 'pulsa',
          logo_url: null,
          is_active: false
        }
      ])
      .execute();

    const input: GetServicesByCategoryInput = {
      category: 'pulsa'
    };

    const result = await getServicesByCategory(input);

    // Should return only active provider
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Active Provider');
    expect(result[0].is_active).toBe(true);
  });

  it('should return empty array when no providers found for category', async () => {
    // Create providers for different categories
    await db.insert(serviceProvidersTable)
      .values([
        {
          name: 'Games Provider',
          category: 'games',
          logo_url: null,
          is_active: true
        },
        {
          name: 'Data Provider',
          category: 'data',
          logo_url: null,
          is_active: true
        }
      ])
      .execute();

    const input: GetServicesByCategoryInput = {
      category: 'streaming'
    };

    const result = await getServicesByCategory(input);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should work with all valid service categories', async () => {
    const categories: ServiceCategory[] = [
      'games', 'e_money', 'pulsa', 'data', 'tlp_sms', 
      'masa_aktif', 'pln', 'voucher', 'streaming', 'pascabayar'
    ];

    // Create one provider for each category
    const providersData = categories.map((category, index) => ({
      name: `Provider ${index + 1}`,
      category,
      logo_url: null,
      is_active: true
    }));

    await db.insert(serviceProvidersTable)
      .values(providersData)
      .execute();

    // Test each category
    for (const category of categories) {
      const input: GetServicesByCategoryInput = { category };
      const result = await getServicesByCategory(input);

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe(category);
      expect(result[0].is_active).toBe(true);
    }
  });

  it('should handle multiple providers in same category correctly', async () => {
    // Create multiple providers for e_money category
    await db.insert(serviceProvidersTable)
      .values([
        {
          name: 'GoPay',
          category: 'e_money',
          logo_url: 'https://example.com/gopay.png',
          is_active: true
        },
        {
          name: 'OVO',
          category: 'e_money',
          logo_url: 'https://example.com/ovo.png',
          is_active: true
        },
        {
          name: 'DANA',
          category: 'e_money',
          logo_url: 'https://example.com/dana.png',
          is_active: true
        },
        {
          name: 'ShopeePay',
          category: 'e_money',
          logo_url: null,
          is_active: false // This should be excluded
        }
      ])
      .execute();

    const input: GetServicesByCategoryInput = {
      category: 'e_money'
    };

    const result = await getServicesByCategory(input);

    // Should return only active e_money providers (3 out of 4)
    expect(result).toHaveLength(3);
    
    const providerNames = result.map(p => p.name);
    expect(providerNames).toContain('GoPay');
    expect(providerNames).toContain('OVO');
    expect(providerNames).toContain('DANA');
    expect(providerNames).not.toContain('ShopeePay');

    // Verify all are active and correct category
    result.forEach(provider => {
      expect(provider.category).toBe('e_money');
      expect(provider.is_active).toBe(true);
      expect(typeof provider.id).toBe('number');
      expect(provider.created_at).toBeInstanceOf(Date);
    });
  });

  it('should handle providers with and without logo_url', async () => {
    await db.insert(serviceProvidersTable)
      .values([
        {
          name: 'Provider with Logo',
          category: 'voucher',
          logo_url: 'https://example.com/logo.png',
          is_active: true
        },
        {
          name: 'Provider without Logo',
          category: 'voucher',
          logo_url: null,
          is_active: true
        }
      ])
      .execute();

    const input: GetServicesByCategoryInput = {
      category: 'voucher'
    };

    const result = await getServicesByCategory(input);

    expect(result).toHaveLength(2);
    
    const withLogo = result.find(p => p.name === 'Provider with Logo');
    const withoutLogo = result.find(p => p.name === 'Provider without Logo');
    
    expect(withLogo?.logo_url).toBe('https://example.com/logo.png');
    expect(withoutLogo?.logo_url).toBe(null);
  });
});