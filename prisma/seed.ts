import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL, // Supabase SESSION pooler, port 5432
  max: 5,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

/** now + `days` whole days, with the clock set to the given local hour (minutes/seconds zeroed). */
function dayAt(now: Date, days: number, hour: number): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

/** `base` + `hours`. */
function plusHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * 60 * 60 * 1000);
}

async function main(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email) {
    throw new Error("SEED_ADMIN_EMAIL is required");
  }
  if (!password || password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD is required and must be at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      name: "Administrator",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`Admin ensured: ${admin.email} (id=${admin.id})`);

  const eventCount = await prisma.event.count();
  if (eventCount > 0) {
    console.log(`Events already present (count=${eventCount}); skipping event seed.`);
  } else {
    const now = new Date();

    const accessibilityStart = dayAt(now, 7, 9);
    const cloudStart = dayAt(now, 14, 13);
    const planningStart = dayAt(now, 21, 10);

    const accessibilityDeadline = new Date(accessibilityStart);
    accessibilityDeadline.setDate(accessibilityDeadline.getDate() - 1);

    await prisma.event.createMany({
      data: [
        {
          title: "Intro to Web Accessibility",
          description:
            "A hands-on introduction to building accessible web interfaces. Learn WCAG basics, keyboard navigation, and screen-reader-friendly markup. Suitable for developers and designers alike.",
          location: "Room B201, Main Campus",
          startsAt: accessibilityStart,
          endsAt: plusHours(accessibilityStart, 3),
          capacity: 50,
          registrationDeadline: accessibilityDeadline,
          isPublished: true,
          createdById: admin.id,
        },
        {
          title: "Cloud Deployment Workshop",
          description:
            "A practical workshop on deploying applications to the cloud. We cover containerization, environment configuration, and zero-downtime rollouts. Seats are strictly limited.",
          location: "Room A104, Main Campus",
          startsAt: cloudStart,
          endsAt: plusHours(cloudStart, 4),
          capacity: 2,
          registrationDeadline: null,
          isPublished: true,
          createdById: admin.id,
        },
        {
          title: "Internal Planning Session (draft)",
          description:
            "An internal planning meeting for the organizing team. This draft entry is not yet published and is used to validate visibility rules. Agenda to be confirmed.",
          location: "Room C310, Main Campus",
          startsAt: planningStart,
          endsAt: plusHours(planningStart, 2),
          capacity: null,
          registrationDeadline: null,
          isPublished: false,
          createdById: admin.id,
        },
      ],
    });
    console.log("Created 3 demo events (accessibility, cloud workshop, draft planning session).");
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Seed failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
