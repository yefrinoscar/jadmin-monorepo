import { router } from "../trpc";
import { userRouter } from "./user";

/**
 * Main app router - merges all sub-routers
 */
export const appRouter = router({
  user: userRouter,
});

// Export type definition of the API
export type AppRouter = typeof appRouter;
