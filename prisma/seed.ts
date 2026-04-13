import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Speciality seed data.
 *
 * Colours are chosen to be:
 *  - Visually distinct and culturally appropriate for a Carnatic music portal
 *  - WCAG AA compliant: contrast ratio between textColor and primaryColor ≥ 4.5:1
 *
 * All entries use #FFFFFF as textColor against dark/saturated primary colours,
 * which comfortably exceeds the 4.5:1 threshold.
 */
const specialities = [
  { name: 'Vocal',             primaryColor: '#7C3AED', textColor: '#FFFFFF' },
  { name: 'Violin',            primaryColor: '#B45309', textColor: '#FFFFFF' },
  { name: 'Mridangam',         primaryColor: '#B91C1C', textColor: '#FFFFFF' },
  { name: 'Veena',             primaryColor: '#047857', textColor: '#FFFFFF' },
  { name: 'Flute',             primaryColor: '#0369A1', textColor: '#FFFFFF' },
  { name: 'Ghatam',            primaryColor: '#92400E', textColor: '#FFFFFF' },
  { name: 'Kanjira',           primaryColor: '#BE185D', textColor: '#FFFFFF' },
  { name: 'Thavil',            primaryColor: '#7E22CE', textColor: '#FFFFFF' },
  { name: 'Nadaswaram',        primaryColor: '#C2410C', textColor: '#FFFFFF' },
  { name: 'Violin (Carnatic)', primaryColor: '#A16207', textColor: '#FFFFFF' },
  { name: 'Morsing',           primaryColor: '#065F46', textColor: '#FFFFFF' },
  { name: 'Tavil',             primaryColor: '#1D4ED8', textColor: '#FFFFFF' },
];

async function main() {
  console.log('Seeding specialities…');

  for (const speciality of specialities) {
    await prisma.speciality.upsert({
      where: { name: speciality.name },
      update: {
        primaryColor: speciality.primaryColor,
        textColor: speciality.textColor,
      },
      create: speciality,
    });
    console.log(`  ✓ ${speciality.name}`);
  }

  console.log(`Done - ${specialities.length} specialities seeded.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
