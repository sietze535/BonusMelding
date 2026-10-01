import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createManageToken } from "@/lib/auth";
import { sendMagicLinkEmail } from "@/lib/email";

const bodySchema = z.object({
  email: z.string().email().max(254),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const db = getDb();
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    let manageToken: string;

    if (existing) {
      manageToken = existing.manageToken;
    } else {
      manageToken = createManageToken();
      await db.insert(users).values({ email, manageToken });
    }

    await sendMagicLinkEmail(email, manageToken);

    return NextResponse.json({
      ok: true,
      message: "Check je inbox voor de inloglink.",
    });
  } catch (error) {
    console.error("request-link error", error);
    return NextResponse.json(
      { error: "Kon geen e-mail versturen. Probeer later opnieuw." },
      { status: 500 },
    );
  }
}
