import { describe, expect, it, vi } from "vitest";
import {
  isSoundEnabled,
  playSound,
  setSoundEnabled,
  subscribeSound,
} from "./sound";

describe("sound", () => {
  it("is on by default and can be muted", () => {
    expect(isSoundEnabled()).toBe(true);
    setSoundEnabled(false);
    expect(isSoundEnabled()).toBe(false);
    setSoundEnabled(true);
    expect(isSoundEnabled()).toBe(true);
  });

  it("notifies subscribers when toggled", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSound(listener);
    setSoundEnabled(false);
    unsubscribe();
    setSoundEnabled(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("never throws without Web Audio", () => {
    expect(() => playSound("tap")).not.toThrow();
  });
});
