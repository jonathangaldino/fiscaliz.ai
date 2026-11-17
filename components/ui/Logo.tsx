/**
 * Fiscaliz.ai mark: a message balloon that ends in a map pin, with a check.
 * "You report, it lands on the map, the city fixes it." Source files and
 * usage rules: public/brand/ and docs/marca.md.
 */

const BALLOON =
  "M208 92H304A96 96 0 0 1 400 188V220A96 96 0 0 1 304 316H296L264 406Q256 424 248 406L216 316H208A96 96 0 0 1 112 220V188A96 96 0 0 1 208 92Z";
const CHECK = "M198 206L238 246L316 168";

/** App-icon version: blue rounded square with the white balloon. */
export function LogoMark({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
      className={`shrink-0 drop-shadow-[0_2px_6px_rgb(11_79_168/0.35)] ${className}`}
    >
      <defs>
        <linearGradient id="fz-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2B8CFF" />
          <stop offset="1" stopColor="#0A4596" />
        </linearGradient>
        <linearGradient id="fz-gloss" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill="url(#fz-bg)" />
      <rect width="512" height="512" rx="116" fill="url(#fz-gloss)" />
      <path d={BALLOON} fill="#000" opacity=".18" transform="translate(0 10)" />
      <path d={BALLOON} fill="#fff" />
      <path
        d={CHECK}
        fill="none"
        stroke="#0B5FC6"
        strokeWidth="36"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark + name, as text so it follows the page font and color. */
export function Logo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      <span
        className="font-semibold tracking-tight text-fg"
        style={{ fontSize: size * 0.56 }}
      >
        Fiscaliz<span className="text-accent">.ai</span>
      </span>
    </span>
  );
}
