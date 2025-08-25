import { db } from '../db';
import { transactionsTable, usersTable, serviceProductsTable } from '../db/schema';
import { type CreateTransactionInput, type Transaction } from '../schema';
import { eq } from 'drizzle-orm';

export async function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  try {
    // First, get the product to check its price and if it exists
    const products = await db.select()
      .from(serviceProductsTable)
      .where(eq(serviceProductsTable.id, input.product_id))
      .execute();

    if (products.length === 0) {
      throw new Error('Product not found');
    }

    const product = products[0];
    
    if (!product.is_active) {
      throw new Error('Product is not active');
    }

    const productPrice = parseFloat(product.price);

    // Get user to check balance and if user exists
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    const userBalance = parseFloat(user.balance);

    // Check if user has sufficient balance
    if (userBalance < productPrice) {
      throw new Error('Insufficient balance');
    }

    // Create the transaction record
    const transactionResult = await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        product_id: input.product_id,
        amount: productPrice.toString(),
        status: 'pending',
        target_number: input.target_number,
        reference_id: null,
        notes: input.notes || null
      })
      .returning()
      .execute();

    const transaction = transactionResult[0];

    // Deduct amount from user balance
    const newBalance = userBalance - productPrice;
    await db.update(usersTable)
      .set({ 
        balance: newBalance.toString(),
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .execute();

    // Return the transaction with proper numeric conversion
    return {
      ...transaction,
      amount: parseFloat(transaction.amount)
    };
  } catch (error) {
    console.error('Transaction creation failed:', error);
    throw error;
  }
}