/**
 * Audio messages: download from the WhatsApp Cloud API and transcribe with
 * ElevenLabs Scribe. The audio only lives in memory during this call and is
 * never stored.
 */

const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION ?? "v23.0";
const SCRIBE_URL = "https://api.elevenlabs.io/v1/speech-to-text";
// WhatsApp voice notes are short; refuse anything unreasonably large.
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Media id → audio bytes, via the Graph API with the same token. */
export async function downloadWhatsAppMedia(
  mediaId: string,
): Promise<{ data: Blob; mimeType: string }> {
  const token = env("WHATSAPP_TOKEN");
  const headers = { Authorization: `Bearer ${token}` };

  const meta = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  if (!meta.ok) throw new Error(`Media lookup failed: HTTP ${meta.status}`);
  const { url, mime_type, file_size } = (await meta.json()) as {
    url: string;
    mime_type: string;
    file_size?: number;
  };
  if (file_size && file_size > MAX_AUDIO_BYTES) throw new Error("Audio too large");

  const media = await fetch(url, { headers, signal: AbortSignal.timeout(20_000) });
  if (!media.ok) throw new Error(`Media download failed: HTTP ${media.status}`);
  const data = await media.blob();
  if (data.size > MAX_AUDIO_BYTES) throw new Error("Audio too large");
  return { data, mimeType: mime_type };
}

/** Audio → pt-BR text with ElevenLabs Scribe. */
export async function transcribe(audio: Blob, mimeType: string): Promise<string> {
  const form = new FormData();
  form.append("model_id", "scribe_v2");
  form.append("language_code", "por");
  form.append("tag_audio_events", "false");
  form.append("file", new Blob([audio], { type: mimeType }), "audio.ogg");

  const response = await fetch(SCRIBE_URL, {
    method: "POST",
    headers: { "xi-api-key": env("ELEVENLABS_API_KEY") },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Transcription failed: HTTP ${response.status}`);
  const { text } = (await response.json()) as { text?: string };
  const trimmed = text?.trim();
  if (!trimmed) throw new Error("Empty transcription");
  return trimmed;
}

export async function transcribeWhatsAppAudio(mediaId: string): Promise<string> {
  const { data, mimeType } = await downloadWhatsAppMedia(mediaId);
  return transcribe(data, mimeType);
}
