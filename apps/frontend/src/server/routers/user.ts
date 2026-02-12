import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { user } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { USER_ROLES } from "@/lib/constants";
import { auth } from "@/lib/auth";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
  /**
   * Get all users - protected route
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.select().from(user);
    return users;
  }),

  /**
   * Get user by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [foundUser] = await ctx.db
        .select()
        .from(user)
        .where(eq(user.id, input.id))
        .limit(1);
      return foundUser ?? null;
    }),

  /**
   * Create a new user
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido"),
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        role: z.enum([
          USER_ROLES.ADMIN,
          USER_ROLES.TECHNICIAN,
          USER_ROLES.CLIENT,
          USER_ROLES.SUPERADMIN,
        ]),
        isDisabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if email already exists
      const existingUser = await ctx.db
        .select()
        .from(user)
        .where(eq(user.email, input.email))
        .limit(1);

      if (existingUser.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "El email ya está registrado",
        });
      }

      // Create user using better-auth
      // We must create the user as enabled first to allow session creation (workaround for our anti-disabled-session hook)
      // or to ensure creation succeeds. Then we update the user if they should be disabled.
      const result = await auth.api.signUpEmail({
        body: {
          email: input.email,
          password: input.password,
          name: input.name,
          role: input.role,
          isDisabled: false, // Create enabled initially
        },
      });

      let createdUser = result.user;

      if (input.isDisabled) {
        const [updatedUser] = await ctx.db
          .update(user)
          .set({ isDisabled: true })
          .where(eq(user.id, createdUser.id))
          .returning();
        
        if (updatedUser) {
          createdUser = updatedUser;
        }
      }

      return createdUser;
    }),

  /**
   * Update user role
   */
  updateRole: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        role: z.enum([
          USER_ROLES.ADMIN,
          USER_ROLES.TECHNICIAN,
          USER_ROLES.CLIENT,
          USER_ROLES.SUPERADMIN,
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get target user to check permissions
      const [targetUser] = await ctx.db
        .select()
        .from(user)
        .where(eq(user.id, input.id))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      const currentUser = ctx.session.user;

      // Protection: Only Superadmin can edit Superadmin
      if (
        targetUser.role === USER_ROLES.SUPERADMIN &&
        currentUser.role !== USER_ROLES.SUPERADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo un Superadmin puede editar a otro Superadmin",
        });
      }

      // Protection: Cannot demote the last Superadmin (Optional but good practice, skipping for now as not requested)

      const [updatedUser] = await ctx.db
        .update(user)
        .set({ role: input.role })
        .where(eq(user.id, input.id))
        .returning();
      return updatedUser;
    }),

  /**
   * Update user details (name, email, role, isDisabled)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1, "El nombre es requerido"),
        email: z.string().email("Email inválido"),
        role: z.enum([
          USER_ROLES.ADMIN,
          USER_ROLES.TECHNICIAN,
          USER_ROLES.CLIENT,
          USER_ROLES.SUPERADMIN,
        ]).optional(),
        isDisabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get target user to check permissions
      const [targetUser] = await ctx.db
        .select()
        .from(user)
        .where(eq(user.id, input.id))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      const currentUser = ctx.session.user;

      // Protection: Only Superadmin can edit a Superadmin
      if (
        targetUser.role === USER_ROLES.SUPERADMIN &&
        currentUser.role !== USER_ROLES.SUPERADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo un Superadmin puede editar a otro Superadmin",
        });
      }

      // Protection: Cannot disable a Superadmin
      if (targetUser.role === USER_ROLES.SUPERADMIN && input.isDisabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No se puede desactivar a un Superadmin",
        });
      }

      // Protection: prevent non-superadmin from promoting to superadmin
      if (
        input.role === USER_ROLES.SUPERADMIN &&
        currentUser.role !== USER_ROLES.SUPERADMIN
      ) {
         throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo un Superadmin puede asignar el rol de Superadmin",
        });
      }

      const updateData: any = {
        name: input.name,
        email: input.email,
        isDisabled: input.isDisabled,
      };

      if (input.role) {
        updateData.role = input.role;
      }

      const [updatedUser] = await ctx.db
        .update(user)
        .set(updateData)
        .where(eq(user.id, input.id))
        .returning();
      return updatedUser;
    }),

  /**
   * Delete user
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get target user to check permissions
      const [targetUser] = await ctx.db
        .select()
        .from(user)
        .where(eq(user.id, input.id))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      const currentUser = ctx.session.user;

      // Protection: Only Superadmin can edit (delete) Superadmin
      if (
        targetUser.role === USER_ROLES.SUPERADMIN &&
        currentUser.role !== USER_ROLES.SUPERADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo un Superadmin puede eliminar a otro Superadmin",
        });
      }

      // Protection: Prevent deleting yourself
      if (targetUser.id === currentUser.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No puedes eliminar tu propia cuenta",
        });
      }

      await ctx.db.delete(user).where(eq(user.id, input.id));
      return { success: true };
    }),

  /**
   * Toggle user disabled status
   */
  toggleDisabled: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        isDisabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get target user to check permissions
      const [targetUser] = await ctx.db
        .select()
        .from(user)
        .where(eq(user.id, input.id))
        .limit(1);

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Usuario no encontrado",
        });
      }

      const currentUser = ctx.session.user;

      // Protection: Only Superadmin can edit (disable) Superadmin
      if (
        targetUser.role === USER_ROLES.SUPERADMIN &&
        currentUser.role !== USER_ROLES.SUPERADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo un Superadmin puede modificar a otro Superadmin",
        });
      }

      // Protection: Cannot disable a Superadmin
      if (targetUser.role === USER_ROLES.SUPERADMIN && input.isDisabled) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No se puede desactivar a un Superadmin",
        });
      }

      const [updatedUser] = await ctx.db
        .update(user)
        .set({ isDisabled: input.isDisabled })
        .where(eq(user.id, input.id))
        .returning();
      return updatedUser;
    }),
});
