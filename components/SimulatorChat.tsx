"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "./ui/Button";
import { Glyph } from "./ui/Glyph";

const OccurrenceMap = dynamic(() => import("./OccurrenceMap"), { ssr: false });

const STORAGE_KEY = "fiscaliza.simulatorSession";
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

// Renders links and WhatsApp-style *bold*.
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

  const [text, setText] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat?.length]);

  const last = chat?.at(-1);
  const waitingForBot = last?.author === "citizen";
  const buttons = last?.author === "bot" ? last.buttons : undefined;

  async function submit(payload: {
    text?: string;
    location?: { lat: number; lng: number };
    button?: string;
  }) {
    if (!sessionId) return;
    setError(null);
    try {
      await send({ sessionId, ...payload });
    } catch {
      setError("Não foi possível enviar. Tente de novo.");
    }
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0">
        <OccurrenceMap
          occurrences={occurrences ?? []}
          marker={pin}
          onMapClick={setPin}
          padding={{ top: 72 }}
        />
      </div>

      <p className="glass pointer-events-none absolute top-20 left-1/2 z-10 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap max-md:hidden md:left-[calc(50%+210px)]">
        Clique no mapa para marcar o local do problema
      </p>

      <section
        aria-label="Simulador do WhatsApp"
        className="glass-strong absolute inset-x-0 bottom-0 z-20 flex h-[62dvh] flex-col overflow-hidden rounded-t-panel md:top-20 md:right-auto md:bottom-3 md:left-3 md:h-auto md:w-[400px] md:rounded-panel"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <span
            aria-hidden
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#25d366] to-[#128c7e] text-white shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor">
              <path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3Zm0 1.8a7.2 7.2 0 1 1-3.7 13.4l-.3-.2-2.7.7.7-2.6-.2-.3A7.2 7.2 0 0 1 12 4.8Z" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-[15px] leading-tight font-semibold">
              Fiscaliz.ai no WhatsApp
            </h1>
            <p className="text-xs text-muted">Simulador · dados fictícios</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
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
          className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-[#efeae2]/70 p-3 dark:bg-black/25"
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
                  ? "ml-auto rounded-br-md bg-[#d9fdd3] dark:bg-[#144d37]"
                  : "rounded-bl-md bg-surface"
              }`}
            >
              <span className="sr-only">
                {message.author === "citizen" ? "Você: " : "Fiscaliz.ai: "}
              </span>
              <Linkified text={message.text} />
            </div>
          ))}
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

        {buttons && (
          <div className="flex gap-2 border-t border-line p-2">
            {buttons.map((button) => (
              <Button
                key={button.id}
                variant="glass"
                onClick={() => submit({ button: button.id })}
                className="flex-1 font-semibold text-accent"
              >
                {button.title}
              </Button>
            ))}
          </div>
        )}

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
    </div>
  );
}
