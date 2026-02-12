import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { USER_ROLES } from "@/lib/constants";
import { TRPCError } from "@trpc/server";
import { backendApi } from "@/lib/backend";

// ─── Helper: extract cookie from tRPC request context ────────────────────────

function getCookie(ctx: { req: Request }): string {
  return ctx.req.headers.get("cookie") || "";
}

export const userRouter = router({
  /**
   * Get all users - protected route
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const res = await backendApi<{ data: any[] }>("/api/users", {
      cookie: getCookie(ctx),
    });
    return res.data;
  }),

  /**
   * Get user by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const res = await backendApi<{ data: any }>(`/api/users/${input.id}`, {
          cookie: getCookie(ctx),
        });
        return res.data ?? null;
      } catch {
        return null;
      }
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
      try {
        const res = await backendApi<{ data: any }>("/api/users", {
          method: "POST",
          cookie: getCookie(ctx),
          body: input,
        });
        return res.data;
      } catch (error: any) {
        if (error.message?.includes("email ya está registrado")) {
          throw new TRPCError({ code: "CONFLICT", message: error.message });
        }
        if (error.message?.includes("Superadmin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: error.message });
        }
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }
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
      try {
        const res = await backendApi<{ data: any }>(
          `/api/users/${input.id}/role`,
          { method: "PATCH", cookie: getCookie(ctx), body: { role: input.role } },
        );
        return res.data;
      } catch (error: any) {
        throw new TRPCError({
          code: error.message?.includes("no encontrado") ? "NOT_FOUND" : "FORBIDDEN",
          message: error.message,
        });
      }
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
      const { id, ...body } = input;
      try {
        const res = await backendApi<{ data: any }>(
          `/api/users/${id}`,
          { method: "PATCH", cookie: getCookie(ctx), body },
        );
        return res.data;
      } catch (error: any) {
        if (error.message?.includes("no encontrado")) {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        if (error.message?.includes("email ya está registrado")) {
          throw new TRPCError({ code: "CONFLICT", message: error.message });
        }
        throw new TRPCError({ code: "FORBIDDEN", message: error.message });
      }
    }),

  /**
   * Delete user
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await backendApi(`/api/users/${input.id}`, {
          method: "DELETE",
          cookie: getCookie(ctx),
        });
        return { success: true };
      } catch (error: any) {
        if (error.message?.includes("no encontrado")) {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        throw new TRPCError({ code: "FORBIDDEN", message: error.message });
      }
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
      try {
        const res = await backendApi<{ data: any }>(
          `/api/users/${input.id}/toggle-disabled`,
          { method: "PATCH", cookie: getCookie(ctx), body: { isDisabled: input.isDisabled } },
        );
        return res.data;
      } catch (error: any) {
        if (error.message?.includes("no encontrado")) {
          throw new TRPCError({ code: "NOT_FOUND", message: error.message });
        }
        throw new TRPCError({ code: "FORBIDDEN", message: error.message });
      }
    }),
});
