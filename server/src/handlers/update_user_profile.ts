import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUserProfile = async (input: UpdateUserProfileInput): Promise<User> => {
  try {
    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updated_at: new Date()
    };

    if (input.full_name !== undefined) {
      updateData['full_name'] = input.full_name;
    }

    if (input.phone_number !== undefined) {
      updateData['phone_number'] = input.phone_number;
    }

    // Update user profile
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.user_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const user = result[0];
    return {
      ...user,
      balance: parseFloat(user.balance) // Convert string back to number
    };
  } catch (error) {
    console.error('User profile update failed:', error);
    throw error;
  }
};