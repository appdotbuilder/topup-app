import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignInInput } from '../schema';
import { signIn } from '../handlers/sign_in';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password_123',
  full_name: 'Test User',
  phone_number: '+1234567890',
  balance: '100000.50', // Stored as string in database
  is_verified: true
};

const signInInput: SignInInput = {
  email: 'test@example.com',
  password: 'testpassword123'
};

describe('signIn', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should sign in existing user successfully', async () => {
    // Create test user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await signIn(signInInput);

    // Validate user data
    expect(result.user.email).toEqual('test@example.com');
    expect(result.user.full_name).toEqual('Test User');
    expect(result.user.phone_number).toEqual('+1234567890');
    expect(result.user.balance).toEqual(100000.50); // Should be converted to number
    expect(typeof result.user.balance).toEqual('number');
    expect(result.user.is_verified).toEqual(true);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Validate token
    expect(result.token).toBeDefined();
    expect(typeof result.token).toEqual('string');
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.token).toMatch(/^jwt_token_\d+_\d+$/);
  });

  it('should throw error for non-existent email', async () => {
    // Create a user first
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const nonExistentInput: SignInInput = {
      email: 'nonexistent@example.com',
      password: 'somepassword'
    };

    await expect(signIn(nonExistentInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error when no users exist in database', async () => {
    // Don't create any users - database is empty
    await expect(signIn(signInInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for user with empty password_hash', async () => {
    // Create user with empty password_hash (simulating invalid authentication state)
    await db.insert(usersTable)
      .values({
        ...testUser,
        password_hash: '' // Empty password_hash
      })
      .execute();

    await expect(signIn(signInInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle case-sensitive email matching', async () => {
    // Create test user with lowercase email
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Try to sign in with uppercase email
    const uppercaseEmailInput: SignInInput = {
      email: 'TEST@EXAMPLE.COM',
      password: 'testpassword123'
    };

    await expect(signIn(uppercaseEmailInput)).rejects.toThrow(/invalid email or password/i);
  });

  it('should return user with correct numeric conversion for balance', async () => {
    // Create user with different balance values to test conversion
    const userWithDecimalBalance = {
      ...testUser,
      balance: '999.99'
    };

    await db.insert(usersTable)
      .values(userWithDecimalBalance)
      .execute();

    const result = await signIn(signInInput);

    expect(result.user.balance).toEqual(999.99);
    expect(typeof result.user.balance).toEqual('number');
  });

  it('should preserve all user fields in response', async () => {
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await signIn(signInInput);

    // Check that all required user fields are present
    expect(result.user).toHaveProperty('id');
    expect(result.user).toHaveProperty('email');
    expect(result.user).toHaveProperty('password_hash');
    expect(result.user).toHaveProperty('full_name');
    expect(result.user).toHaveProperty('phone_number');
    expect(result.user).toHaveProperty('balance');
    expect(result.user).toHaveProperty('is_verified');
    expect(result.user).toHaveProperty('created_at');
    expect(result.user).toHaveProperty('updated_at');
  });

  it('should generate unique tokens for different sign-ins', async () => {
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result1 = await signIn(signInInput);
    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 1));
    const result2 = await signIn(signInInput);

    expect(result1.token).not.toEqual(result2.token);
    expect(result1.token).toMatch(/^jwt_token_/);
    expect(result2.token).toMatch(/^jwt_token_/);
  });
});