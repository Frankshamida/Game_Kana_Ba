let audioCtx: AudioContext | null = null;

const getContext = () => {
  if (typeof window === "undefined") {
    return null;
  }
  if (!audioCtx) {
    audioCtx = new window.AudioContext();
  }
  return audioCtx;
};

const playTone = (freq: number, duration = 0.12, gain = 0.05) => {
  const context = getContext();
  if (!context) return;
  const osc = context.createOscillator();
  const amp = context.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;
  amp.gain.value = gain;

  osc.connect(amp);
  amp.connect(context.destination);

  const now = context.currentTime;
  amp.gain.setValueAtTime(gain, now);
  amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
};

export const playFlipSound = () => {
  playTone(520, 0.08, 0.03);
  setTimeout(() => playTone(720, 0.08, 0.03), 60);
};

export const playTimerEndSound = () => {
  playTone(320, 0.12, 0.05);
  setTimeout(() => playTone(260, 0.12, 0.05), 140);
  setTimeout(() => playTone(520, 0.2, 0.06), 290);
};
