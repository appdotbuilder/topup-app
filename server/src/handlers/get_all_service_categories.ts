import { db } from '../db';
import { serviceProvidersTable } from '../db/schema';
import { type ServiceCategory } from '../schema';
import { eq } from 'drizzle-orm';

export const getAllServiceCategories = async (): Promise<ServiceCategory[]> => {
  try {
    // Get distinct categories from service providers that are active
    const result = await db
      .selectDistinct({ category: serviceProvidersTable.category })
      .from(serviceProvidersTable)
      .where(eq(serviceProvidersTable.is_active, true))
      .execute();

    // Sort the results manually to ensure consistent ordering
    const categories = result.map(row => row.category);
    return categories.sort();
  } catch (error) {
    console.error('Failed to get service categories:', error);
    throw error;
  }
};