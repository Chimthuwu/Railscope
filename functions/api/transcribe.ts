import { stations } from "../../src/data/stations";

// Station names as AssemblyAI keyterms so voice search nails proper nouns
// ("Hurstville", "Woy Woy", "Warrawee") instead of guessing.
const STATION_KEYTERMS = Array.from(new Set(stations.map((s) => s.name)));

const AAI_BASE = "https://api.assemblyai.com";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Voice search - AssemblyAI speech-to-text proxy.
// The browser records a short clip and POSTs the raw audio bytes here; we
// upload it to AssemblyAI, transcribe with the station list as keyterms, and
// return the text. The API key never leaves the edge function.
export async function onRequest(context: any) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return Response.json({ status: "error", error: "POST only", text: "" }, { status: 405 });
  }

  const prose = new URL(request.url).searchParams.get("mode") === "prose";

  const apiKey = env.ASSEMBLYAI_API_KEY;
  if (!apiKey || apiKey === "MY_ASSEMBLYAI_API_KEY") {
    return Response.json({ status: "disabled", text: "" });
  }

  try {
    const audio = await request.arrayBuffer();
    if (!audio || audio.byteLength === 0) {
      return Response.json({ status: "error", error: "No audio received", text: "" }, { status: 400 });
    }

    const auth = { Authorization: apiKey };

    // 1. Upload the raw audio (binary body, not multipart).
    const uploadRes = await fetch(`${AAI_BASE}/v2/upload`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/octet-stream" },
      body: audio,
    });
    if (!uploadRes.ok) throw new Error(`upload ${uploadRes.status}`);
    const { upload_url: audioUrl } = await uploadRes.json();
    if (!audioUrl) throw new Error("no upload_url");

    // 2. Submit for transcription.
    const submitRes = await fetch(`${AAI_BASE}/v2/transcript`, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_url: audioUrl,
        speech_models: ["universal-3-5-pro", "universal-2"],
        ...(prose
          ? { punctuate: true, format_text: true }
          : { keyterms_prompt: STATION_KEYTERMS, punctuate: false, format_text: false }),
      }),
    });
    if (!submitRes.ok) throw new Error(`submit ${submitRes.status}`);
    const { id } = await submitRes.json();
    if (!id) throw new Error("no transcript id");

    // 3. Poll until done (short clips finish in a few seconds).
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
      await sleep(1000);
      const pollRes = await fetch(`${AAI_BASE}/v2/transcript/${id}`, { headers: auth });
      if (!pollRes.ok) continue;
      const { status, text, error } = await pollRes.json();
      if (status === "completed") {
        return Response.json({ status: "ok", text: (text || "").trim() });
      }
      if (status === "error") {
        return Response.json({ status: "error", error: error || "transcription failed", text: "" }, { status: 502 });
      }
    }
    return Response.json({ status: "error", error: "timed out", text: "" }, { status: 504 });
  } catch (err) {
    return Response.json(
      { status: "error", error: "Transcription unavailable", text: "" },
      { status: 502 },
    );
  }
}
