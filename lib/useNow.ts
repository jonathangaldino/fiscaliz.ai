"use client";

import { useState } from "react";

/** The time the component mounted. Kept in state so render stays pure. */
export function useNow(): number {
  const [now] = useState(() => Date.now());
  return now;
}
