import {
  CATEGORIES,
  CATEGORY_KEYS,
  type CategoryKey,
} from "@/convex/lib/categories";
import { CATEGORY_ICON } from "@/lib/categoryIcons";

/**
 * Map pins drawn once on a canvas: a white bubble with a short tail, a ring in
 * the category color and the category icon inside. Sizes in CSS pixels.
 */
export const PIN = { width: 48, height: 58, radius: 21, icon: 28 } as const;
const RATIO = 2;
const SHADOW = 6;

export const pinImageId = (category: CategoryKey) => `pin-${category}`;
export const VERIFYING_BADGE_ID = "badge-verifying";

type PinImage = { data: ImageData; pixelRatio: number };
let cache: Promise<Map<string, PinImage>> | null = null;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function canvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width * RATIO;
  element.height = height * RATIO;
  const context = element.getContext("2d")!;
  context.scale(RATIO, RATIO);
  return { element, context };
}

function drawPin(icon: HTMLImageElement, color: string): ImageData {
  const { width, height, radius } = PIN;
  const { element, context } = canvas(width, height);
  const cx = width / 2;
  const cy = radius + SHADOW / 2;

  // Bubble with a tail, so the point sits exactly on the address.
  const bubble = new Path2D();
  bubble.arc(cx, cy, radius, Math.PI * 0.62, Math.PI * 2.38);
  bubble.lineTo(cx, height - 2);
  bubble.closePath();

  context.save();
  context.shadowColor = "rgba(15, 23, 20, 0.35)";
  context.shadowBlur = SHADOW;
  context.shadowOffsetY = 2;
  context.fillStyle = "#ffffff";
  context.fill(bubble);
  context.restore();

  context.lineWidth = 2.5;
  context.strokeStyle = color;
  context.beginPath();
  context.arc(cx, cy, radius - 2.5, 0, Math.PI * 2);
  context.stroke();

  const size = PIN.icon;
  context.drawImage(icon, cx - size / 2, cy - size / 2, size, size);
  return context.getImageData(0, 0, element.width, element.height);
}

function drawVerifyingBadge(): ImageData {
  const size = 16;
  const { element, context } = canvas(size, size);
  context.beginPath();
  context.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  context.fillStyle = "#f59e0b";
  context.fill();
  context.lineWidth = 2.5;
  context.strokeStyle = "#ffffff";
  context.stroke();
  return context.getImageData(0, 0, element.width, element.height);
}

/** Every pin image, drawn once per page load. */
export function pinImages(): Promise<Map<string, PinImage>> {
  cache ??= (async () => {
    const images = new Map<string, PinImage>();
    await Promise.all(
      CATEGORY_KEYS.map(async (key) => {
        const icon = await loadImage(CATEGORY_ICON[key]);
        images.set(pinImageId(key), {
          data: drawPin(icon, CATEGORIES[key].color),
          pixelRatio: RATIO,
        });
      }),
    );
    images.set(VERIFYING_BADGE_ID, {
      data: drawVerifyingBadge(),
      pixelRatio: RATIO,
    });
    return images;
  })();
  return cache;
}
