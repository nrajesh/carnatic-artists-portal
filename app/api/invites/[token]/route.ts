import { NextRequest, NextResponse } from "next/server";
import { getPublicArtistInviteView } from "@/lib/artist-invites";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const invite = await getPublicArtistInviteView(token);
  if (!invite) {
    return NextResponse.json(
      {
        error: "NOT_FOUND",
        message: "Invite not found.",
      },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    invite,
  });
}
