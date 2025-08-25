import { db } from '../db';
import { transactionsTable } from '../db/schema';
import { type GetTransactionHistoryInput, type Transaction } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getTransactionHistory = async (input: GetTransactionHistoryInput): Promise<Transaction[]> => {
  try {
    // Set default pagination values if not provided
    const limit = input.limit || 10;
    const offset = input.offset || 0;

    // Build query with proper ordering and pagination
    let query = db.select()
      .from(transactionsTable)
      .where(eq(transactionsTable.user_id, input.user_id))
      .orderBy(desc(transactionsTable.created_at))
      .limit(limit)
      .offset(offset);

    const results = await query.execute();

    // Convert numeric fields to numbers before returning
    return results.map(transaction => ({
      ...transaction,
      amount: parseFloat(transaction.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Transaction history fetch failed:', error);
    throw error;
  }
};