import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, ok, parseJson, route } from "@/lib/http";
import { registerSchema } from "@/lib/validations/auth";
import bcrypt from "bcryptjs";

const emailTaken = () => new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists");

// public
export const POST = route(async (req: Request) => {
  const { name, email, password } = await parseJson(req, registerSchema);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) throw emailTaken();

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({
      data: { name, email, passwordHash, role: "PARTICIPANT" },
      select: { id: true, name: true, email: true, role: true },
    });
    return ok(user, 201);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw emailTaken();
    throw err;
  }
});
