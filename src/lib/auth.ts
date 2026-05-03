import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET!,
  cookieName: "mysteamstats_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export interface SessionData {
  userId?: string;
  steamId?: string;
}

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) {
    redirect("/");
  }
  return session;
}
