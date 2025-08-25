import { createHash, randomBytes } from 'crypto';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

// Simple password hashing using Node.js crypto
const hashPassword = (password: string, salt: string): string => {
  return createHash('sha256').update(password + salt).digest('hex');
};

// Simple JWT-like token generation
const generateToken = (userId: number, email: string): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ 
    userId, 
    email, 
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  })).toString('base64url');
  
  const secret = process.env['JWT_SECRET'] || 'default-jwt-secret';
  const signature = createHash('sha256').update(`${header}.${payload}.${secret}`).digest('base64url');
  
  return `${header}.${payload}.${signature}`;
};

export const signUp = async (input: SignUpInput): Promise<AuthResponse> => {
  try {
    // Check if user with this email already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email.toLowerCase()))
      .execute();

    if (existingUsers.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Generate salt and hash password
    const salt = randomBytes(16).toString('hex');
    const password_hash = `${salt}:${hashPassword(input.password, salt)}`;

    // Create the user
    const result = await db.insert(usersTable)
      .values({
        email: input.email.toLowerCase(),
        password_hash,
        full_name: input.full_name,
        phone_number: input.phone_number,
        balance: '0.00', // Convert number to string for numeric column
        is_verified: false
      })
      .returning()
      .execute();

    const user = result[0];
    
    // Convert numeric field back to number
    const userResponse = {
      ...user,
      balance: parseFloat(user.balance)
    };

    // Generate token
    const token = generateToken(user.id, user.email);

    return {
      user: userResponse,
      token
    };
  } catch (error) {
    console.error('Sign up failed:', error);
    throw error;
  }
};