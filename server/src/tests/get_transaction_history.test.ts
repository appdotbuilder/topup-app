import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, serviceProvidersTable, serviceProductsTable, transactionsTable } from '../db/schema';
import { type GetTransactionHistoryInput } from '../schema';
import { getTransactionHistory } from '../handlers/get_transaction_history';

describe('getTransactionHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no transactions', async () => {
    // Create a user with no transactions
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: '0.00'
      })
      .returning()
      .execute();

    const input: GetTransactionHistoryInput = {
      user_id: userResult[0].id
    };

    const result = await getTransactionHistory(input);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return user transactions ordered by created_at desc', async () => {
    // Create prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: '100.00'
      })
      .returning()
      .execute();

    const providerResult = await db.insert(serviceProvidersTable)
      .values({
        name: 'Test Provider',
        category: 'games',
        logo_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const productResult = await db.insert(serviceProductsTable)
      .values({
        provider_id: providerResult[0].id,
        name: 'Test Product',
        description: 'Test Description',
        price: '10.99',
        nominal_value: '100 coins',
        is_active: true
      })
      .returning()
      .execute();

    // Create transactions with different timestamps (using raw SQL for precise timestamps)
    const transaction1 = await db.insert(transactionsTable)
      .values({
        user_id: userResult[0].id,
        product_id: productResult[0].id,
        amount: '10.99',
        status: 'success',
        target_number: '+1234567890',
        reference_id: 'TRX001',
        notes: 'First transaction'
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const transaction2 = await db.insert(transactionsTable)
      .values({
        user_id: userResult[0].id,
        product_id: productResult[0].id,
        amount: '25.50',
        status: 'pending',
        target_number: '+9876543210',
        reference_id: 'TRX002',
        notes: 'Second transaction'
      })
      .returning()
      .execute();

    const input: GetTransactionHistoryInput = {
      user_id: userResult[0].id
    };

    const result = await getTransactionHistory(input);

    expect(result).toHaveLength(2);

    // Verify ordering (newest first)
    expect(result[0].id).toEqual(transaction2[0].id);
    expect(result[1].id).toEqual(transaction1[0].id);

    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toEqual(25.50);
    expect(typeof result[1].amount).toBe('number');
    expect(result[1].amount).toEqual(10.99);

    // Verify all fields are present and correct
    expect(result[0]).toMatchObject({
      user_id: userResult[0].id,
      product_id: productResult[0].id,
      status: 'pending',
      target_number: '+9876543210',
      reference_id: 'TRX002',
      notes: 'Second transaction'
    });

    expect(result[1]).toMatchObject({
      user_id: userResult[0].id,
      product_id: productResult[0].id,
      status: 'success',
      target_number: '+1234567890',
      reference_id: 'TRX001',
      notes: 'First transaction'
    });
  });

  it('should respect pagination with limit and offset', async () => {
    // Create user and product setup
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: '100.00'
      })
      .returning()
      .execute();

    const providerResult = await db.insert(serviceProvidersTable)
      .values({
        name: 'Test Provider',
        category: 'pulsa',
        logo_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const productResult = await db.insert(serviceProductsTable)
      .values({
        provider_id: providerResult[0].id,
        name: 'Test Product',
        description: 'Test Description',
        price: '5.00',
        nominal_value: '50 credits',
        is_active: true
      })
      .returning()
      .execute();

    // Create 5 transactions
    const transactionPromises = [];
    for (let i = 0; i < 5; i++) {
      transactionPromises.push(
        db.insert(transactionsTable)
          .values({
            user_id: userResult[0].id,
            product_id: productResult[0].id,
            amount: (i + 1).toString() + '.00',
            status: 'success',
            target_number: `+123456789${i}`,
            reference_id: `TRX00${i + 1}`,
            notes: `Transaction ${i + 1}`
          })
          .execute()
      );
      
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 5));
    }

    await Promise.all(transactionPromises);

    // Test limit only
    const limitOnlyInput: GetTransactionHistoryInput = {
      user_id: userResult[0].id,
      limit: 3
    };

    const limitOnlyResult = await getTransactionHistory(limitOnlyInput);
    expect(limitOnlyResult).toHaveLength(3);

    // Test with offset
    const offsetInput: GetTransactionHistoryInput = {
      user_id: userResult[0].id,
      limit: 2,
      offset: 2
    };

    const offsetResult = await getTransactionHistory(offsetInput);
    expect(offsetResult).toHaveLength(2);

    // Verify that offset results are different from first results
    expect(offsetResult[0].reference_id).not.toEqual(limitOnlyResult[0].reference_id);
    expect(offsetResult[1].reference_id).not.toEqual(limitOnlyResult[1].reference_id);
  });

  it('should use default pagination when not specified', async () => {
    // Create user and prerequisite data
    const userResult = await db.insert(usersTable)
      .values({
        email: 'user@example.com',
        password_hash: 'hash123',
        full_name: 'Test User',
        phone_number: '+1234567890',
        balance: '100.00'
      })
      .returning()
      .execute();

    const providerResult = await db.insert(serviceProvidersTable)
      .values({
        name: 'Test Provider',
        category: 'data',
        logo_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const productResult = await db.insert(serviceProductsTable)
      .values({
        provider_id: providerResult[0].id,
        name: 'Test Product',
        description: 'Test Description',
        price: '15.00',
        nominal_value: '1GB',
        is_active: true
      })
      .returning()
      .execute();

    // Create more than 10 transactions to test default limit
    const transactionPromises = [];
    for (let i = 0; i < 15; i++) {
      transactionPromises.push(
        db.insert(transactionsTable)
          .values({
            user_id: userResult[0].id,
            product_id: productResult[0].id,
            amount: '15.00',
            status: 'success',
            target_number: `+123456789${i}`,
            reference_id: `TRX${i.toString().padStart(3, '0')}`,
            notes: `Transaction ${i + 1}`
          })
          .execute()
      );

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 2));
    }

    await Promise.all(transactionPromises);

    // Test without pagination parameters (should use defaults)
    const input: GetTransactionHistoryInput = {
      user_id: userResult[0].id
    };

    const result = await getTransactionHistory(input);

    // Should return default limit of 10
    expect(result).toHaveLength(10);
    
    // Verify numeric conversion
    result.forEach(transaction => {
      expect(typeof transaction.amount).toBe('number');
      expect(transaction.amount).toEqual(15.00);
    });
  });

  it('should only return transactions for specified user', async () => {
    // Create two users
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hash123',
        full_name: 'User One',
        phone_number: '+1111111111',
        balance: '50.00'
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hash456',
        full_name: 'User Two',
        phone_number: '+2222222222',
        balance: '75.00'
      })
      .returning()
      .execute();

    const providerResult = await db.insert(serviceProvidersTable)
      .values({
        name: 'Test Provider',
        category: 'e_money',
        logo_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const productResult = await db.insert(serviceProductsTable)
      .values({
        provider_id: providerResult[0].id,
        name: 'Test Product',
        description: 'Test Description',
        price: '20.00',
        nominal_value: '200k',
        is_active: true
      })
      .returning()
      .execute();

    // Create transactions for both users
    await db.insert(transactionsTable)
      .values({
        user_id: user1Result[0].id,
        product_id: productResult[0].id,
        amount: '20.00',
        status: 'success',
        target_number: '+1111111111',
        reference_id: 'TRX_USER1_001',
        notes: 'User 1 transaction'
      })
      .execute();

    await db.insert(transactionsTable)
      .values({
        user_id: user2Result[0].id,
        product_id: productResult[0].id,
        amount: '20.00',
        status: 'success',
        target_number: '+2222222222',
        reference_id: 'TRX_USER2_001',
        notes: 'User 2 transaction'
      })
      .execute();

    // Fetch transactions for user 1
    const input: GetTransactionHistoryInput = {
      user_id: user1Result[0].id
    };

    const result = await getTransactionHistory(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1Result[0].id);
    expect(result[0].reference_id).toEqual('TRX_USER1_001');
    expect(result[0].notes).toEqual('User 1 transaction');
    
    // Verify numeric conversion
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].amount).toEqual(20.00);
  });
});