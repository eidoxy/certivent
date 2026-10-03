import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role: "PARTICIPANT" | "ADMIN";
  }
  interface Session {
    user: { id: string; role: "PARTICIPANT" | "ADMIN" } & DefaultSession["user"];
  }
}

// `next-auth/jwt` only re-exports `@auth/core/jwt`, so the JWT interface must be augmented at its origin.
declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    role: "PARTICIPANT" | "ADMIN";
  }
}
