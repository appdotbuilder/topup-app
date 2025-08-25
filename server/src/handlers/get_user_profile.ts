import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function getUserProfile(userId: number): Promise<User> {
  try {
    // Query user by ID
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (result.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const user = result[0];

    // Convert numeric balance back to number and return user data
    return {
      ...user,
      balance: parseFloat(user.balance) // Convert string back to number
    };
  } catch (error) {
    console.error('Get user profile failed:', error);
    throw error;
  }
}