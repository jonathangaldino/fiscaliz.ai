"use client";

import { useMutation, useQuery } from "convex/react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api } from "@/convex/_generated/api";

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
            className="break-all text-blue-700 underline dark:text-blue-300"
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
  const occurrences = useQuery(api.occurrences.listOpen);
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
    button?: "yes" | "no";
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
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <section className="flex min-h-0 flex-1 flex-col md:max-w-md md:border-r md:border-zinc-200 dark:md:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2 text-sm dark:border-zinc-800">
          <span className="text-zinc-500">
            Simulador do WhatsApp · dados fictícios
          </span>
          <button
            type="button"
            onClick={() => {
              resetSession();
              setPin(null);
            }}
            className="text-blue-600 underline"
          >
            Nova conversa
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#efeae2] p-3 dark:bg-zinc-900">
          {chat?.length === 0 && (
            <p className="mx-auto max-w-xs rounded-lg bg-white/80 p-3 text-center text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              Descreva um problema da cidade, como &quot;tem um buraco enorme na
              rua&quot;, e marque o local clicando no mapa.
            </p>
          )}
          {chat?.map((message) => (
            <div
              key={message._id}
              className={`max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm shadow-sm ${
                message.author === "citizen"
                  ? "ml-auto bg-[#d9fdd3] dark:bg-emerald-900"
                  : "bg-white dark:bg-zinc-800"
              }`}
            >
              <Linkified text={message.text} />
            </div>
          ))}
          {waitingForBot && (
            <p className="text-xs text-zinc-500" aria-live="polite">
              digitando…
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {buttons && (
          <div className="flex gap-2 border-t border-zinc-200 p-2 dark:border-zinc-800">
            {buttons.map((button) => (
              <button
                key={button.id}
                type="button"
                onClick={() => submit({ button: button.id })}
                className="flex-1 rounded-lg border border-emerald-600 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950"
              >
                {button.title}
              </button>
            ))}
          </div>
        )}

        {pin && (
          <div className="flex items-center justify-between gap-2 border-t border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800">
            <span>📍 Local marcado no mapa</span>
            <button
              type="button"
              onClick={async () => {
                await submit({ location: pin });
                setPin(null);
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1 font-medium text-white"
            >
              Enviar localização
            </button>
          </div>
        )}

        <form
          className="flex gap-2 border-t border-zinc-200 p-2 dark:border-zinc-800"
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
            className="min-w-0 flex-1 rounded-full border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <button
            type="submit"
            className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            disabled={!text.trim()}
          >
            Enviar
          </button>
        </form>
        {error && <p className="px-3 pb-2 text-xs text-red-600">{error}</p>}
      </section>

      <section className="relative h-[45vh] md:h-auto md:flex-1">
        <p className="absolute left-3 top-3 z-10 rounded bg-white/90 px-2 py-1 text-xs shadow dark:bg-zinc-900/90">
          Clique no mapa para marcar o local do problema
        </p>
        <OccurrenceMap
          occurrences={occurrences ?? []}
          marker={pin}
          onMapClick={setPin}
        />
      </section>
    </div>
  );
}
