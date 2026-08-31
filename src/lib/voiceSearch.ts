import { API_BASE } from "./config";

// Voice search: record a short mic clip, auto-stop on silence, and send it to
// the /api/transcribe proxy (AssemblyAI). Replaces the browser SpeechRecognition
// API, which fails with a "network" error wherever Google's speech backend is
// unreachable.

export type VoiceSession = {
  /** Finish now and transcribe what was captured. */
  stop: () => void;
  /** Abandon — no transcription, no callbacks. */
  cancel: () => void;
};

type Handlers = {
  /** "station" biases toward NSW station names; "prose" keeps punctuation for free dictation. */
  mode?: "station" | "prose";
  onStart?: () => void;
  onProcessing?: () => void;
  onResult: (text: string) => void;
  onError: (message: string) => void;
};

const MAX_MS = 6000; // hard cap on clip length
const SILENCE_MS = 900; // stop this long after speech ends
const SPEECH_RMS = 0.02; // volume above this counts as speech

const PREFERRED_MIME = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

export async function startVoiceSearch(handlers: Handlers): Promise<VoiceSession> {
  const noop = { stop: () => {}, cancel: () => {} };

  if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    handlers.onError("Voice search isn't supported in this browser.");
    return noop;
  }

  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    handlers.onError("Microphone access is blocked. Allow the mic for this site and try again.");
    return noop;
  }

  const mimeType = PREFERRED_MIME.find((t) => MediaRecorder.isTypeSupported(t)) || "";
  const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks: BlobPart[] = [];

  let stopped = false;
  let cancelled = false;

  let audioCtx: AudioContext | null = null;
  const maxTimer = window.setTimeout(() => safeStop(), MAX_MS);

  const cleanup = () => {
    window.clearTimeout(maxTimer);
    stream.getTracks().forEach((t) => t.stop());
    audioCtx?.close().catch(() => {});
  };

  function safeStop() {
    if (stopped) return;
    stopped = true;
    if (rec.state !== "inactive") rec.stop();
    else cleanup();
  }

  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };

  rec.onstop = async () => {
    cleanup();
    if (cancelled) return;

    const blob = new Blob(chunks, { type: mimeType || "audio/webm" });
    if (blob.size < 1200) {
      handlers.onError("Didn't catch that — tap the mic and say the station name.");
      return;
    }

    handlers.onProcessing?.();
    try {
      const mode = handlers.mode ?? "station";
      const res = await fetch(`${API_BASE}/api/transcribe?mode=${mode}`, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      const data = await res.json().catch(() => ({}) as any);

      if (data.status === "disabled") {
        handlers.onError("Voice search isn't configured on the server yet.");
        return;
      }
      if (!res.ok || data.status !== "ok" || !data.text) {
        handlers.onError(
          data.error === "timed out"
            ? "Voice search timed out — try again."
            : "Couldn't make out that station — try again.",
        );
        return;
      }

      const raw = String(data.text).trim();
      const cleaned =
        (handlers.mode ?? "station") === "prose"
          ? raw
          : raw.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").trim();
      if (cleaned) handlers.onResult(cleaned);
      else handlers.onError("Didn't catch that — try again.");
    } catch {
      handlers.onError("Voice search needs an internet connection.");
    }
  };

  // Silence detection — stop shortly after the user stops talking.
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new Ctx();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    let lastLoud = performance.now();
    let spoke = false;

    const tick = () => {
      if (stopped) return;
      analyser.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const v = (buf[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / buf.length);
      const now = performance.now();
      if (rms > SPEECH_RMS) {
        lastLoud = now;
        spoke = true;
      }
      if (spoke && now - lastLoud > SILENCE_MS) {
        safeStop();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  } catch {
    // No AudioContext — rely on the MAX_MS cap and manual stop.
  }

  rec.start();
  handlers.onStart?.();

  return {
    stop: safeStop,
    cancel: () => {
      cancelled = true;
      safeStop();
    },
  };
}
