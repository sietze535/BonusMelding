import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { users, type User } from "./db/schema";

export const SESSION_COOKIE = "bm_session";

export function createManageToken(): string {
  return nanoid(32);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.manageToken, token))
    .limit(1);

  return user ?? null;
}

export async function getUserByManageToken(
  token: string,
): Promise<User | null> {
  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.manageToken, token))
    .limit(1);
  return user ?? null;
}

export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
