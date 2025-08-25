import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const serviceCategoryEnum = pgEnum('service_category', [
  'games',
  'e_money', 
  'pulsa',
  'data',
  'tlp_sms',
  'masa_aktif',
  'pln',
  'voucher',
  'streaming',
  'pascabayar'
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
  'pending',
  'processing',
  'success',
  'failed',
  'cancelled'
]);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  full_name: text('full_name').notNull(),
  phone_number: text('phone_number'),
  balance: numeric('balance', { precision: 15, scale: 2 }).notNull().default('0.00'),
  is_verified: boolean('is_verified').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Service providers table
export const serviceProvidersTable = pgTable('service_providers', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  category: serviceCategoryEnum('category').notNull(),
  logo_url: text('logo_url'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Service products table
export const serviceProductsTable = pgTable('service_products', {
  id: serial('id').primaryKey(),
  provider_id: integer('provider_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 15, scale: 2 }).notNull(),
  nominal_value: text('nominal_value').notNull(), // e.g., "10GB", "100k", "30 days"
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Transactions table
export const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull(),
  product_id: integer('product_id').notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  status: transactionStatusEnum('status').notNull().default('pending'),
  target_number: text('target_number').notNull(),
  reference_id: text('reference_id'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  transactions: many(transactionsTable)
}));

export const serviceProvidersRelations = relations(serviceProvidersTable, ({ many }) => ({
  products: many(serviceProductsTable)
}));

export const serviceProductsRelations = relations(serviceProductsTable, ({ one, many }) => ({
  provider: one(serviceProvidersTable, {
    fields: [serviceProductsTable.provider_id],
    references: [serviceProvidersTable.id]
  }),
  transactions: many(transactionsTable)
}));

export const transactionsRelations = relations(transactionsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [transactionsTable.user_id],
    references: [usersTable.id]
  }),
  product: one(serviceProductsTable, {
    fields: [transactionsTable.product_id],
    references: [serviceProductsTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type ServiceProvider = typeof serviceProvidersTable.$inferSelect;
export type NewServiceProvider = typeof serviceProvidersTable.$inferInsert;

export type ServiceProduct = typeof serviceProductsTable.$inferSelect;
export type NewServiceProduct = typeof serviceProductsTable.$inferInsert;

export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  serviceProviders: serviceProvidersTable,
  serviceProducts: serviceProductsTable,
  transactions: transactionsTable
};