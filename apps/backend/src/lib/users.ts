import { db } from "../db/client.js";
import { user } from "../db/schema/index.js";
import { eq } from "drizzle-orm";

// ─── Queries ─────────────────────────────────────────────────────────────────

export async function getAllUsers() {
    return db.select().from(user);
}

export async function getUserById(id: string) {
    const [found] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    return found ?? null;
}

export async function getUserByEmail(email: string) {
    const [found] = await db.select().from(user).where(eq(user.email, email)).limit(1);
    return found ?? null;
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function updateUser(
    id: string,
    data: {
        name?: string;
        email?: string;
        role?: "admin" | "technician" | "client" | "superadmin";
        isDisabled?: boolean;
    },
) {
    const [updated] = await db
        .update(user)
        .set(data)
        .where(eq(user.id, id))
        .returning();
    return updated ?? null;
}

export async function deleteUser(id: string) {
    await db.delete(user).where(eq(user.id, id));
}

export async function toggleUserDisabled(id: string, isDisabled: boolean) {
    const [updated] = await db
        .update(user)
        .set({ isDisabled })
        .where(eq(user.id, id))
        .returning();
    return updated ?? null;
}

export async function updateUserRole(id: string, role: string) {
    const [updated] = await db
        .update(user)
        .set({ role: role as any })
        .where(eq(user.id, id))
        .returning();
    return updated ?? null;
}
