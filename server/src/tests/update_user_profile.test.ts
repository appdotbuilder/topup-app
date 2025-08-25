import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput } from '../schema';
import { updateUserProfile } from '../handlers/update_user_profile';
import { eq } from 'drizzle-orm';

describe('updateUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user first
    const result = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed_password',
        full_name: 'Original Name',
        phone_number: '+1234567890',
        balance: '100.00',
        is_verified: true
      })
      .returning()
      .execute();

    testUserId = result[0].id;
  });

  it('should update full_name when provided', async () => {
    const input: UpdateUserProfileInput = {
      user_id: testUserId,
      full_name: 'Updated Full Name'
    };

    const result = await updateUserProfile(input);

    expect(result.id).toEqual(testUserId);
    expect(result.full_name).toEqual('Updated Full Name');
    expect(result.phone_number).toEqual('+1234567890'); // Should remain unchanged
    expect(result.email).toEqual('test@example.com');
    expect(result.balance).toEqual(100);
    expect(typeof result.balance).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update phone_number when provided', async () => {
    const input: UpdateUserProfileInput = {
      user_id: testUserId,
      phone_number: '+9876543210'
    };

    const result = await updateUserProfile(input);

    expect(result.id).toEqual(testUserId);
    expect(result.phone_number).toEqual('+9876543210');
    expect(result.full_name).toEqual('Original Name'); // Should remain unchanged
    expect(result.email).toEqual('test@example.com');
    expect(result.balance).toEqual(100);
    expect(typeof result.balance).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update both full_name and phone_number when provided', async () => {
    const input: UpdateUserProfileInput = {
      user_id: testUserId,
      full_name: 'New Full Name',
      phone_number: '+1111111111'
    };

    const result = await updateUserProfile(input);

    expect(result.id).toEqual(testUserId);
    expect(result.full_name).toEqual('New Full Name');
    expect(result.phone_number).toEqual('+1111111111');
    expect(result.email).toEqual('test@example.com');
    expect(result.balance).toEqual(100);
    expect(typeof result.balance).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set phone_number to null when explicitly provided as null', async () => {
    const input: UpdateUserProfileInput = {
      user_id: testUserId,
      phone_number: null
    };

    const result = await updateUserProfile(input);

    expect(result.id).toEqual(testUserId);
    expect(result.phone_number).toBeNull();
    expect(result.full_name).toEqual('Original Name'); // Should remain unchanged
    expect(result.email).toEqual('test@example.com');
    expect(result.balance).toEqual(100);
    expect(typeof result.balance).toEqual('number');
  });

  it('should save updated profile to database', async () => {
    const input: UpdateUserProfileInput = {
      user_id: testUserId,
      full_name: 'Database Test Name',
      phone_number: '+5555555555'
    };

    await updateUserProfile(input);

    // Query database directly to verify changes
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].full_name).toEqual('Database Test Name');
    expect(users[0].phone_number).toEqual('+5555555555');
    expect(users[0].updated_at).toBeInstanceOf(Date);
    expect(parseFloat(users[0].balance)).toEqual(100);
  });

  it('should update timestamp correctly', async () => {
    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    const originalTimestamp = originalUser[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateUserProfileInput = {
      user_id: testUserId,
      full_name: 'Timestamp Test'
    };

    const result = await updateUserProfile(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should throw error for non-existent user', async () => {
    const input: UpdateUserProfileInput = {
      user_id: 999999, // Non-existent user ID
      full_name: 'Test Name'
    };

    await expect(updateUserProfile(input)).rejects.toThrow(/user with id 999999 not found/i);
  });

  it('should handle empty updates gracefully', async () => {
    const input: UpdateUserProfileInput = {
      user_id: testUserId
      // No optional fields provided
    };

    const result = await updateUserProfile(input);

    expect(result.id).toEqual(testUserId);
    expect(result.full_name).toEqual('Original Name'); // Should remain unchanged
    expect(result.phone_number).toEqual('+1234567890'); // Should remain unchanged
    expect(result.email).toEqual('test@example.com');
    expect(result.balance).toEqual(100);
    expect(typeof result.balance).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});