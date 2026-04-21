import { describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { findArtistIdOwningSlug, isArtistSlugUniqueConstraintError } from "@/lib/artist-slug-uniqueness";

describe("isArtistSlugUniqueConstraintError", () => {
  it("returns true for P2002 on slug", () => {
    const e = new Prisma.PrismaClientKnownRequestError("Unique", {
      code: "P2002",
      clientVersion: "test",
      meta: { modelName: "Artist", target: ["slug"] },
    });
    expect(isArtistSlugUniqueConstraintError(e)).toBe(true);
  });

  it("returns true when target is a single string slug", () => {
    const e = new Prisma.PrismaClientKnownRequestError("Unique", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: "slug" },
    });
    expect(isArtistSlugUniqueConstraintError(e)).toBe(true);
  });

  it("returns false for P2002 on another column", () => {
    const e = new Prisma.PrismaClientKnownRequestError("Unique", {
      code: "P2002",
      clientVersion: "test",
      meta: { target: ["emailLookupHash"] },
    });
    expect(isArtistSlugUniqueConstraintError(e)).toBe(false);
  });

  it("returns false for unrelated errors", () => {
    expect(isArtistSlugUniqueConstraintError(new Error("nope"))).toBe(false);
  });
});

describe("findArtistIdOwningSlug", () => {
  it("returns null when slug is unused", async () => {
    const db = {
      artist: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
    await expect(findArtistIdOwningSlug(db, "free-slug")).resolves.toBeNull();
    expect(db.artist.findUnique).toHaveBeenCalledWith({
      where: { slug: "free-slug" },
      select: { id: true },
    });
  });

  it("returns owner id when slug exists", async () => {
    const db = {
      artist: {
        findUnique: vi.fn().mockResolvedValue({ id: "artist-1" }),
      },
    };
    await expect(findArtistIdOwningSlug(db, "taken")).resolves.toBe("artist-1");
  });
});
