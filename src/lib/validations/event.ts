import { format } from "date-fns";
import { z } from "zod";
import type { AdminEvent } from "@/lib/api-client";

const isoDate = z.iso.datetime({ offset: true });

const eventBase = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title must be at most 150 characters"),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be at most 5000 characters"),
  location: z
    .string()
    .trim()
    .min(2, "Location is required")
    .max(200, "Location must be at most 200 characters"),
  startsAt: isoDate,
  endsAt: isoDate,
  capacity: z
    .number()
    .int()
    .min(1, "Capacity must be at least 1")
    .max(100000, "Capacity must be at most 100000")
    .nullable(),
  registrationDeadline: isoDate.nullable(),
  isPublished: z.boolean(),
});

function checkDates(
  v: { startsAt: string; endsAt: string; registrationDeadline: string | null },
  ctx: z.RefinementCtx,
) {
  if (new Date(v.endsAt) <= new Date(v.startsAt))
    ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must be after the start" });
  if (v.registrationDeadline && new Date(v.registrationDeadline) > new Date(v.startsAt))
    ctx.addIssue({
      code: "custom",
      path: ["registrationDeadline"],
      message: "Deadline must be on or before the start",
    });
}

/** POST body, and the merged result of a PATCH. */
export const eventInputSchema = eventBase.superRefine(checkDates);
/** PATCH body: any subset of the event fields. */
export const eventUpdateSchema = eventBase.partial();
export type EventInput = z.output<typeof eventInputSchema>;

const isValidLocalDate = (value: string) => !Number.isNaN(new Date(value).getTime());

/** Form schema: raw string values from the inputs. */
export const eventFormSchema = z
  .object({
    title: eventBase.shape.title,
    description: eventBase.shape.description,
    location: eventBase.shape.location,
    // datetime-local value: "yyyy-MM-ddTHH:mm"
    startsAt: z.string().min(1, "Start is required").refine(isValidLocalDate, "Enter a valid date and time"),
    endsAt: z.string().min(1, "End is required").refine(isValidLocalDate, "Enter a valid date and time"),
    // "" means no deadline
    registrationDeadline: z
      .string()
      .refine((v) => v === "" || isValidLocalDate(v), "Enter a valid date and time"),
    // "" means unlimited
    capacity: z.string().regex(/^\d*$/, "Whole number only"),
    isPublished: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // Reuse the server rules so cross-field errors show up before the request is sent.
    if (
      !isValidLocalDate(v.startsAt) ||
      !isValidLocalDate(v.endsAt) ||
      (v.registrationDeadline !== "" && !isValidLocalDate(v.registrationDeadline)) ||
      !/^\d*$/.test(v.capacity)
    ) {
      return;
    }
    const result = eventInputSchema.safeParse(formToEventInput(v));
    if (result.success) return;
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (field === "endsAt" || field === "registrationDeadline" || field === "capacity") {
        ctx.addIssue({ code: "custom", path: [field], message: issue.message });
      }
    }
  });
export type EventFormValues = z.output<typeof eventFormSchema>;

/** datetime-local string (browser time zone) to ISO 8601 UTC. */
const localToIso = (value: string) => new Date(value).toISOString();
/** ISO 8601 to a datetime-local string in the browser time zone. */
const isoToLocal = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm");

export function formToEventInput(v: EventFormValues): EventInput {
  return {
    title: v.title,
    description: v.description,
    location: v.location,
    startsAt: localToIso(v.startsAt),
    endsAt: localToIso(v.endsAt),
    capacity: v.capacity === "" ? null : Number(v.capacity),
    registrationDeadline: v.registrationDeadline === "" ? null : localToIso(v.registrationDeadline),
    isPublished: v.isPublished,
  };
}

export function eventToFormValues(e: AdminEvent): EventFormValues {
  return {
    title: e.title,
    description: e.description,
    location: e.location,
    startsAt: isoToLocal(e.startsAt),
    endsAt: isoToLocal(e.endsAt),
    registrationDeadline: e.registrationDeadline ? isoToLocal(e.registrationDeadline) : "",
    capacity: e.capacity === null ? "" : String(e.capacity),
    isPublished: e.isPublished,
  };
}
