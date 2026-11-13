import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "expire idle conversations",
  { minutes: 10 },
  internal.bot.conversations.expire,
  {},
);

export default crons;
