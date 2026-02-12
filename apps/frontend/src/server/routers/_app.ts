import { router } from "../trpc";
import { userRouter } from "./user";
import { conversationRouter } from "./conversation";

/**
 * Main app router - merges all sub-routers
 */
export const appRouter = router({
  user: userRouter,
  conversation: conversationRouter,
});

// Export type definition of the API
export type AppRouter = typeof appRouter;
