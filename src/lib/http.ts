import { z } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const ok = <T>(data: T, status = 200) => Response.json({ data }, { status });

export const fail = (e: HttpError) =>
  Response.json(
    { error: { code: e.code, message: e.message, fieldErrors: e.fieldErrors } },
    { status: e.status },
  );

/** Wrap every Route Handler: catches HttpError -> fail(), anything else -> 500 INTERNAL_ERROR (console.error). */
export function route<C>(fn: (req: Request, ctx: C) => Promise<Response>) {
  return async (req: Request, ctx: C): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (err) {
      if (err instanceof HttpError) return fail(err);
      console.error("Unhandled route error:", err);
      return fail(new HttpError(500, "INTERNAL_ERROR", "Something went wrong. Please try again."));
    }
  };
}

/** Parse JSON body with a Zod schema; throws HttpError(400, "VALIDATION_ERROR", ..., fieldErrors). */
export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new HttpError(400, "VALIDATION_ERROR", "Request body must be valid JSON");
  }
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Validation failed",
      z.flattenError(result.error).fieldErrors as Record<string, string[]>,
    );
  }
  return result.data;
}
