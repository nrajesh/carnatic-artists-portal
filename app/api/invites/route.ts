import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createArtistInvite } from "@/lib/artist-invites";
import { verifySession } from "@/lib/session-jwt";

const createInviteSchema = z.object({
  selectedLinkType: z.string().trim().min(1),
  selectedLinkUrl: z.string().trim().url(),
});

export async function POST(request: NextRequest) {
  const sessionToken = (await cookies()).get("session")?.value ?? null;
  const session = sessionToken ? await verifySession(sessionToken) : null;
  if (!session) {
    return NextResponse.json(
      {
        error: "UNAUTHENTICATED",
        message: "Sign in to create an invite link.",
      },
      { status: 401 },
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "INVALID_REQUEST",
        message: "Could not read the invite request.",
      },
      { status: 400 },
    );
  }

  const parsed = createInviteSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "VALIDATION_ERROR",
        message: "Pick one of your saved profile links.",
      },
      { status: 400 },
    );
  }

  try {
    const invite = await createArtistInvite({
      inviterArtistId: session.artistId,
      selectedLinkType: parsed.data.selectedLinkType,
      selectedLinkUrl: parsed.data.selectedLinkUrl,
    });
    const invitePath = `/invite/${invite.token}`;
    const inviteUrl = `${request.nextUrl.origin}${invitePath}`;

    return NextResponse.json({
      success: true,
      invitePath,
      inviteUrl,
      invite,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create invite link.";
    const status = message.includes("not ready yet") ? 503 : 400;
    return NextResponse.json(
      {
        error: "INVITE_CREATE_FAILED",
        message,
      },
      { status },
    );
  }
}
