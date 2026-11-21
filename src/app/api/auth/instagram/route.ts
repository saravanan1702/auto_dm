import { NextResponse } from "next/server";
import { authorizeUrl } from "@/lib/instagram";

// Starts "Connect Instagram". A random state cookie protects the callback against CSRF.
export async function GET() {
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(authorizeUrl(state));
  res.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
