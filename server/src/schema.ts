import { z } from 'zod';

// User authentication schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  full_name: z.string(),
  phone_number: z.string().nullable(),
  balance: z.number(),
  is_verified: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Input schemas for user operations
export const signUpInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(1),
  phone_number: z.string().nullable()
});

export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const signInInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type SignInInput = z.infer<typeof signInInputSchema>;

// Service category enum
export const serviceCategoryEnum = z.enum([
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

export type ServiceCategory = z.infer<typeof serviceCategoryEnum>;

// Service provider schema
export const serviceProviderSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: serviceCategoryEnum,
  logo_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type ServiceProvider = z.infer<typeof serviceProviderSchema>;

// Service product schema
export const serviceProductSchema = z.object({
  id: z.number(),
  provider_id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  nominal_value: z.string(), // e.g., "10GB", "100k", "30 days"
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type ServiceProduct = z.infer<typeof serviceProductSchema>;

// Transaction status enum
export const transactionStatusEnum = z.enum([
  'pending',
  'processing',
  'success',
  'failed',
  'cancelled'
]);

export type TransactionStatus = z.infer<typeof transactionStatusEnum>;

// Transaction schema
export const transactionSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  product_id: z.number(),
  amount: z.number(),
  status: transactionStatusEnum,
  target_number: z.string(), // Phone number, customer ID, etc.
  reference_id: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Transaction = z.infer<typeof transactionSchema>;

// Input schemas for transactions
export const createTransactionInputSchema = z.object({
  user_id: z.number(),
  product_id: z.number(),
  target_number: z.string(),
  notes: z.string().nullable()
});

export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

// Input schema for getting services by category
export const getServicesByCategoryInputSchema = z.object({
  category: serviceCategoryEnum
});

export type GetServicesByCategoryInput = z.infer<typeof getServicesByCategoryInputSchema>;

// User profile update schema
export const updateUserProfileInputSchema = z.object({
  user_id: z.number(),
  full_name: z.string().optional(),
  phone_number: z.string().nullable().optional()
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileInputSchema>;

// Balance top-up schema
export const topUpBalanceInputSchema = z.object({
  user_id: z.number(),
  amount: z.number().positive()
});

export type TopUpBalanceInput = z.infer<typeof topUpBalanceInputSchema>;

// Transaction history query schema
export const getTransactionHistoryInputSchema = z.object({
  user_id: z.number(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().nonnegative().optional()
});

export type GetTransactionHistoryInput = z.infer<typeof getTransactionHistoryInputSchema>;

// Authentication response schema
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;