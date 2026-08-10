import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const res = NextResponse.redirect(new URL("/login", req.url), { status: 303 });
  res.cookies.set(config.nomeCookie, "", { path: "/", maxAge: 0 });
  return res;
}
