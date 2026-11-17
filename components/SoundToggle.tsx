"use client";

import { useSyncExternalStore } from "react";
import {
  isSoundEnabled,
  playSound,
  setSoundEnabled,
  subscribeSound,
} from "@/lib/sound";
import { Glyph } from "./ui/Glyph";

export function SoundToggle() {
  const enabled = useSyncExternalStore(
    subscribeSound,
    isSoundEnabled,
    () => true,
  );
  return (
    <button
      type="button"
      onClick={() => {
        setSoundEnabled(!enabled);
        if (!enabled) playSound("toggleOn");
      }}
      aria-pressed={enabled}
      aria-label="Sons da interface"
      title={enabled ? "Desligar sons" : "Ligar sons"}
      className="lit flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-[background-color,color,transform] duration-(--dur) hover:bg-accent-tint hover:text-fg active:scale-90"
    >
      <Glyph name={enabled ? "sound" : "mute"} size={18} />
    </button>
  );
}
