import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserProfile } from '../handlers/get_user_profile';

describe('getUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get user profile by ID', async () => {
    // Create test user
    const testUser = {
      email: 'test@example.com',
      password_hash: 'hashed_password_123',
      full_name: 'Test User',
      phone_number: '+1234567890',
      balance: '150.75', // Stored as string in DB
      is_verified: true
    };

    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user profile
    const result = await getUserProfile(createdUser.id);

    // Verify all fields are returned correctly
    expect(result.id).toBe(createdUser.id);
    expect(result.email).toBe('test@example.com');
    expect(result.password_hash).toBe('hashed_password_123');
    expect(result.full_name).toBe('Test User');
    expect(result.phone_number).toBe('+1234567890');
    expect(result.balance).toBe(150.75); // Converted to number
    expect(typeof result.balance).toBe('number'); // Verify numeric conversion
    expect(result.is_verified).toBe(true);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle user with null phone number', async () => {
    // Create user with null phone number
    const testUser = {
      email: 'test2@example.com',
      password_hash: 'hashed_password_456',
      full_name: 'Test User 2',
      phone_number: null,
      balance: '0.00',
      is_verified: false
    };

    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user profile
    const result = await getUserProfile(createdUser.id);

    // Verify null phone number is handled correctly
    expect(result.phone_number).toBeNull();
    expect(result.balance).toBe(0);
    expect(result.is_verified).toBe(false);
  });

  it('should handle user with zero balance', async () => {
    // Create user with zero balance
    const testUser = {
      email: 'zero@example.com',
      password_hash: 'hashed_password_789',
      full_name: 'Zero Balance User',
      phone_number: '+9876543210',
      balance: '0.00',
      is_verified: true
    };

    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user profile
    const result = await getUserProfile(createdUser.id);

    // Verify zero balance is handled correctly
    expect(result.balance).toBe(0);
    expect(typeof result.balance).toBe('number');
  });

  it('should handle user with large balance', async () => {
    // Create user with large balance
    const testUser = {
      email: 'rich@example.com',
      password_hash: 'hashed_password_rich',
      full_name: 'Rich User',
      phone_number: '+5555555555',
      balance: '999999.99', // Large balance
      is_verified: true
    };

    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Get user profile
    const result = await getUserProfile(createdUser.id);

    // Verify large balance is handled correctly
    expect(result.balance).toBe(999999.99);
    expect(typeof result.balance).toBe('number');
  });

  it('should throw error when user not found', async () => {
    // Try to get non-existent user
    const nonExistentId = 99999;

    await expect(getUserProfile(nonExistentId))
      .rejects
      .toThrow(/user with id 99999 not found/i);
  });

  it('should throw error for invalid user ID', async () => {
    // Test with various invalid IDs
    const invalidIds = [0, -1, -999];

    for (const invalidId of invalidIds) {
      await expect(getUserProfile(invalidId))
        .rejects
        .toThrow(/not found/i);
    }
  });
});