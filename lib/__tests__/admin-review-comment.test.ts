import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  parseAmendRegistrationReviewComment,
  parseRegistrationApprovalPayload,
  parseRegistrationSpecialitiesPayload,
} from "../admin-review-comment";

describe("parseAmendRegistrationReviewComment", () => {
  it("treats whitespace-only form comment as null", async () => {
    const form = new FormData();
    form.set("comment", "   ");
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: form,
    });
    const r = await parseAmendRegistrationReviewComment(req);
    expect(r).toEqual({ ok: true, comment: null });
  });

  it("trims non-empty form comment", async () => {
    const form = new FormData();
    form.set("comment", "  reason  ");
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: form,
    });
    const r = await parseAmendRegistrationReviewComment(req);
    expect(r).toEqual({ ok: true, comment: "reason" });
  });

  it("parses JSON comment", async () => {
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ comment: "ok" }),
    });
    const r = await parseAmendRegistrationReviewComment(req);
    expect(r).toEqual({ ok: true, comment: "ok" });
  });
});

describe("parseRegistrationApprovalPayload", () => {
  it("parses editable speciality form fields without consuming the request twice", async () => {
    const form = new FormData();
    form.set("comment", "  Looks good  ");
    form.set("specialities_present", "1");
    form.append("specialities", " Vocal ");
    form.append("specialities", "Mridangam");

    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: form,
    });

    const r = await parseRegistrationApprovalPayload(req);
    expect(r).toEqual({
      ok: true,
      comment: "Looks good",
      specialities: ["Vocal", "Mridangam"],
    });
  });

  it("allows older approval clients to omit specialities", async () => {
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ comment: "" }),
    });

    const r = await parseRegistrationApprovalPayload(req);
    expect(r).toEqual({ ok: true, comment: "Approved" });
  });

  it("rejects empty editable speciality lists", async () => {
    const form = new FormData();
    form.set("specialities_present", "1");

    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: form,
    });

    const r = await parseRegistrationApprovalPayload(req);
    expect(r).toEqual({ ok: false, error: "INVALID_SPECIALITIES", status: 400 });
  });
});

describe("parseRegistrationSpecialitiesPayload", () => {
  it("parses and normalises saved speciality form fields", async () => {
    const form = new FormData();
    form.append("specialities", "  Vocal  ");
    form.append("specialities", "Vocal");
    form.append("specialities", "Kanjira");

    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: form,
    });

    const r = await parseRegistrationSpecialitiesPayload(req);
    expect(r).toEqual({ ok: true, specialities: ["Vocal", "Kanjira"] });
  });

  it("rejects missing saved speciality fields", async () => {
    const req = new NextRequest("http://localhost/test", {
      method: "POST",
      body: new FormData(),
    });

    const r = await parseRegistrationSpecialitiesPayload(req);
    expect(r).toEqual({ ok: false, error: "INVALID_SPECIALITIES", status: 400 });
  });
});
