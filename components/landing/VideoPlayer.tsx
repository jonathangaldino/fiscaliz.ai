"use client";

import { useRef, useState } from "react";
import { Glyph } from "../ui/Glyph";
import { LogoMark } from "../ui/Logo";

/**
 * Explainer video (script in docs/marca/roteiro-video.md). Video and poster
 * are served from the Higgsfield CDN where they were rendered (10 MB, kept out
 * of the repository); the captions live in public/video/.
 */
const CDN =
  "https://d2ol7oe51mr4n9.cloudfront.net/user_3IH6s2x6op5CIWGya8iR1hp8f6B";
export const EXPLAINER = {
  src: `${CDN}/e64a014b-49b3-43e0-aca5-a1ad7f1d1234.mp4`,
  poster: `${CDN}/4a89bcbe-b54c-4526-8a2b-da2cde355677.jpg`,
  captions: "/video/explicativo.pt-BR.vtt",
  duration: "1 min",
};

export function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const ready = Boolean(EXPLAINER.src);

  return (
    <div className="glass-strong relative mx-auto aspect-video w-full max-w-4xl overflow-hidden rounded-[2rem] p-2">
      <div className="relative size-full overflow-hidden rounded-[1.5rem] bg-[#0a1a33]">
        {ready && (
          <video
            ref={videoRef}
            className="size-full object-cover"
            poster={EXPLAINER.poster}
            preload="none"
            playsInline
            controls={started}
            aria-label="Vídeo: como o Fiscaliz.ai funciona"
          >
            <source src={EXPLAINER.src} type="video/mp4" />
            <track
              kind="captions"
              src={EXPLAINER.captions}
              srcLang="pt-BR"
              label="Português"
              default
            />
          </video>
        )}
        {!started && (
          <button
            type="button"
            disabled={!ready}
            onClick={() => {
              setStarted(true);
              void videoRef.current?.play();
            }}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_50%_40%,rgb(43_140_255/0.35),transparent_60%)] text-white disabled:cursor-default"
            style={
              ready
                ? undefined
                : {
                    backgroundImage: `url(${EXPLAINER.poster})`,
                    backgroundSize: "cover",
                  }
            }
          >
            {ready ? (
              <>
                <span className="flex size-20 items-center justify-center rounded-full bg-white/20 shadow-[inset_0_1px_0_rgb(255_255_255/0.5)] backdrop-blur-xl transition-transform duration-(--dur) ease-spring group-hover:scale-110 group-active:scale-95">
                  <svg
                    viewBox="0 0 24 24"
                    className="ml-1 size-8"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
                  </svg>
                </span>
                <span className="text-sm font-semibold">
                  Assistir ({EXPLAINER.duration}, com legendas)
                </span>
              </>
            ) : (
              <>
                <LogoMark size={56} />
                <span className="flex items-center gap-1.5 rounded-full bg-black/30 px-3 py-1.5 text-sm font-semibold backdrop-blur">
                  <Glyph name="sound" size={16} />
                  Vídeo em produção
                </span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
