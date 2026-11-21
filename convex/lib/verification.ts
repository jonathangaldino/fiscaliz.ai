/**
 * V2 verification rules, pure so they are easy to test. Requirements in #1:
 * YES ≥ 30% of the appeal resolves; NO > YES, or 48 h without reaching 30%,
 * reopens; a reopened occurrence can only be verified again after 7 days.
 */

export const VERIFICATION_TIMEOUT_MS = 48 * 60 * 60 * 1000;
export const REVERIFY_LOCK_MS = 7 * 24 * 60 * 60 * 1000;

export type VerificationAnswer = "yes" | "no";

/** Button id / Telegram callback_data: `verify:<occurrenceId>:yes|no`. */
export function verifyButtonId(occurrenceId: string, answer: VerificationAnswer) {
  return `verify:${occurrenceId}:${answer}`;
}

export function parseVerifyButton(
  id: string | undefined,
): { occurrenceId: string; answer: VerificationAnswer } | null {
  const match = /^verify:([A-Za-z0-9]+):(yes|no)$/.exec(id ?? "");
  return match
    ? { occurrenceId: match[1], answer: match[2] as VerificationAnswer }
    : null;
}

/** What the votes so far decide, or null to keep waiting. */
export function verificationOutcome(
  votes: { yes: number; no: number },
  appeal: number,
): "resolved" | "open" | null {
  if (votes.no > votes.yes) return "open";
  // Integer math for "yes / appeal ≥ 30%".
  if (votes.yes > 0 && votes.yes * 10 >= appeal * 3) return "resolved";
  return null;
}

/** When a new verification may start, given the last failed one. */
export function verificationAvailableAt(reopenedAt: number | undefined): number {
  return (reopenedAt ?? 0) + REVERIFY_LOCK_MS;
}
