import { z } from "zod";

const email = z.string().trim().toLowerCase().max(255).pipe(z.email("Enter a valid email address"));

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email,
  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password must be at most 72 characters"),
});
export const registerFormSchema = registerSchema
  .extend({ confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(72),
});

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
