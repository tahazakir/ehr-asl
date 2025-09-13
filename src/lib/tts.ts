// src/lib/tts.ts
export type SpeakOpts = {
  voice?: SpeechSynthesisVoice;
  lang?: string;
  rate?: number;  // 0.1–10 (1 = normal)
  pitch?: number; // 0–2 (1 = normal)
  volume?: number; // 0–1
};

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const synth = window.speechSynthesis;
  const existing = synth.getVoices();
  if (existing && existing.length) return Promise.resolve(existing);
  return new Promise((resolve) => {
    const on = () => {
      synth.removeEventListener('voiceschanged', on);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', on);
  });
}

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  preferLangPrefix = 'en',
  preferNameContains?: string
): SpeechSynthesisVoice | undefined {
  const byLang = voices.filter(v => v.lang?.toLowerCase().startsWith(preferLangPrefix));
  if (preferNameContains) {
    const m = byLang.find(v => v.name.toLowerCase().includes(preferNameContains.toLowerCase()));
    if (m) return m;
  }
  return byLang[0] ?? voices[0];
}

export function speak(text: string, opts: SpeakOpts = {}) {
  if (!text?.trim()) return;
  const u = new SpeechSynthesisUtterance(text);
  if (opts.voice) u.voice = opts.voice;
  u.lang = opts.lang ?? opts.voice?.lang ?? 'en-US';
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  u.volume = opts.volume ?? 1;
  // Cancel any ongoing speech so phrases don't overlap
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
