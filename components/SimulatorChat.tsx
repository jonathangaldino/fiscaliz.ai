"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { playSound } from "@/lib/sound";
import { Button } from "./ui/Button";
import { Glyph } from "./ui/Glyph";
import { IconButton } from "./ui/IconButton";

const OccurrenceMap = dynamic(() => import("./OccurrenceMap"), { ssr: false });

const STORAGE_KEY = "fiscaliza.simulatorSession";
// Same limits the server enforces (convex/simulator.ts); checked here only for a quick message.
const PHOTO_TYPES = "image/jpeg,image/png,image/webp";
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const listeners = new Set<() => void>();
let memorySession: string | null = null;

// The session id stands in for the citizen's phone number. It lives in the
// browser only; storage can be unavailable, so fall back to memory.
function readSession(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
  } catch {
    // ignore
  }
  memorySession ??= crypto.randomUUID();
  try {
    localStorage.setItem(STORAGE_KEY, memorySession);
  } catch {
    // ignore
  }
  return memorySession;
}

function resetSession() {
  memorySession = crypto.randomUUID();
  try {
    localStorage.setItem(STORAGE_KEY, memorySession);
  } catch {
    // ignore
  }
  listeners.forEach((listener) => listener());
}

function useSessionId(): string | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    readSession,
    () => null,
  );
}

// Renders links and the bot's *bold* (Telegram gets it as <b>).
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/\S+|\/ocorrencias\/\S+|\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        /^(https?:\/\/|\/ocorrencias\/)/.test(part) ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noreferrer"
            className="break-all font-medium text-accent underline"
          >
            {part}
          </a>
        ) : /^\*[^*]+\*$/.test(part) ? (
          <strong key={index}>{part.slice(1, -1)}</strong>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

export function SimulatorChat() {
  const sessionId = useSessionId();
  const chat = useQuery(
    api.simulator.messages,
    sessionId ? { sessionId } : "skip",
  );
  const occurrences = useQuery(api.occurrences.listActive);
  const send = useMutation(api.simulator.send);
  const generatePhotoUploadUrl = useMutation(api.simulator.generatePhotoUploadUrl);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const [text, setText] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll only the message list: scrollIntoView would also scroll the page,
  // which on phones pushed the whole sheet up and left a blank strip below.
  useEffect(() => {
    const list = bottomRef.current?.parentElement;
    list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  }, [chat?.length]);

  // A chime when the bot answers (not for the history loaded on open).
  const seenBotMessages = useRef<number | null>(null);
  const botMessages = chat?.filter((m) => m.author === "bot").length;
  useEffect(() => {
    if (botMessages === undefined) return;
    if (
      seenBotMessages.current !== null &&
      botMessages > seenBotMessages.current
    ) {
      playSound("receive");
    }
    seenBotMessages.current = botMessages;
  }, [botMessages]);

  const last = chat?.at(-1);
  const waitingForBot = last?.author === "citizen";
  const buttons = last?.author === "bot" ? last.buttons : undefined;

  // Like Telegram: the photo goes with whatever is typed as its caption.
  async function sendPhoto(file: File) {
    if (!sessionId) return;
    if (!PHOTO_TYPES.split(",").includes(file.type) || file.size > MAX_PHOTO_BYTES) {
      setError("Envie uma imagem JPEG, PNG ou WebP de até 5 MB.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const uploadUrl = await generatePhotoUploadUrl({ sessionId });
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) throw new Error(`Upload failed: ${response.status}`);
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      const caption = text.trim() || undefined;
      setText("");
      await submit({ text: caption, photoStorageId: storageId });
    } catch {
      setError("Não foi possível enviar a foto. Tente de novo.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(payload: {
    text?: string;
    location?: { lat: number; lng: number };
    button?: string;
    photoStorageId?: Id<"_storage">;
  }) {
    if (!sessionId) return;
    setError(null);
    playSound(payload.button ? "tap" : "send");
    try {
      await send({ sessionId, ...payload });
    } catch {
      setError("Não foi possível enviar. Tente de novo.");
    }
  }

  return (
    <main id="conteudo" className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <OccurrenceMap
          occurrences={occurrences ?? []}
          marker={pin}
          onMapClick={(point) => {
            playSound("tap");
            setPin(point);
          }}
          padding={{ top: 72 }}
        />
      </div>

      <p className="glass pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap max-md:hidden md:left-[calc(50%+210px)]">
        Clique no mapa para marcar o local do problema
      </p>

      <section
        aria-label="Simulador do Telegram"
        className="glass-strong absolute inset-x-0 bottom-0 z-20 flex h-[62dvh] flex-col overflow-hidden rounded-t-panel md:top-20 md:right-auto md:bottom-3 md:left-3 md:h-auto md:w-[400px] md:rounded-panel"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#37aee2] to-[#1e88d0] text-white shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="size-5 -translate-x-px" fill="currentColor">
              <path d="M21.94 4.34 18.9 18.67c-.23 1.02-.83 1.27-1.69.79l-4.66-3.43-2.25 2.16c-.25.25-.46.46-.94.46l.34-4.74 8.62-7.79c.37-.33-.08-.52-.58-.19L7.09 12.64 2.5 11.2c-1-.31-1.02-1 .21-1.48l17.94-6.91c.83-.31 1.56.19 1.29 1.53Z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] leading-tight font-semibold">
              Fiscaliz.ai no Telegram
            </h1>
            <p className="text-xs text-muted">bot · simulador com dados fictícios</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              playSound("close");
              resetSession();
              setPin(null);
            }}
          >
            Nova conversa
          </Button>
        </div>

        <div
          role="log"
          aria-live="polite"
          aria-label="Mensagens"
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-[linear-gradient(160deg,#d7e8c4cc,#b4d3a8cc_45%,#8fc1b5cc)] p-3 dark:bg-[linear-gradient(160deg,#0e1621e6,#111d2be6)]"
        >
          {chat?.length === 0 && (
            <p className="mx-auto max-w-xs rounded-card bg-surface/85 p-3 text-center text-xs text-muted shadow-sm">
              Descreva um problema da cidade, como &quot;tem um buraco enorme na
              rua&quot;, e marque o local clicando no mapa.
            </p>
          )}
          {chat?.map((message) => (
            <div
              key={message._id}
              className={`max-w-[85%] animate-[card-in_var(--dur)_var(--ease-out)] rounded-2xl px-3 py-2 text-[15px] leading-snug whitespace-pre-line text-fg shadow-sm ${
                message.author === "citizen"
                  ? "ml-auto w-fit rounded-br-md bg-[#effdde] dark:bg-[#2b5278]"
                  : "w-fit rounded-bl-md bg-white dark:bg-[#182533]"
              }`}
            >
              <span className="sr-only">
                {message.author === "citizen" ? "Você: " : "Fiscaliz.ai: "}
              </span>
              <Linkified text={message.text} />
            </div>
          ))}
          {buttons && (
            // Inline keyboard: Telegram puts the buttons right under the message.
            <div className="flex max-w-[85%] gap-1.5">
              {buttons.map((button) => (
                <button
                  key={button.id}
                  type="button"
                  onClick={() => submit({ button: button.id })}
                  className="min-h-11 flex-1 rounded-xl bg-black/25 px-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98] dark:bg-[#182533]/85 dark:hover:bg-[#22344a]"
                >
                  {button.title}
                </button>
              ))}
            </div>
          )}
          {waitingForBot && (
            <p className="flex items-center gap-1 px-1 text-xs text-muted">
              <span className="sr-only">Fiscaliz.ai está digitando</span>
              <span aria-hidden className="flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current" />
              </span>
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {pin && (
          <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Glyph name="locate" size={18} className="text-accent" />
              Local marcado no mapa
            </span>
            <Button
              size="sm"
              onClick={async () => {
                await submit({ location: pin });
                setPin(null);
              }}
            >
              Enviar localização
            </Button>
          </div>
        )}

        <form
          className="flex gap-2 border-t border-line p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
          onSubmit={async (event) => {
            event.preventDefault();
            const value = text.trim();
            if (!value) return;
            setText("");
            await submit({ text: value });
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={PHOTO_TYPES}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void sendPhoto(file);
            }}
          />
          <IconButton
            label={uploading ? "Enviando foto…" : "Anexar foto"}
            disabled={uploading}
            aria-busy={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Glyph name="camera" size={20} />
          </IconButton>
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={1000}
            placeholder="Mensagem"
            aria-label="Mensagem"
            className="h-11 min-w-0 flex-1 rounded-full border border-line bg-surface px-4 text-[15px] text-fg placeholder:text-subtle"
          />
          <Button type="submit" disabled={!text.trim()}>
            Enviar
          </Button>
        </form>
        {error && (
          <p role="alert" className="px-3 pb-2 text-xs text-danger">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}
