/**
 * GET /api/specialities
 * Returns all specialities from the DB as [{ id, name, primaryColor, textColor }].
 * Requirements: 1.2, 1.8
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const specialities = await db.speciality.findMany({
      select: {
        id: true,
        name: true,
        primaryColor: true,
        textColor: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(specialities);
  } catch (error) {
    console.error('Failed to fetch specialities:', error);
    return NextResponse.json({ error: 'Failed to fetch specialities' }, { status: 500 });
  }
}
