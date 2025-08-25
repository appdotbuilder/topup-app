import { type ServiceProduct } from '../schema';

export async function getServiceProducts(providerId: number): Promise<ServiceProduct[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to fetch all active service products
    // for a specific provider ID from the database.
    return Promise.resolve([
        {
            id: 1,
            provider_id: providerId,
            name: 'Sample Product',
            description: 'Sample product description',
            price: 10000,
            nominal_value: '10GB',
            is_active: true,
            created_at: new Date()
        }
    ] as ServiceProduct[]);
}