export const ROLES = ["PARTICIPANT", "ADMIN"] as const;
export const REGISTRATION_STATUSES = ["PENDING", "APPROVED", "REJECTED", "ATTENDED", "CANCELLED"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export const ACTIVE_STATUSES: RegistrationStatus[] = ["PENDING", "APPROVED", "ATTENDED"];
export const CERT_MAX_BYTES = 4 * 1024 * 1024;
export const CERT_MIME_TYPES = ["application/pdf", "image/png", "image/jpeg"] as const;
export const ADMIN_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["ATTENDED", "REJECTED", "PENDING"],
  REJECTED: ["PENDING", "APPROVED"],
  ATTENDED: ["APPROVED"],
  CANCELLED: [],
};
