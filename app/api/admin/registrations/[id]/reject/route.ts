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
import { db } from '@/lib/db';

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

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
    },
  });

  // 3. No Artist record created

  // 4. Return success
  return NextResponse.json({ success: true });
}
