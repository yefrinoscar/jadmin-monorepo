import { betterAuth, APIError } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "./db";
import { sendEmail } from "./email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "client",
      },
      isDisabled: {
        type: "boolean",
        required: false,
        defaultValue: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      // Don't await to prevent timing attacks
      void sendEmail({
        to: user.email,
        subject: "Restablece tu contraseña - jadmin",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #18181b; font-size: 24px; margin: 0;">jadmin</h1>
                </div>
                <h2 style="color: #18181b; font-size: 20px; margin-bottom: 16px;">Restablece tu contraseña</h2>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Hola ${user.name || 'Usuario'},
                </p>
                <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña:
                </p>
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${url}" style="display: inline-block; background: #18181b; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                    Restablecer contraseña
                  </a>
                </div>
                <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-top: 24px;">
                  Este enlace expirará en 1 hora. Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
                </p>
                <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
                <p style="color: #a1a1aa; font-size: 12px; text-align: center;">
                  © ${new Date().getFullYear()} jadmin. Todos los derechos reservados.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session) => {
          const user = await db.query.user.findFirst({
            where: (users, { eq }) => eq(users.id, session.userId),
          });

          if (user?.isDisabled) {
            // Prevent session creation for disabled users and throw a descriptive error
            console.error("User login blocked: Account disabled", user.email);
            throw new APIError("FORBIDDEN", {
              message: "Tu cuenta está desactivada. Por favor, contacta al administrador."
            });
          }

          if (user?.role === "client") {
             // Allow session creation for newly created users (within last 10 seconds)
             // This is required because signUpEmail automatically creates a session.
             // We drop this session in the admin flow, so it's safe.
             // Real users trying to login will have an older createdAt.
             const isNewUser = user.createdAt && (new Date().getTime() - new Date(user.createdAt).getTime() < 10000);
             
             if (!isNewUser) {
                console.error("User login blocked: Client role not allowed", user.email);
                throw new APIError("FORBIDDEN", {
                  message: "No tienes permisos para acceder al panel de administración."
                });
             }
          }
        },
      },
    },
  },
  plugins: [tanstackStartCookies()], // Must be last plugin for TanStack Start
});
