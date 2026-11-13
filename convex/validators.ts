import { v } from "convex/values";
import { CATEGORY_KEYS } from "./lib/categories";

const literals = <T extends string>(values: readonly T[]) =>
  values.map((value) => v.literal(value)) as unknown as [
    ReturnType<typeof v.literal<T>>,
    ReturnType<typeof v.literal<T>>,
    ...ReturnType<typeof v.literal<T>>[],
  ];

export const categoryValidator = v.union(...literals(CATEGORY_KEYS));

export const occurrenceStatusValidator = v.union(
  v.literal("open"),
  v.literal("verifying"),
  v.literal("resolved"),
);

export const sourceValidator = v.union(
  v.literal("whatsapp"),
  v.literal("simulator"),
  v.literal("seed"),
);
