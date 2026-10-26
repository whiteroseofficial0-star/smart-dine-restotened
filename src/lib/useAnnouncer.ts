"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnnounceQueue } from "./announceQueue";

export type SoundKind = "chime" | "bell" | "beep" | "off";
export interface VoicePrefs { voiceMuted: boolean; soundKind: SoundKind; rate: number; volume: number; voiceURI: string; lang: string }
export interface AnnounceItem { orderId: string; text: string }
const DEFAULTS: VoicePrefs = { voiceMuted: false, soundKind: "chime", rate: 1, volume: 1, voiceURI: "", lang: "en-IN" };

const PATTERNS: Record<Exclude<SoundKind, "off">, number[]> = { chime: [880, 1175, 1568], bell: [1318, 988], beep: [1000, 1000] };
function playSound(ctx: AudioContext, kind: SoundKind, volume: number) {
  if (kind === "off") return;
  const t0 = ctx.currentTime;
  PATTERNS[kind].forEach((f, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), t = t0 + i * 0.22;
    o.type = kind === "beep" ? "square" : "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.45 * volume), t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.22);
  });
}

/**
 * Queue + deduplicated voice announcer for one screen.
 * - An id is announced once per browser tab session (survives refreshes via sessionStorage).
 * - Items arriving before audio is enabled are not spoken later (they'd be stale); the screen shows them visually.
 * - Visual notifications are the caller's job and are never affected by mute/disabled voice.
 */
export function useAnnouncer(scope: string, defaults?: Partial<VoicePrefs>) {
  const [prefs, setPrefs] = useState<VoicePrefs>({ ...DEFAULTS, ...defaults });
  const [enabled, setEnabled] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [ttsSupported, setTtsSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [lastText, setLastText] = useState<string | null>(null);
  const [pending, setPending] = useState(0);

  const prefsRef = useRef(prefs); prefsRef.current = prefs;
  const enabledRef = useRef(false);
  const queueRef = useRef<AnnounceQueue<AnnounceItem> | null>(null);
  const busyRef = useRef(false);
  const seqRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const uttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const ttsRef = useRef(true);
  const pumpRef = useRef<() => void>(() => {});
  const seenKey = `wr_seen_${scope}`, prefKey = `wr_voice_${scope}`;

  const persistSeen = () => { try { sessionStorage.setItem(seenKey, JSON.stringify(queueRef.current!.seenIds().slice(-500))); } catch {} };
  const getQueue = () => {
    if (!queueRef.current) {
      let initial: string[] = [];
      try { initial = JSON.parse(sessionStorage.getItem(seenKey) ?? "[]"); } catch {}
      queueRef.current = new AnnounceQueue<AnnounceItem>(initial);
    }
    return queueRef.current;
  };

  useEffect(() => {
    getQueue();
    try { const saved = localStorage.getItem(prefKey); if (saved) setPrefs((p) => ({ ...p, ...JSON.parse(saved) })); } catch {}
    const ok = typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
    ttsRef.current = ok; setTtsSupported(ok);
    if (ok) {
      const load = () => { const v = window.speechSynthesis.getVoices(); voicesRef.current = v; setVoices(v); };
      load(); window.speechSynthesis.addEventListener("voiceschanged", load);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  pumpRef.current = () => {
    if (busyRef.current) return;
    const item = getQueue().next();
    setPending(getQueue().pending);
    if (!item) return;
    setLastText(item.text);
    if (!enabledRef.current) { pumpRef.current(); return; } // silent drain: visual only
    busyRef.current = true; setSpeaking(true);
    const id = ++seqRef.current;
    const done = () => { if (seqRef.current !== id || !busyRef.current) return; busyRef.current = false; setSpeaking(false); pumpRef.current(); };
    const p = prefsRef.current;
    try { if (ctxRef.current) playSound(ctxRef.current, p.soundKind, p.volume); } catch {}
    setTimeout(() => {
      if (p.voiceMuted || !ttsRef.current) { done(); return; }
      try {
        const u = new SpeechSynthesisUtterance(item.text);
        u.lang = p.lang; u.rate = p.rate; u.volume = p.volume;
        const v = voicesRef.current.find((x) => x.voiceURI === p.voiceURI);
        if (v) { u.voice = v; u.lang = v.lang; }
        u.onend = done; u.onerror = done; uttRef.current = u; // keep a reference: some browsers GC utterances mid-speech
        window.speechSynthesis.speak(u);
      } catch { done(); }
    }, p.soundKind === "off" ? 0 : 750);
    setTimeout(done, 25000); // safety: never let a stuck utterance block the queue
  };

  /** Must be called from a click handler (browsers block audio until a user gesture). */
  const enable = useCallback(() => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (AC && !ctxRef.current) ctxRef.current = new AC();
      ctxRef.current?.resume();
    } catch {}
    enabledRef.current = true; setEnabled(true);
  }, []);

  const enqueue = useCallback((item: AnnounceItem) => {
    const ok = getQueue().enqueue(item);
    if (ok) { persistSeen(); setPending(getQueue().pending); pumpRef.current(); }
    return ok;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const markSeen = useCallback((ids: Iterable<string>) => { getQueue().markSeen(ids); persistSeen(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const hasSeen = useCallback((id: string) => getQueue().has(id), []);

  /** Restaurant-wide defaults from Settings. A device's own saved choices always win. */
  const applyDefaults = useCallback((d: Partial<VoicePrefs>) => { try { if (localStorage.getItem(prefKey)) return; } catch {} setPrefs((p) => ({ ...p, ...d })); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakNow = useCallback((text: string) => { enable(); enqueue({ orderId: `manual-${Date.now()}-${Math.random()}`, text }); }, [enable, enqueue]);
  const replay = useCallback((text?: string) => { const t = text ?? lastText; if (t) speakNow(t); }, [lastText, speakNow]);
  const testVoice = useCallback(() => speakNow("Attention! New order received. Table 4. Order number 102. two Veg Burgers and one Cold Coffee."), [speakNow]);
  const updatePrefs = useCallback((patch: Partial<VoicePrefs>) => {
    setPrefs((p) => { const n = { ...p, ...patch }; try { localStorage.setItem(prefKey, JSON.stringify(n)); } catch {} return n; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { prefs, updatePrefs, enabled, enable, voices, ttsSupported, speaking, pending, lastText, enqueue, markSeen, hasSeen, replay, testVoice, speakNow, applyDefaults };
}
export type Announcer = ReturnType<typeof useAnnouncer>;
