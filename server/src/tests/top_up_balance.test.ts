import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type TopUpBalanceInput } from '../schema';
import { topUpBalance } from '../handlers/top_up_balance';
import { eq } from 'drizzle-orm';

// Test input
const testTopUpInput: TopUpBalanceInput = {
  user_id: 1,
  amount: 50000 // 50,000 in balance
};

describe('topUpBalance', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should add balance to existing user account', async () => {
    // Create test user first
    const initialBalance = 25000;
    const testUser = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: initialBalance.toString(),
        is_verified: true
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const topUpInput: TopUpBalanceInput = {
      user_id: userId,
      amount: 50000
    };

    const result = await topUpBalance(topUpInput);

    // Verify the returned user data
    expect(result.id).toEqual(userId);
    expect(result.email).toEqual('testuser@example.com');
    expect(result.full_name).toEqual('Test User');
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.balance).toEqual(75000); // 25000 + 50000
    expect(typeof result.balance).toEqual('number');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update balance in database correctly', async () => {
    // Create test user
    const initialBalance = 10000;
    const testUser = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: initialBalance.toString(),
        is_verified: true
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const topUpInput: TopUpBalanceInput = {
      user_id: userId,
      amount: 30000
    };

    await topUpBalance(topUpInput);

    // Query database directly to verify balance update
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(updatedUsers).toHaveLength(1);
    expect(parseFloat(updatedUsers[0].balance)).toEqual(40000); // 10000 + 30000
    expect(updatedUsers[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create transaction record for top-up', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: '15000',
        is_verified: true
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const topUpInput: TopUpBalanceInput = {
      user_id: userId,
      amount: 25000
    };

    await topUpBalance(topUpInput);

    // Verify transaction record was created
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    expect(transactions).toHaveLength(1);
    const transaction = transactions[0];
    expect(transaction.user_id).toEqual(userId);
    expect(transaction.product_id).toEqual(0); // Special ID for top-ups
    expect(parseFloat(transaction.amount)).toEqual(25000);
    expect(transaction.status).toEqual('success');
    expect(transaction.target_number).toEqual('+1234567890'); // User's phone number
    expect(transaction.reference_id).toMatch(/^TOPUP_\d+_\d+$/);
    expect(transaction.notes).toEqual('Balance top-up of 25000');
    expect(transaction.created_at).toBeInstanceOf(Date);
  });

  it('should use email as target when phone number is null', async () => {
    // Create test user without phone number
    const testUser = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone_number: null,
        balance: '5000',
        is_verified: true
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const topUpInput: TopUpBalanceInput = {
      user_id: userId,
      amount: 15000
    };

    await topUpBalance(topUpInput);

    // Check transaction record uses email as target
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].target_number).toEqual('testuser@example.com');
  });

  it('should handle decimal amounts correctly', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: '1000.50',
        is_verified: true
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const topUpInput: TopUpBalanceInput = {
      user_id: userId,
      amount: 999.75
    };

    const result = await topUpBalance(topUpInput);

    // Verify decimal handling
    expect(result.balance).toEqual(2000.25); // 1000.50 + 999.75
    expect(typeof result.balance).toEqual('number');

    // Verify database storage
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    expect(parseFloat(updatedUsers[0].balance)).toEqual(2000.25);
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserInput: TopUpBalanceInput = {
      user_id: 999,
      amount: 10000
    };

    await expect(topUpBalance(nonExistentUserInput))
      .rejects
      .toThrow(/User with id 999 not found/i);
  });

  it('should handle large amounts correctly', async () => {
    // Create test user
    const testUser = await db.insert(usersTable)
      .values({
        email: 'testuser@example.com',
        password_hash: 'hashed_password',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: '1000000',
        is_verified: true
      })
      .returning()
      .execute();

    const userId = testUser[0].id;
    const topUpInput: TopUpBalanceInput = {
      user_id: userId,
      amount: 5000000 // 5 million
    };

    const result = await topUpBalance(topUpInput);

    expect(result.balance).toEqual(6000000); // 1M + 5M
    expect(typeof result.balance).toEqual('number');

    // Verify transaction record for large amount
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, userId))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(parseFloat(transactions[0].amount)).toEqual(5000000);
  });
});