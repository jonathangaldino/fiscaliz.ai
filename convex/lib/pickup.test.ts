import { describe, expect, it } from "vitest";
import {
  brasiliaYear,
  findPickupPoint,
  formatProtocol,
  mergeItems,
  PICKUP_ASK_AFTER_MS,
  PICKUP_EXPIRE_AFTER_MS,
  pickupAddressKey,
  pickupDue,
} from "./pickup";

// Rua Galdino Gluck Junior, CNEFE points.
const n60 = { lat: -23.54891, lng: -51.456435 };
const n90 = { lat: -23.549119, lng: -51.456489 };
const n100 = { lat: -23.549134, lng: -51.456465 };

describe("pickupAddressKey", () => {
  it("keeps street and number, drops the neighbourhood and accents", () => {
    expect(pickupAddressKey("Rua Galdino Glück Junior, 60 - Centro")).toBe(
      "rua galdino gluck junior 60",
    );
  });

  it("is undefined without a number", () => {
    expect(pickupAddressKey("Rua Galdino Gluck Junior")).toBeUndefined();
    expect(pickupAddressKey("Rua 13 de Maio - Centro")).toBeUndefined();
  });
});

describe("findPickupPoint", () => {
  const waiting = [
    { _id: "p60", ...n60, addressKey: "rua galdino gluck junior 60" },
    { _id: "p100", ...n100, addressKey: "rua galdino gluck junior 100" },
  ];

  it("joins the same street and number, whatever the apartment", () => {
    const key = pickupAddressKey("Rua Galdino Gluck Junior, 60");
    expect(findPickupPoint(waiting, { ...n60, addressKey: key })?._id).toBe("p60");
  });

  it("opens a new point for a neighbouring number, even a few meters away", () => {
    const key = pickupAddressKey("Rua Galdino Gluck Junior, 90");
    expect(findPickupPoint(waiting, { ...n90, addressKey: key })).toBeUndefined();
  });

  it("groups a pin without a number by a 50 m radius, nearest first", () => {
    expect(findPickupPoint(waiting, n90)?._id).toBe("p100");
    expect(findPickupPoint(waiting, { lat: -23.56, lng: -51.46 })).toBeUndefined();
  });
});

describe("pickupDue", () => {
  const openedAt = 1_000_000;

  it("waits, asks after 3 days once, expires after 15", () => {
    expect(pickupDue({ openedAt }, openedAt + PICKUP_ASK_AFTER_MS - 1)).toBeNull();
    expect(pickupDue({ openedAt }, openedAt + PICKUP_ASK_AFTER_MS)).toBe("ask");
    expect(
      pickupDue({ openedAt, askedAt: openedAt + PICKUP_ASK_AFTER_MS }, openedAt + PICKUP_ASK_AFTER_MS + 1),
    ).toBeNull();
    expect(pickupDue({ openedAt, askedAt: 1 }, openedAt + PICKUP_EXPIRE_AFTER_MS)).toBe("expire");
  });
});

describe("protocol", () => {
  it("pads the sequence and uses the Brasília year", () => {
    expect(formatProtocol(42, 2026)).toBe("00042/2026");
    // 01:00 UTC on Jan 1st is still Dec 31st in Brasília.
    expect(brasiliaYear(Date.UTC(2027, 0, 1, 1))).toBe(2026);
    expect(brasiliaYear(Date.UTC(2027, 0, 1, 4))).toBe(2027);
  });
});

describe("mergeItems", () => {
  it("unions in canonical order", () => {
    expect(mergeItems(["sofa"], ["furniture", "sofa"])).toEqual(["furniture", "sofa"]);
  });
});
