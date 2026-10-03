// Server only: validated environment. Never import from a "use client" file.
import { z } from "zod";

export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    AUTH_SECRET: z.string().min(1),
    SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    SUPABASE_CERT_BUCKET: z.string().min(1).default("certificates"),
  })
  .parse(process.env);
