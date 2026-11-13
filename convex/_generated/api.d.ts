/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as agencies from "../agencies.js";
import type * as lib_categories from "../lib/categories.js";
import type * as lib_geo from "../lib/geo.js";
import type * as occurrences from "../occurrences.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as validators from "../validators.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  agencies: typeof agencies;
  "lib/categories": typeof lib_categories;
  "lib/geo": typeof lib_geo;
  occurrences: typeof occurrences;
  seed: typeof seed;
  seedData: typeof seedData;
  validators: typeof validators;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
