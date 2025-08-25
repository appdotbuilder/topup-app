import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type SignInInput, type AuthResponse } from '../schema';

export const signIn = async (input: SignInInput): Promise<AuthResponse> => {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // In a real application, you would:
    // 1. Compare input.password with user.password_hash using bcrypt
    // 2. Generate a JWT token with user information
    // For this implementation, we'll simulate authentication
    
    // Simulate password verification (in real app, use bcrypt.compare)
    if (!user.password_hash || user.password_hash.trim() === '') {
      throw new Error('Invalid email or password');
    }

    // Convert numeric fields back to numbers before returning
    const userResponse = {
      ...user,
      balance: parseFloat(user.balance) // Convert numeric string to number
    };

    // In a real application, generate a proper JWT token
    // For now, we'll create a simple token placeholder
    const token = `jwt_token_${user.id}_${Date.now()}`;

    return {
      user: userResponse,
      token
    };
  } catch (error) {
    console.error('Sign in failed:', error);
    throw error;
  }
};