import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, serviceProvidersTable, serviceProductsTable, transactionsTable } from '../db/schema';
import { type CreateTransactionInput } from '../schema';
import { createTransaction } from '../handlers/create_transaction';
import { eq } from 'drizzle-orm';

// Test setup data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  full_name: 'Test User',
  phone_number: '081234567890',
  balance: '50000.00', // Sufficient balance
  is_verified: true
};

const testProvider = {
  name: 'Test Provider',
  category: 'games' as const,
  logo_url: 'https://example.com/logo.png',
  is_active: true
};

const testProduct = {
  provider_id: 0, // Will be set after provider creation
  name: 'Test Product',
  description: 'A test product',
  price: '25000.00',
  nominal_value: '100 diamonds',
  is_active: true
};

const testInput: CreateTransactionInput = {
  user_id: 0, // Will be set after user creation
  product_id: 0, // Will be set after product creation
  target_number: '081234567890',
  notes: 'Test transaction'
};

describe('createTransaction', () => {
  let userId: number;
  let productId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test provider
    const providerResult = await db.insert(serviceProvidersTable)
      .values(testProvider)
      .returning()
      .execute();

    // Create test product
    const productResult = await db.insert(serviceProductsTable)
      .values({
        ...testProduct,
        provider_id: providerResult[0].id
      })
      .returning()
      .execute();
    productId = productResult[0].id;
  });

  afterEach(resetDB);

  it('should create a transaction successfully', async () => {
    const input: CreateTransactionInput = {
      ...testInput,
      user_id: userId,
      product_id: productId
    };

    const result = await createTransaction(input);

    // Verify transaction properties
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.product_id).toEqual(productId);
    expect(result.amount).toEqual(25000);
    expect(typeof result.amount).toBe('number');
    expect(result.status).toEqual('pending');
    expect(result.target_number).toEqual('081234567890');
    expect(result.reference_id).toBeNull();
    expect(result.notes).toEqual('Test transaction');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save transaction to database', async () => {
    const input: CreateTransactionInput = {
      ...testInput,
      user_id: userId,
      product_id: productId
    };

    const result = await createTransaction(input);

    // Query the database to verify transaction was saved
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.id, result.id))
      .execute();

    expect(transactions).toHaveLength(1);
    expect(transactions[0].user_id).toEqual(userId);
    expect(transactions[0].product_id).toEqual(productId);
    expect(parseFloat(transactions[0].amount)).toEqual(25000);
    expect(transactions[0].status).toEqual('pending');
    expect(transactions[0].target_number).toEqual('081234567890');
    expect(transactions[0].notes).toEqual('Test transaction');
  });

  it('should deduct amount from user balance', async () => {
    const input: CreateTransactionInput = {
      ...testInput,
      user_id: userId,
      product_id: productId
    };

    // Check initial balance
    const initialUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    expect(parseFloat(initialUser[0].balance)).toEqual(50000);

    await createTransaction(input);

    // Check balance after transaction
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();
    
    expect(parseFloat(updatedUser[0].balance)).toEqual(25000); // 50000 - 25000
  });

  it('should handle null notes correctly', async () => {
    const input: CreateTransactionInput = {
      ...testInput,
      user_id: userId,
      product_id: productId,
      notes: null
    };

    const result = await createTransaction(input);
    expect(result.notes).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const input: CreateTransactionInput = {
      ...testInput,
      user_id: 99999, // Non-existent user
      product_id: productId
    };

    await expect(createTransaction(input)).rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-existent product', async () => {
    const input: CreateTransactionInput = {
      ...testInput,
      user_id: userId,
      product_id: 99999 // Non-existent product
    };

    await expect(createTransaction(input)).rejects.toThrow(/product not found/i);
  });

  it('should throw error for inactive product', async () => {
    // Create an inactive product
    const providerResult = await db.select()
      .from(serviceProvidersTable)
      .limit(1)
      .execute();

    const inactiveProductResult = await db.insert(serviceProductsTable)
      .values({
        ...testProduct,
        provider_id: providerResult[0].id,
        is_active: false
      })
      .returning()
      .execute();

    const input: CreateTransactionInput = {
      ...testInput,
      user_id: userId,
      product_id: inactiveProductResult[0].id
    };

    await expect(createTransaction(input)).rejects.toThrow(/product is not active/i);
  });

  it('should throw error for insufficient balance', async () => {
    // Create a user with low balance
    const lowBalanceUser = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'lowbalance@example.com',
        balance: '10000.00' // Less than product price (25000)
      })
      .returning()
      .execute();

    const input: CreateTransactionInput = {
      ...testInput,
      user_id: lowBalanceUser[0].id,
      product_id: productId
    };

    await expect(createTransaction(input)).rejects.toThrow(/insufficient balance/i);
  });

  it('should handle multiple transactions correctly', async () => {
    // Create a user with enough balance for two transactions
    const richUser = await db.insert(usersTable)
      .values({
        ...testUser,
        email: 'rich@example.com',
        balance: '100000.00'
      })
      .returning()
      .execute();

    const input: CreateTransactionInput = {
      ...testInput,
      user_id: richUser[0].id,
      product_id: productId
    };

    // First transaction
    const result1 = await createTransaction(input);
    expect(result1.amount).toEqual(25000);

    // Check balance after first transaction
    let user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, richUser[0].id))
      .execute();
    expect(parseFloat(user[0].balance)).toEqual(75000);

    // Second transaction
    const result2 = await createTransaction({
      ...input,
      target_number: '087654321098'
    });
    expect(result2.amount).toEqual(25000);

    // Check balance after second transaction
    user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, richUser[0].id))
      .execute();
    expect(parseFloat(user[0].balance)).toEqual(50000);

    // Verify both transactions exist
    const transactions = await db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, richUser[0].id))
      .execute();
    expect(transactions).toHaveLength(2);
  });
});