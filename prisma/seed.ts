/**
 * Seeds PostgreSQL from lib/dummy-artists (demo data). Run: npx prisma db seed
 * Uses standard PrismaClient (DATABASE_URL in .env / .env.local).
 */
import { PrismaClient } from "@prisma/client";
import { buildEncryptedArtistPiiPayload } from "../lib/artist-pii";
import { DEMO_ARTIST_IDS, DUMMY_ARTISTS } from "../lib/dummy-artists";
import { getLocalCalendarDateForDb } from "../lib/local-day";
import { logSafeError } from "../lib/safe-log";

const prisma = new PrismaClient();

function parseReviewDate(s: string): Date {
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  return new Date();
}

const PLACEHOLDER_IMG = (name: string) =>
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
  {
    slug: "margazhi-concert-prep",
    name: "Margazhi Concert Prep",
    ownerId: DEMO_ARTIST_IDS.lakshmiNarayanan,
    status: "active",
    closedAt: null,
  },
  {
    slug: "thyagaraja-aradhana-2025",
    name: "Thyagaraja Aradhana 2025",
    ownerId: DEMO_ARTIST_IDS.raviKrishnamurthy,
    status: "active",
    closedAt: null,
  },
  {
    slug: "rotterdam-kutcheri",
    name: "Rotterdam Kutcheri",
    ownerId: DEMO_ARTIST_IDS.anandSubramanian,
    status: "completed",
    closedAt: new Date("2024-12-15T20:00:00Z"),
  },
  {
    slug: "amsterdam-rasikas-evening",
    name: "Amsterdam Rasikas Evening",
    ownerId: DEMO_ARTIST_IDS.priyaBalakrishnan,
    status: "active",
    closedAt: null,
  },
  {
    slug: "veena-flute-jugalbandi",
    name: "Veena & Flute Jugalbandi",
    ownerId: DEMO_ARTIST_IDS.meeraVenkatesh,
    status: "completed",
    closedAt: new Date("2025-01-20T18:00:00Z"),
  },
  {
    slug: "percussion-ensemble-nl",
    name: "Percussion Ensemble NL",
    ownerId: DEMO_ARTIST_IDS.karthikSeshadri,
    status: "active",
    closedAt: null,
  },
  {
    slug: "youth-music-workshop",
    name: "Youth Music Workshop",
    ownerId: DEMO_ARTIST_IDS.nithyaSubramanian,
    status: "active",
    closedAt: null,
  },
  {
    slug: "navarathri-golu-concert",
    name: "Navarathri Golu Concert",
    ownerId: DEMO_ARTIST_IDS.kavithaMuralidharan,
    status: "incomplete",
    closedAt: null,
  },
];

const JOINED_ISO: Record<string, string> = {
  [DEMO_ARTIST_IDS.lakshmiNarayanan]: "2024-09-01T12:00:00.000Z",
  [DEMO_ARTIST_IDS.raviKrishnamurthy]: "2024-09-15T12:00:00.000Z",
  [DEMO_ARTIST_IDS.anandSubramanian]: "2024-10-01T12:00:00.000Z",
  [DEMO_ARTIST_IDS.meeraVenkatesh]: "2024-10-10T12:00:00.000Z",
  [DEMO_ARTIST_IDS.sureshIyer]: "2024-11-01T12:00:00.000Z",
  [DEMO_ARTIST_IDS.priyaBalakrishnan]: "2024-11-15T12:00:00.000Z",
  [DEMO_ARTIST_IDS.karthikSeshadri]: "2024-12-01T12:00:00.000Z",
  [DEMO_ARTIST_IDS.divyaRamachandran]: "2024-12-10T12:00:00.000Z",
  [DEMO_ARTIST_IDS.srinivasParthasarathy]: "2025-01-05T12:00:00.000Z",
  [DEMO_ARTIST_IDS.kavithaMuralidharan]: "2025-01-20T12:00:00.000Z",
  [DEMO_ARTIST_IDS.vijayAnantharaman]: "2025-02-01T12:00:00.000Z",
  [DEMO_ARTIST_IDS.nithyaSubramanian]: "2025-02-15T12:00:00.000Z",
};

const MESSAGES: { collabSlug: string; senderName: string; content: string; sentAt: Date }[] = [
  {
    collabSlug: "margazhi-concert-prep",
    senderName: "Lakshmi Narayanan",
    content: "Let us plan the setlist for Margazhi. I am thinking we open with Kalyani.",
    sentAt: new Date("2025-01-10T10:00:00Z"),
  },
  {
    collabSlug: "margazhi-concert-prep",
    senderName: "Ravi Krishnamurthy",
    content: "Sounds great! I can prepare the violin accompaniment for the first 3 pieces.",
    sentAt: new Date("2025-01-10T10:15:00Z"),
  },
  {
    collabSlug: "margazhi-concert-prep",
    senderName: "Anand Subramanian",
    content: "I will handle the mridangam. Should we do a tani avartanam in the middle?",
    sentAt: new Date("2025-01-10T10:30:00Z"),
  },
  {
    collabSlug: "margazhi-concert-prep",
    senderName: "Lakshmi Narayanan",
    content: "Yes! Let us keep it to 10 minutes. Rehearsal on Saturday at 3pm?",
    sentAt: new Date("2025-01-11T09:00:00Z"),
  },
  {
    collabSlug: "margazhi-concert-prep",
    senderName: "Meera Venkatesh",
    content: "Saturday works for me. Shall I bring the tambura?",
    sentAt: new Date("2025-01-11T09:45:00Z"),
  },
  {
    collabSlug: "thyagaraja-aradhana-2025",
    senderName: "Ravi Krishnamurthy",
    content: "Welcome everyone to the Thyagaraja Aradhana planning group!",
    sentAt: new Date("2025-01-20T14:00:00Z"),
  },
  {
    collabSlug: "thyagaraja-aradhana-2025",
    senderName: "Priya Balakrishnan",
    content: "Excited to be part of this. Which pancharatna kritis are we doing?",
    sentAt: new Date("2025-01-20T14:30:00Z"),
  },
  {
    collabSlug: "thyagaraja-aradhana-2025",
    senderName: "Nithya Subramanian",
    content: "I suggest we do all five. It is a tradition after all.",
    sentAt: new Date("2025-01-20T15:00:00Z"),
  },
  {
    collabSlug: "thyagaraja-aradhana-2025",
    senderName: "Suresh Iyer",
    content: "Agreed. I will prepare the flute parts for Jagadananda Karaka.",
    sentAt: new Date("2025-01-21T10:00:00Z"),
  },
  {
    collabSlug: "rotterdam-kutcheri",
    senderName: "Anand Subramanian",
    content: "Great concert everyone! The audience loved the Bhairavi piece.",
    sentAt: new Date("2024-11-05T22:00:00Z"),
  },
  {
    collabSlug: "rotterdam-kutcheri",
    senderName: "Lakshmi Narayanan",
    content: "Thank you all. It was a wonderful evening. Shall we do this again?",
    sentAt: new Date("2024-11-05T22:15:00Z"),
  },
  {
    collabSlug: "rotterdam-kutcheri",
    senderName: "Meera Venkatesh",
    content: "Absolutely! Let us plan for spring.",
    sentAt: new Date("2024-11-06T09:00:00Z"),
  },
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
    { name: "Violin (South Indian)", primaryColor: "#A16207", textColor: "#FFFFFF" },
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
    const pii = buildEncryptedArtistPiiPayload(a.id, a.email, a.contactNumber);
    await prisma.artist.create({
      data: {
        id: a.id,
        slug: a.slug,
        fullName: a.name,
        email: pii.emailPlaceholder,
        contactNumber: null,
        emailCipher: pii.emailCipher,
        emailLookupHash: pii.emailLookupHash,
        contactCipher: pii.contactCipher,
        emailVisibility: "PUBLIC_PROFILE",
        contactVisibility: "PUBLIC_PROFILE",
        contactType: a.contactType === "whatsapp" ? "whatsapp" : "mobile",
        profilePhotoUrl: PLACEHOLDER_IMG(a.name),
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
      {
        featureDate: todayLocal,
        featureType: "singer",
        artistId: DEMO_ARTIST_IDS.lakshmiNarayanan,
      },
      {
        featureDate: todayLocal,
        featureType: "instrumentalist",
        artistId: DEMO_ARTIST_IDS.anandSubramanian,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: [
      {
        artistId: DEMO_ARTIST_IDS.lakshmiNarayanan,
        type: "collab_invite",
        payload: {
          text: "Ravi Krishnamurthy added you to Thyagaraja Aradhana 2025",
          href: "/collabs/thyagaraja-aradhana-2025",
        },
        isRead: false,
      },
      {
        artistId: DEMO_ARTIST_IDS.lakshmiNarayanan,
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
    logSafeError("[prisma/seed]", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
