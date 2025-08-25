import { type ServiceCategory } from '../schema';

export async function getAllServiceCategories(): Promise<ServiceCategory[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to return all available service categories
    // for the main dashboard navigation menu.
    return Promise.resolve([
        'games',
        'e_money',
        'pulsa',
        'data',
        'tlp_sms',
        'masa_aktif',
        'pln',
        'voucher',
        'streaming',
        'pascabayar'
    ] as ServiceCategory[]);
}