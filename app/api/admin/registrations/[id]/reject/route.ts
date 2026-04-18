/**
 * POST /api/admin/registrations/[id]/reject
 *
 * Rejects a pending RegistrationRequest:
 * 1. Fetch the RegistrationRequest by ID; return 404 if not found or already processed
 * 2. Update status to "rejected" with reviewedAt = now
 * 3. Do NOT create an Artist record
 * 4. Return { success: true }
 *
 * Requirements: 2.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { analyticsServer } from '@/lib/analytics-server';
import { notifyAdminRegistrationEvent } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = getDb();
  const reviewerId = request.headers.get('x-artist-id');

  // 1. Fetch the RegistrationRequest
  const registration = await db.registrationRequest.findUnique({
    where: { id },
  });

  if (!registration) {
    return NextResponse.json({ error: 'NOT_FOUND', message: 'Registration not found.' }, { status: 404 });
  }

  if (registration.status !== 'pending') {
    return NextResponse.json(
      { error: 'ALREADY_PROCESSED', message: 'This registration has already been processed.' },
      { status: 404 },
    );
  }

  const now = new Date();

  // 2. Update status to "rejected"
  await db.registrationRequest.update({
    where: { id },
    data: {
      status: 'rejected',
      reviewedAt: now,
      reviewedBy: reviewerId ?? undefined,
    },
  });

  const reviewer =
    reviewerId
      ? await db.artist.findUnique({
          where: { id: reviewerId },
          select: { fullName: true },
        })
      : null;

  await notifyAdminRegistrationEvent({
    event: 'registration_rejected',
    registrationId: id,
    applicantName: registration.fullName,
    applicantEmail: registration.email,
    reviewedByName: reviewer?.fullName,
  });

  // Capture analytics event
  try {
    analyticsServer?.capture({
      distinctId: request.headers.get('x-artist-id') ?? 'unknown-admin',
      event: 'registration_rejected',
      properties: { registration_id: id },
    })
  } catch { /* silently ignore */ }

  // 3. No Artist record created

  // 4. Return success
  return NextResponse.json({ success: true });
}
