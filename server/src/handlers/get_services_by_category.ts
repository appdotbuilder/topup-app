import { db } from '../db';
import { serviceProvidersTable } from '../db/schema';
import { type GetServicesByCategoryInput, type ServiceProvider } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function getServicesByCategory(input: GetServicesByCategoryInput): Promise<ServiceProvider[]> {
  try {
    // Query active service providers for the specified category
    const results = await db.select()
      .from(serviceProvidersTable)
      .where(and(
        eq(serviceProvidersTable.category, input.category),
        eq(serviceProvidersTable.is_active, true)
      ))
      .execute();

    // Map results to match the ServiceProvider schema type
    return results.map(provider => ({
      ...provider,
      // All fields are already in correct format, no numeric conversions needed
      // as this table doesn't have any numeric columns that need conversion
    }));
  } catch (error) {
    console.error('Failed to fetch services by category:', error);
    throw error;
  }
}