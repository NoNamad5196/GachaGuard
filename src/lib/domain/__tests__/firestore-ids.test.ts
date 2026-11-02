import { describe, expect, it } from "vitest";
import { budgetSchema, customBannerSchema, firestoreIdSchema } from "../schemas";

describe("Firestore input boundaries", () => {
  it("accepts canonical shared game and tracking IDs", () => {
    expect(firestoreIdSchema.parse("genshin-impact")).toBe("genshin-impact");
    expect(firestoreIdSchema.parse("private-banner-123")).toBe("private-banner-123");
  });
  it.each(["", ".", "..", "users/other", "__reserved__", "가".repeat(501)])("rejects unsafe path or oversized UTF-8 ID %s", (id) => {
    expect(firestoreIdSchema.safeParse(id).success).toBe(false);
  });
  it("rejects invalid budget months", () => {
    expect(budgetSchema.safeParse({ yearMonth: "2026-13", totalBudget: 1000 }).success).toBe(false);
  });
  it("rejects calendar-invalid custom banner dates", () => {
    expect(customBannerSchema.safeParse({ gameId: "genshin-impact", name: "Banner", featured: "Character",
      startsAtDate: "2026-02-30", endsAtDate: "2026-03-01" }).success).toBe(false);
  });
});
