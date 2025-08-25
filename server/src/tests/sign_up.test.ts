import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createHash } from 'crypto';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type SignUpInput } from '../schema';
import { signUp } from '../handlers/sign_up';
import { eq } from 'drizzle-orm';

// Helper function to verify password hash
const verifyPassword = (password: string, hashedPassword: string): boolean => {
  const [salt, hash] = hashedPassword.split(':');
  const expectedHash = createHash('sha256').update(password + salt).digest('hex');
  return hash === expectedHash;
};

// Helper function to decode token payload
const decodeToken = (token: string): any => {
  const [header, payload, signature] = token.split('.');
  return JSON.parse(Buffer.from(payload, 'base64url').toString());
};

// Test input data
const validSignUpInput: SignUpInput = {
  email: 'test@example.com',
  password: 'securepassword123',
  full_name: 'John Doe',
  phone_number: '+1234567890'
};

const validSignUpInputWithoutPhone: SignUpInput = {
  email: 'test2@example.com',
  password: 'anotherpassword456',
  full_name: 'Jane Smith',
  phone_number: null
};

describe('signUp', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a new user account', async () => {
    const result = await signUp(validSignUpInput);

    // Validate user data
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.full_name).toBe('John Doe');
    expect(result.user.phone_number).toBe('+1234567890');
    expect(result.user.balance).toBe(0);
    expect(result.user.is_verified).toBe(false);
    expect(result.user.id).toBeDefined();
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Validate token
    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.split('.').length).toBe(3); // JWT format: header.payload.signature
  });

  it('should hash the password correctly', async () => {
    const result = await signUp(validSignUpInput);

    // Verify password is hashed in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.user.id))
      .execute();

    expect(users).toHaveLength(1);
    const user = users[0];
    
    // Password should be hashed with salt, not plain text
    expect(user.password_hash).not.toBe('securepassword123');
    expect(user.password_hash).toContain(':'); // Should contain salt:hash format
    expect(user.password_hash.length).toBeGreaterThan(50);

    // Verify password can be validated
    const isValidPassword = verifyPassword('securepassword123', user.password_hash);
    expect(isValidPassword).toBe(true);

    // Verify wrong password fails
    const isInvalidPassword = verifyPassword('wrongpassword', user.password_hash);
    expect(isInvalidPassword).toBe(false);
  });

  it('should generate valid token with correct payload', async () => {
    const result = await signUp(validSignUpInput);

    // Decode and verify token payload
    const payload = decodeToken(result.token);

    expect(payload.userId).toBe(result.user.id);
    expect(payload.email).toBe('test@example.com');
    expect(payload.exp).toBeDefined(); // Should have expiration
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000)); // Should be in the future
  });

  it('should save user to database with correct data', async () => {
    const result = await signUp(validSignUpInput);

    // Query database directly
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users).toHaveLength(1);
    const user = users[0];

    expect(user.email).toBe('test@example.com');
    expect(user.full_name).toBe('John Doe');
    expect(user.phone_number).toBe('+1234567890');
    expect(parseFloat(user.balance)).toBe(0);
    expect(user.is_verified).toBe(false);
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null phone number correctly', async () => {
    const result = await signUp(validSignUpInputWithoutPhone);

    expect(result.user.phone_number).toBeNull();
    expect(result.user.email).toBe('test2@example.com');
    expect(result.user.full_name).toBe('Jane Smith');

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test2@example.com'))
      .execute();

    expect(users[0].phone_number).toBeNull();
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await signUp(validSignUpInput);

    // Try to create second user with same email
    await expect(signUp(validSignUpInput)).rejects.toThrow(/already exists/i);
  });

  it('should handle email case insensitivity', async () => {
    await signUp(validSignUpInput);

    const duplicateEmailInput: SignUpInput = {
      ...validSignUpInput,
      email: 'TEST@EXAMPLE.COM'
    };

    await expect(signUp(duplicateEmailInput)).rejects.toThrow(/already exists/i);
  });

  it('should normalize email to lowercase', async () => {
    const upperCaseEmailInput: SignUpInput = {
      ...validSignUpInput,
      email: 'TEST@EXAMPLE.COM'
    };

    const result = await signUp(upperCaseEmailInput);

    expect(result.user.email).toBe('test@example.com');

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, 'test@example.com'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toBe('test@example.com');
  });

  it('should maintain proper numeric type for balance', async () => {
    const result = await signUp(validSignUpInput);

    // Balance should be a number in response
    expect(typeof result.user.balance).toBe('number');
    expect(result.user.balance).toBe(0);
  });

  it('should set default values correctly', async () => {
    const result = await signUp(validSignUpInput);

    // Verify default values
    expect(result.user.balance).toBe(0);
    expect(result.user.is_verified).toBe(false);
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Verify these are close to current time (within 5 seconds)
    const now = new Date();
    const timeDiff = Math.abs(now.getTime() - result.user.created_at.getTime());
    expect(timeDiff).toBeLessThan(5000); // 5 seconds
  });

  it('should generate different tokens for different users', async () => {
    const result1 = await signUp(validSignUpInput);
    const result2 = await signUp(validSignUpInputWithoutPhone);

    expect(result1.token).not.toBe(result2.token);

    // Decode both tokens to verify they contain different user data
    const payload1 = decodeToken(result1.token);
    const payload2 = decodeToken(result2.token);

    expect(payload1.userId).not.toBe(payload2.userId);
    expect(payload1.email).not.toBe(payload2.email);
  });

  it('should generate different password hashes for same password', async () => {
    const input1: SignUpInput = {
      ...validSignUpInput,
      email: 'user1@example.com'
    };
    
    const input2: SignUpInput = {
      ...validSignUpInput,
      email: 'user2@example.com'
    };

    const result1 = await signUp(input1);
    const result2 = await signUp(input2);

    // Get password hashes from database
    const user1 = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result1.user.id))
      .execute();

    const user2 = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result2.user.id))
      .execute();

    // Same password should generate different hashes due to different salts
    expect(user1[0].password_hash).not.toBe(user2[0].password_hash);

    // But both should validate correctly
    expect(verifyPassword('securepassword123', user1[0].password_hash)).toBe(true);
    expect(verifyPassword('securepassword123', user2[0].password_hash)).toBe(true);
  });
});