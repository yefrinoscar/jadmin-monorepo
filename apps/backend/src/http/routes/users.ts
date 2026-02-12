import type { IncomingMessage, ServerResponse } from "http";
import { json, parseBody } from "../router.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
    getAllUsers,
    getUserById,
    getUserByEmail,
    updateUser,
    deleteUser,
    toggleUserDisabled,
    updateUserRole,
} from "../../lib/users.js";
import { auth } from "../../lib/auth.js";

// ─── Roles ───────────────────────────────────────────────────────────────────

const SUPERADMIN = "superadmin";

// ─── GET /api/users ──────────────────────────────────────────────────────────

export async function listUsersRoute(
    _req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>,
): Promise<void> {
    const users = await getAllUsers();
    json(res, { data: users });
}

// ─── GET /api/users/:id ──────────────────────────────────────────────────────

export async function getUserRoute(
    _req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const found = await getUserById(params.id);
    if (!found) {
        json(res, { error: "Usuario no encontrado" }, 404);
        return;
    }
    json(res, { data: found });
}

// ─── POST /api/users ─────────────────────────────────────────────────────────

export async function createUserRoute(
    req: IncomingMessage,
    res: ServerResponse,
    _params: Record<string, string>,
): Promise<void> {
    const currentUser = (req as AuthenticatedRequest).user;
    const body = await parseBody<{
        name: string;
        email: string;
        password: string;
        role: "admin" | "technician" | "client" | "superadmin";
        isDisabled?: boolean;
    }>(req);

    if (!body.name || !body.email || !body.password || !body.role) {
        json(res, { error: "Faltan campos requeridos: name, email, password, role" }, 400);
        return;
    }

    // Check if email already exists
    const existing = await getUserByEmail(body.email);
    if (existing) {
        json(res, { error: "El email ya está registrado" }, 409);
        return;
    }

    // Protection: prevent non-superadmin from creating superadmin
    if (body.role === SUPERADMIN && currentUser.role !== SUPERADMIN) {
        json(res, { error: "Solo un Superadmin puede asignar el rol de Superadmin" }, 403);
        return;
    }

    // Create user using better-auth
    const result = await auth.api.signUpEmail({
        body: {
            email: body.email,
            password: body.password,
            name: body.name,
            role: body.role,
            isDisabled: false,
        },
    });

    let createdUser = result.user;

    if (body.isDisabled) {
        const updated = await toggleUserDisabled(createdUser.id, true);
        if (updated) createdUser = updated as typeof createdUser;
    }

    json(res, { data: createdUser }, 201);
}

// ─── PATCH /api/users/:id ────────────────────────────────────────────────────

export async function updateUserRoute(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const currentUser = (req as AuthenticatedRequest).user;
    const { id } = params;

    const target = await getUserById(id);
    if (!target) {
        json(res, { error: "Usuario no encontrado" }, 404);
        return;
    }

    // Protection: Only Superadmin can edit a Superadmin
    if (target.role === SUPERADMIN && currentUser.role !== SUPERADMIN) {
        json(res, { error: "Solo un Superadmin puede editar a otro Superadmin" }, 403);
        return;
    }

    const body = await parseBody<{
        name?: string;
        email?: string;
        role?: "admin" | "technician" | "client" | "superadmin";
        isDisabled?: boolean;
    }>(req);

    // Protection: Cannot disable a Superadmin
    if (target.role === SUPERADMIN && body.isDisabled) {
        json(res, { error: "No se puede desactivar a un Superadmin" }, 403);
        return;
    }

    // Protection: prevent non-superadmin from promoting to superadmin
    if (body.role === SUPERADMIN && currentUser.role !== SUPERADMIN) {
        json(res, { error: "Solo un Superadmin puede asignar el rol de Superadmin" }, 403);
        return;
    }

    // Check email uniqueness if changing email
    if (body.email && body.email !== target.email) {
        const existing = await getUserByEmail(body.email);
        if (existing) {
            json(res, { error: "El email ya está registrado" }, 409);
            return;
        }
    }

    const updated = await updateUser(id, body);
    json(res, { data: updated });
}

// ─── PATCH /api/users/:id/role ───────────────────────────────────────────────

export async function updateUserRoleRoute(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const currentUser = (req as AuthenticatedRequest).user;
    const { id } = params;

    const target = await getUserById(id);
    if (!target) {
        json(res, { error: "Usuario no encontrado" }, 404);
        return;
    }

    // Protection: Only Superadmin can edit Superadmin
    if (target.role === SUPERADMIN && currentUser.role !== SUPERADMIN) {
        json(res, { error: "Solo un Superadmin puede editar a otro Superadmin" }, 403);
        return;
    }

    const { role } = await parseBody<{ role: "admin" | "technician" | "client" | "superadmin" }>(req);

    // Protection: prevent non-superadmin from promoting to superadmin
    if (role === SUPERADMIN && currentUser.role !== SUPERADMIN) {
        json(res, { error: "Solo un Superadmin puede asignar el rol de Superadmin" }, 403);
        return;
    }

    const updated = await updateUserRole(id, role);
    json(res, { data: updated });
}

// ─── PATCH /api/users/:id/toggle-disabled ────────────────────────────────────

export async function toggleUserDisabledRoute(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const currentUser = (req as AuthenticatedRequest).user;
    const { id } = params;

    const target = await getUserById(id);
    if (!target) {
        json(res, { error: "Usuario no encontrado" }, 404);
        return;
    }

    // Protection: Only Superadmin can modify Superadmin
    if (target.role === SUPERADMIN && currentUser.role !== SUPERADMIN) {
        json(res, { error: "Solo un Superadmin puede modificar a otro Superadmin" }, 403);
        return;
    }

    const { isDisabled } = await parseBody<{ isDisabled: boolean }>(req);

    // Protection: Cannot disable a Superadmin
    if (target.role === SUPERADMIN && isDisabled) {
        json(res, { error: "No se puede desactivar a un Superadmin" }, 403);
        return;
    }

    const updated = await toggleUserDisabled(id, isDisabled);
    json(res, { data: updated });
}

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────

export async function deleteUserRoute(
    req: IncomingMessage,
    res: ServerResponse,
    params: Record<string, string>,
): Promise<void> {
    const currentUser = (req as AuthenticatedRequest).user;
    const { id } = params;

    const target = await getUserById(id);
    if (!target) {
        json(res, { error: "Usuario no encontrado" }, 404);
        return;
    }

    // Protection: Only Superadmin can delete Superadmin
    if (target.role === SUPERADMIN && currentUser.role !== SUPERADMIN) {
        json(res, { error: "Solo un Superadmin puede eliminar a otro Superadmin" }, 403);
        return;
    }

    // Protection: Prevent deleting yourself
    if (target.id === currentUser.id) {
        json(res, { error: "No puedes eliminar tu propia cuenta" }, 403);
        return;
    }

    await deleteUser(id);
    json(res, { data: { success: true } });
}
