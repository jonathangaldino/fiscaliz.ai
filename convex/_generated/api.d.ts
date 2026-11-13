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
import type * as bot_channels_index from "../bot/channels/index.js";
import type * as bot_channels_simulator from "../bot/channels/simulator.js";
import type * as bot_conversations from "../bot/conversations.js";
import type * as bot_extract from "../bot/extract.js";
import type * as bot_handleIncoming from "../bot/handleIncoming.js";
import type * as bot_messages from "../bot/messages.js";
import type * as bot_register from "../bot/register.js";
import type * as bot_stateMachine from "../bot/stateMachine.js";
import type * as bot_types from "../bot/types.js";
import type * as crons from "../crons.js";
import type * as lib_categories from "../lib/categories.js";
import type * as lib_citizenHash from "../lib/citizenHash.js";
import type * as lib_geo from "../lib/geo.js";
import type * as lib_time from "../lib/time.js";
import type * as occurrences from "../occurrences.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as simulator from "../simulator.js";
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
  "bot/channels/index": typeof bot_channels_index;
  "bot/channels/simulator": typeof bot_channels_simulator;
  "bot/conversations": typeof bot_conversations;
  "bot/extract": typeof bot_extract;
  "bot/handleIncoming": typeof bot_handleIncoming;
  "bot/messages": typeof bot_messages;
  "bot/register": typeof bot_register;
  "bot/stateMachine": typeof bot_stateMachine;
  "bot/types": typeof bot_types;
  crons: typeof crons;
  "lib/categories": typeof lib_categories;
  "lib/citizenHash": typeof lib_citizenHash;
  "lib/geo": typeof lib_geo;
  "lib/time": typeof lib_time;
  occurrences: typeof occurrences;
  seed: typeof seed;
  seedData: typeof seedData;
  simulator: typeof simulator;
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
