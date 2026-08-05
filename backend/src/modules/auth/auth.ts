import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { environment } from "../../config/environment.js";
import { prisma } from "../../config/prisma.js";

export const auth = betterAuth({
  appName: "SIMPATIK",
  baseURL: environment.BETTER_AUTH_URL,
  basePath: "/api/auth",
  secret: environment.BETTER_AUTH_SECRET,
  trustedOrigins: environment.trustedOrigins,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "PETUGAS_UPT",
        input: false,
      },
      uptId: {
        type: "string",
        required: false,
        input: false,
      },
      active: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },
  session: {
    storeSessionInDatabase: true,
    expiresIn: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  advanced: {
    useSecureCookies: environment.NODE_ENV !== "development",
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: environment.NODE_ENV !== "development",
    },
  },
  disabledPaths: ["/sign-up/email"],
  rateLimit: {
    enabled: true,
    window: 60,
    max: 10,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (context.path !== "/sign-in/email") {
        return;
      }

      const email = typeof context.body?.email === "string" ? context.body.email : "";
      const user = email
        ? await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            select: { active: true },
          })
        : null;

      if (user && !user.active) {
        throw new APIError("UNAUTHORIZED", {
          message: "Kredensial tidak valid.",
        });
      }
    }),
  },
  telemetry: {
    enabled: false,
  },
});

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;
