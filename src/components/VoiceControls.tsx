"use client";
import { useState } from "react";
import type { Announcer, SoundKind } from "@/lib/useAnnouncer";
import { btn, card, Icon } from "./ui";

/** Status strip (always visible) + expandable settings panel. Mute never hides visual notifications. */
export default function VoiceControls({ a, label = "Voice" }: { a: Announcer; label?: string }) {
  const [open, setOpen] = useState(false);
  const p = a.prefs;
  const select = "mt-1.5 w-full rounded-md border border-ink-200 bg-white px-2.5 py-2 text-[13px] text-ink-700 focus:border-rose-400 focus:outline-none";
  return (
    <div className="space-y-3">
      {!a.enabled ? (
        <div className="flex flex-col items-start gap-3 rounded-xl border border-brass-300/70 bg-brass-50 p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brass-100 text-[#7A5E0E]"><Icon name="mute" className="h-4 w-4" /></span>
            <div>
              <p className="text-[13px] font-semibold text-[#5F4A0B]">Sound &amp; voice are off</p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[#7A5E0E]/80">Browsers block audio until you click. New orders still appear on screen but will not be spoken.</p>
            </div>
          </div>
          <button onClick={a.enable} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-ink-900 px-4 py-2.5 text-[13px] font-semibold text-cream-50 transition hover:bg-ink-800">
            <Icon name="volume" className="h-4 w-4" /> Enable sound &amp; voice
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${p.voiceMuted ? "border-ink-200 bg-ink-50 text-ink-500" : "border-leaf-200 bg-leaf-50 text-leaf-700"}`}>
            <Icon name={p.voiceMuted ? "mute" : "volume"} className="h-3 w-3" />
            {p.voiceMuted ? "Voice muted · visual + sound only" : a.speaking ? "Speaking…" : "Voice on"}
          </span>
          {p.soundKind === "off" && <span className="rounded-full border border-clay-100 bg-clay-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-clay-600">Alert sound off</span>}
          {!a.ttsSupported && <span className="rounded-full border border-brass-300/60 bg-brass-50 px-2.5 py-1 text-[11px] font-medium text-[#7A5E0E]">Text-to-speech unavailable — sound + visual alerts still work</span>}
          {a.pending > 0 && <span className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-ink-500">{a.pending} queued</span>}
          <span className="mx-0.5 hidden h-4 w-px bg-ink-200 sm:block" />
          <button onClick={() => a.updatePrefs({ voiceMuted: !p.voiceMuted })} className={btn.small}>{p.voiceMuted ? "Unmute voice" : "Mute voice"}</button>
          <button onClick={() => a.replay()} disabled={!a.lastText} className={btn.small}><Icon name="refresh" className="h-3 w-3" /> Replay last</button>
          <button onClick={a.testVoice} className={btn.small}><Icon name="volume" className="h-3 w-3" /> Test voice</button>
          <button onClick={() => setOpen((v) => !v)} className={btn.small} aria-expanded={open}><Icon name="settings" className="h-3 w-3" /> {label} settings</button>
        </div>
      )}
      {open && (
        <div className={`${card} grid gap-4 p-4 sm:grid-cols-2`}>
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Voice{!a.ttsSupported && " (unavailable)"}
            <select value={p.voiceURI} onChange={(e) => { const v = a.voices.find((x) => x.voiceURI === e.target.value); a.updatePrefs({ voiceURI: e.target.value, lang: v?.lang ?? p.lang }); }} className={select}>
              <option value="">Browser default</option>
              {[...a.voices].sort((x, y) => Number(y.lang.startsWith("en-IN") || y.lang.startsWith("hi")) - Number(x.lang.startsWith("en-IN") || x.lang.startsWith("hi"))).map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
            </select></label>
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Alert sound
            <select value={p.soundKind} onChange={(e) => a.updatePrefs({ soundKind: e.target.value as SoundKind })} className={select}><option value="chime">Chime</option><option value="bell">Bell</option><option value="beep">Beep</option><option value="off">Off</option></select></label>
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Speech rate · {p.rate.toFixed(1)}×<input type="range" min={0.6} max={1.6} step={0.1} value={p.rate} onChange={(e) => a.updatePrefs({ rate: Number(e.target.value) })} className="mt-2 w-full accent-[#A53C4E]" /></label>
          <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">Volume · {Math.round(p.volume * 100)}%<input type="range" min={0} max={1} step={0.05} value={p.volume} onChange={(e) => a.updatePrefs({ volume: Number(e.target.value) })} className="mt-2 w-full accent-[#A53C4E]" /></label>
          <p className="text-[11px] leading-relaxed text-ink-400 sm:col-span-2">Volume applies to the alert sound and, where the browser supports it, to the voice. These settings are saved on this device only.</p>
        </div>
      )}
    </div>
  );
}
