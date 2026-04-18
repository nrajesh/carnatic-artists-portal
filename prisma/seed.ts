/**
 * Seeds PostgreSQL from lib/dummy-artists (demo data). Run: npx prisma db seed
 * Uses standard PrismaClient (DATABASE_URL in .env / .env.local).
 */
import { PrismaClient } from "@prisma/client";
import { DUMMY_ARTISTS } from "../lib/dummy-artists";
import { getLocalCalendarDateForDb } from "../lib/local-day";

const prisma = new PrismaClient();

function parseReviewDate(s: string): Date {
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  return new Date();
}

const PLACEHOLDER_IMG = (name: string, slug: string) =>
  `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundType=gradientLinear`;

function mapLinkType(label: string): string {
  const m: Record<string, string> = {
    YouTube: "youtube",
    Instagram: "instagram",
    Facebook: "facebook",
    LinkedIn: "linkedin",
    Twitter: "twitter",
    Website: "website",
  };
  return m[label] ?? label.toLowerCase().replace(/\s+/g, "_");
}

/** Collab primary key = URL slug (matches /collabs/[id]) */
const COLLABS: {
  slug: string;
  name: string;
  ownerId: string;
  status: string;
  closedAt: Date | null;
}[] = [
  { slug: "margazhi-concert-prep", name: "Margazhi Concert Prep", ownerId: "1", status: "active", closedAt: null },
  { slug: "thyagaraja-aradhana-2025", name: "Thyagaraja Aradhana 2025", ownerId: "2", status: "active", closedAt: null },
  { slug: "rotterdam-kutcheri", name: "Rotterdam Kutcheri", ownerId: "3", status: "completed", closedAt: new Date("2024-12-15T20:00:00Z") },
  { slug: "amsterdam-rasikas-evening", name: "Amsterdam Rasikas Evening", ownerId: "6", status: "active", closedAt: null },
  { slug: "veena-flute-jugalbandi", name: "Veena & Flute Jugalbandi", ownerId: "4", status: "completed", closedAt: new Date("2025-01-20T18:00:00Z") },
  { slug: "percussion-ensemble-nl", name: "Percussion Ensemble NL", ownerId: "7", status: "active", closedAt: null },
  { slug: "carnatic-youth-workshop", name: "Carnatic Youth Workshop", ownerId: "12", status: "active", closedAt: null },
  { slug: "navarathri-golu-concert", name: "Navarathri Golu Concert", ownerId: "10", status: "incomplete", closedAt: null },
];

const JOINED_ISO: Record<string, string> = {
  "1": "2024-09-01T12:00:00.000Z",
  "2": "2024-09-15T12:00:00.000Z",
  "3": "2024-10-01T12:00:00.000Z",
  "4": "2024-10-10T12:00:00.000Z",
  "5": "2024-11-01T12:00:00.000Z",
  "6": "2024-11-15T12:00:00.000Z",
  "7": "2024-12-01T12:00:00.000Z",
  "8": "2024-12-10T12:00:00.000Z",
  "9": "2025-01-05T12:00:00.000Z",
  "10": "2025-01-20T12:00:00.000Z",
  "11": "2025-02-01T12:00:00.000Z",
  "12": "2025-02-15T12:00:00.000Z",
};

const MESSAGES: { collabSlug: string; senderName: string; content: string; sentAt: Date }[] = [
  { collabSlug: "margazhi-concert-prep", senderName: "Lakshmi Narayanan", content: "Let us plan the setlist for Margazhi. I am thinking we open with Kalyani.", sentAt: new Date("2025-01-10T10:00:00Z") },
  { collabSlug: "margazhi-concert-prep", senderName: "Ravi Krishnamurthy", content: "Sounds great! I can prepare the violin accompaniment for the first 3 pieces.", sentAt: new Date("2025-01-10T10:15:00Z") },
  { collabSlug: "margazhi-concert-prep", senderName: "Anand Subramanian", content: "I will handle the mridangam. Should we do a tani avartanam in the middle?", sentAt: new Date("2025-01-10T10:30:00Z") },
  { collabSlug: "margazhi-concert-prep", senderName: "Lakshmi Narayanan", content: "Yes! Let us keep it to 10 minutes. Rehearsal on Saturday at 3pm?", sentAt: new Date("2025-01-11T09:00:00Z") },
  { collabSlug: "margazhi-concert-prep", senderName: "Meera Venkatesh", content: "Saturday works for me. Shall I bring the tambura?", sentAt: new Date("2025-01-11T09:45:00Z") },
  { collabSlug: "thyagaraja-aradhana-2025", senderName: "Ravi Krishnamurthy", content: "Welcome everyone to the Thyagaraja Aradhana planning group!", sentAt: new Date("2025-01-20T14:00:00Z") },
  { collabSlug: "thyagaraja-aradhana-2025", senderName: "Priya Balakrishnan", content: "Excited to be part of this. Which pancharatna kritis are we doing?", sentAt: new Date("2025-01-20T14:30:00Z") },
  { collabSlug: "thyagaraja-aradhana-2025", senderName: "Nithya Subramanian", content: "I suggest we do all five. It is a tradition after all.", sentAt: new Date("2025-01-20T15:00:00Z") },
  { collabSlug: "thyagaraja-aradhana-2025", senderName: "Suresh Iyer", content: "Agreed. I will prepare the flute parts for Jagadananda Karaka.", sentAt: new Date("2025-01-21T10:00:00Z") },
  { collabSlug: "rotterdam-kutcheri", senderName: "Anand Subramanian", content: "Great concert everyone! The audience loved the Bhairavi piece.", sentAt: new Date("2024-11-05T22:00:00Z") },
  { collabSlug: "rotterdam-kutcheri", senderName: "Lakshmi Narayanan", content: "Thank you all. It was a wonderful evening. Shall we do this again?", sentAt: new Date("2024-11-05T22:15:00Z") },
  { collabSlug: "rotterdam-kutcheri", senderName: "Meera Venkatesh", content: "Absolutely! Let us plan for spring.", sentAt: new Date("2024-11-06T09:00:00Z") },
];

async function main() {
  console.log("Clearing demo tables…");
  await prisma.$transaction([
    prisma.feedback.deleteMany(),
    prisma.collabMessage.deleteMany(),
    prisma.collabMember.deleteMany(),
    prisma.collab.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.dailyFeatured.deleteMany(),
    prisma.magicLinkToken.deleteMany(),
    prisma.session.deleteMany(),
    prisma.availabilityEntry.deleteMany(),
    prisma.externalLink.deleteMany(),
    prisma.artistSpeciality.deleteMany(),
    prisma.artist.deleteMany(),
  ]);

  const specialities = [
    { name: "Vocal", primaryColor: "#7C3AED", textColor: "#FFFFFF" },
    { name: "Violin", primaryColor: "#B45309", textColor: "#FFFFFF" },
    { name: "Mridangam", primaryColor: "#B91C1C", textColor: "#FFFFFF" },
    { name: "Veena", primaryColor: "#047857", textColor: "#FFFFFF" },
    { name: "Flute", primaryColor: "#0369A1", textColor: "#FFFFFF" },
    { name: "Ghatam", primaryColor: "#92400E", textColor: "#FFFFFF" },
    { name: "Kanjira", primaryColor: "#BE185D", textColor: "#FFFFFF" },
    { name: "Thavil", primaryColor: "#7E22CE", textColor: "#FFFFFF" },
    { name: "Nadaswaram", primaryColor: "#C2410C", textColor: "#FFFFFF" },
    { name: "Violin (Carnatic)", primaryColor: "#A16207", textColor: "#FFFFFF" },
    { name: "Morsing", primaryColor: "#065F46", textColor: "#FFFFFF" },
    { name: "Tavil", primaryColor: "#1D4ED8", textColor: "#FFFFFF" },
  ];
  for (const s of specialities) {
    await prisma.speciality.upsert({
      where: { name: s.name },
      update: { primaryColor: s.primaryColor, textColor: s.textColor },
      create: s,
    });
  }
  console.log("Seeding artists…");
  for (const a of DUMMY_ARTISTS) {
    const joined = new Date(JOINED_ISO[a.id] ?? "2024-09-01T12:00:00.000Z");
    await prisma.artist.create({
      data: {
        id: a.id,
        slug: a.slug,
        fullName: a.name,
        email: a.email,
        contactNumber: a.contactNumber,
        contactType: a.contactType === "whatsapp" ? "whatsapp" : "mobile",
        profilePhotoUrl: PLACEHOLDER_IMG(a.name, a.slug),
        backgroundImageUrl: null,
        bioRichText: a.bio,
        province: a.province,
        openToCollab: a.availableForCollab,
        isSuspended: a.status === "suspended",
        createdAt: joined,
        specialities: {
          create: a.specialities.map((sp, i) => ({
            displayOrder: i,
            speciality: { connect: { name: sp.name } },
          })),
        },
        externalLinks: {
          create: a.links.map((l) => ({
            linkType: mapLinkType(l.type),
            url: l.url,
          })),
        },
        availabilityEntries: {
          create: a.availabilityDates.map((r) => ({
            startDate: new Date(r.from + "T12:00:00.000Z"),
            endDate: new Date(r.to + "T12:00:00.000Z"),
          })),
        },
      },
    });
  }

  const nameToId = Object.fromEntries(DUMMY_ARTISTS.map((x) => [x.name, x.id]));

  console.log("Seeding collabs…");
  for (const c of COLLABS) {
    await prisma.collab.create({
      data: {
        id: c.slug,
        name: c.name,
        ownerId: c.ownerId,
        status: c.status,
        closedAt: c.closedAt,
      },
    });
  }

  console.log("Seeding collab members…");
  for (const a of DUMMY_ARTISTS) {
    for (const mc of a.collabs) {
      const collabId = mc.slug;
      await prisma.collabMember.upsert({
        where: {
          collabId_artistId: { collabId, artistId: a.id },
        },
        create: {
          collabId,
          artistId: a.id,
          joinedAt: new Date(),
        },
        update: {},
      });
    }
  }

  console.log("Seeding feedback…");
  const collabNameToId = Object.fromEntries(COLLABS.map((c) => [c.name, c.slug]));
  for (const a of DUMMY_ARTISTS) {
    for (const r of a.reviews) {
      const reviewerId = DUMMY_ARTISTS.find((x) => x.slug === r.reviewerSlug)?.id;
      const collabId = collabNameToId[r.collab];
      if (!reviewerId || !collabId) continue;
      await prisma.feedback.create({
        data: {
          id: r.id,
          collabId,
          reviewerId,
          revieweeId: a.id,
          starRating: r.rating,
          comment: r.comment,
          submittedAt: parseReviewDate(r.date),
        },
      });
    }
  }

  console.log("Seeding collab messages…");
  for (const m of MESSAGES) {
    const senderId = nameToId[m.senderName];
    if (!senderId) continue;
    await prisma.collabMessage.create({
      data: {
        collabId: m.collabSlug,
        senderId,
        content: m.content,
        sentAt: m.sentAt,
      },
    });
  }

  const todayLocal = getLocalCalendarDateForDb(new Date());
  await prisma.dailyFeatured.createMany({
    data: [
      { featureDate: todayLocal, featureType: "singer", artistId: "1" },
      { featureDate: todayLocal, featureType: "instrumentalist", artistId: "3" },
    ],
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: [
      {
        artistId: "1",
        type: "collab_invite",
        payload: { text: "Ravi Krishnamurthy added you to Thyagaraja Aradhana 2025", href: "/collabs/thyagaraja-aradhana-2025" },
        isRead: false,
      },
      {
        artistId: "1",
        type: "feedback_received",
        payload: { text: "New review on your profile" },
        isRead: true,
      },
    ],
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
