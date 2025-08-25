import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  signUpInputSchema,
  signInInputSchema,
  getServicesByCategoryInputSchema,
  createTransactionInputSchema,
  getTransactionHistoryInputSchema,
  updateUserProfileInputSchema,
  topUpBalanceInputSchema
} from './schema';

// Import handlers
import { signUp } from './handlers/sign_up';
import { signIn } from './handlers/sign_in';
import { getServicesByCategory } from './handlers/get_services_by_category';
import { getServiceProducts } from './handlers/get_service_products';
import { createTransaction } from './handlers/create_transaction';
import { getTransactionHistory } from './handlers/get_transaction_history';
import { getUserProfile } from './handlers/get_user_profile';
import { updateUserProfile } from './handlers/update_user_profile';
import { topUpBalance } from './handlers/top_up_balance';
import { getAllServiceCategories } from './handlers/get_all_service_categories';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Authentication routes
  signUp: publicProcedure
    .input(signUpInputSchema)
    .mutation(({ input }) => signUp(input)),

  signIn: publicProcedure
    .input(signInInputSchema)
    .mutation(({ input }) => signIn(input)),

  // Service management routes
  getAllServiceCategories: publicProcedure
    .query(() => getAllServiceCategories()),

  getServicesByCategory: publicProcedure
    .input(getServicesByCategoryInputSchema)
    .query(({ input }) => getServicesByCategory(input)),

  getServiceProducts: publicProcedure
    .input(z.object({ providerId: z.number() }))
    .query(({ input }) => getServiceProducts(input.providerId)),

  // Transaction routes
  createTransaction: publicProcedure
    .input(createTransactionInputSchema)
    .mutation(({ input }) => createTransaction(input)),

  getTransactionHistory: publicProcedure
    .input(getTransactionHistoryInputSchema)
    .query(({ input }) => getTransactionHistory(input)),

  // User account management routes
  getUserProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserProfile(input.userId)),

  updateUserProfile: publicProcedure
    .input(updateUserProfileInputSchema)
    .mutation(({ input }) => updateUserProfile(input)),

  topUpBalance: publicProcedure
    .input(topUpBalanceInputSchema)
    .mutation(({ input }) => topUpBalance(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();