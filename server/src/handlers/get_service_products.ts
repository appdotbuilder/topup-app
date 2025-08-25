import { db } from '../db';
import { serviceProductsTable } from '../db/schema';
import { type ServiceProduct } from '../schema';
import { eq, and } from 'drizzle-orm';

export const getServiceProducts = async (providerId: number): Promise<ServiceProduct[]> => {
  try {
    const results = await db.select()
      .from(serviceProductsTable)
      .where(and(
        eq(serviceProductsTable.provider_id, providerId),
        eq(serviceProductsTable.is_active, true)
      ))
      .execute();

    // Convert numeric fields from string to number
    return results.map(product => ({
      ...product,
      price: parseFloat(product.price)
    }));
  } catch (error) {
    console.error('Get service products failed:', error);
    throw error;
  }
};