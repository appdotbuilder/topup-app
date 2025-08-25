import { db } from '../db';
import { usersTable, transactionsTable } from '../db/schema';
import { type TopUpBalanceInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export async function topUpBalance(input: TopUpBalanceInput): Promise<User> {
  try {
    // First, verify the user exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    const currentUser = existingUsers[0];

    // Calculate new balance
    const currentBalance = parseFloat(currentUser.balance);
    const newBalance = currentBalance + input.amount;

    // Update user balance in a transaction-like manner
    // Update the user's balance
    const updatedUsers = await db.update(usersTable)
      .set({ 
        balance: newBalance.toString(), // Convert to string for numeric column
        updated_at: new Date()
      })
      .where(eq(usersTable.id, input.user_id))
      .returning()
      .execute();

    const updatedUser = updatedUsers[0];

    // Create a transaction record for the top-up
    // Note: We'll create a special product_id = 0 to indicate balance top-up
    await db.insert(transactionsTable)
      .values({
        user_id: input.user_id,
        product_id: 0, // Special ID for balance top-ups
        amount: input.amount.toString(), // Convert to string for numeric column
        status: 'success',
        target_number: currentUser.phone_number || currentUser.email, // Use phone or email as target
        reference_id: `TOPUP_${Date.now()}_${input.user_id}`,
        notes: `Balance top-up of ${input.amount}`
      })
      .execute();

    // Return user with numeric balance converted back
    return {
      ...updatedUser,
      balance: parseFloat(updatedUser.balance) // Convert string back to number
    };
  } catch (error) {
    console.error('Balance top-up failed:', error);
    throw error;
  }
}