import { z } from "zod";

/** Statuses an admin may set. CANCELLED is participant-only and is never accepted here. */
export const statusUpdateSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ATTENDED"]),
});
export type StatusUpdateInput = z.infer<typeof statusUpdateSchema>;

/** Query filter for the participants list; `ALL` means no status filter. */
export const registrationFilterSchema = z.object({
  status: z.enum(["ALL", "PENDING", "APPROVED", "REJECTED", "ATTENDED", "CANCELLED"]).default("ALL"),
});
export type RegistrationFilterInput = z.infer<typeof registrationFilterSchema>;
