import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire idle conversations",
  { minutes: 10 },
  internal.bot.conversations.expire,
  {},
);

crons.interval("pickup questions and expiry", { hours: 1 }, internal.pickups.sweep, {});

export default crons;
