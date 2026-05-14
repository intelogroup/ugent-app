/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as achievements from "../achievements.js";
import type * as ai from "../ai.js";
import type * as analytics from "../analytics.js";
import type * as backfill from "../backfill.js";
import type * as backfill_actions from "../backfill_actions.js";
import type * as ingest from "../ingest.js";
import type * as interactions from "../interactions.js";
import type * as leaderboard from "../leaderboard.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as patterns from "../patterns.js";
import type * as questions from "../questions.js";
import type * as research from "../research.js";
import type * as strategy from "../strategy.js";
import type * as tests from "../tests.js";
import type * as threads from "../threads.js";
import type * as users from "../users.js";
import type * as verify from "../verify.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  achievements: typeof achievements;
  ai: typeof ai;
  analytics: typeof analytics;
  backfill: typeof backfill;
  backfill_actions: typeof backfill_actions;
  ingest: typeof ingest;
  interactions: typeof interactions;
  leaderboard: typeof leaderboard;
  notes: typeof notes;
  notifications: typeof notifications;
  patterns: typeof patterns;
  questions: typeof questions;
  research: typeof research;
  strategy: typeof strategy;
  tests: typeof tests;
  threads: typeof threads;
  users: typeof users;
  verify: typeof verify;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
