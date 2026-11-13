import { describe, expect, it } from "vitest";
import type { Doc, Id } from "../_generated/dataModel";
import { dedupRadius, nearest } from "./dedup";

const base = { lat: -23.5512, lng: -51.4625 };

const occurrence = (id: string, dLat: number): Doc<"occurrences"> => ({
  _id: id as Id<"occurrences">,
  _creationTime: 0,
  category: "pavement",
  status: "open",
  lat: base.lat + dLat,
  lng: base.lng,
  address: `Rua ${id}`,
  summary: `Buraco ${id}`,
  appeal: 1,
  openedAt: 0,
  source: "seed",
});

describe("nearest", () => {
  // 0.00009 deg of latitude ≈ 10 m
  const list = [
    occurrence("far", 0.0018), // ~200 m
    occurrence("near", 0.00027), // ~30 m
    occurrence("mid", 0.0009), // ~100 m
  ];

  it("keeps occurrences within 50 m for a precise location", () => {
    expect(nearest(list, base, dedupRadius(true)).map((c) => c.id)).toEqual(["near"]);
  });

  it("widens to 150 m when only the street is known, nearest first", () => {
    expect(nearest(list, base, dedupRadius(false)).map((c) => c.id)).toEqual([
      "near",
      "mid",
    ]);
  });

  it("returns at most 5 candidates", () => {
    const many = Array.from({ length: 8 }, (_, i) => occurrence(`o${i}`, 0.00001 * i));
    expect(nearest(many, base, 50)).toHaveLength(5);
  });
});
