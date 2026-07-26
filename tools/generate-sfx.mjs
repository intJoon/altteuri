#!/usr/bin/env node
/**
 * Generate short UI click SFX as WAV files for HyperFrames composition.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../video/shorts/assets/sfx");

function writeWav(path, samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2);
  }
  writeFileSync(path, buffer);
}

function clickTone({ freq = 880, duration = 0.06, gain = 0.22, sampleRate = 44100 }) {
  const len = Math.floor(duration * sampleRate);
  const samples = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 45);
    samples[i] = Math.sin(2 * Math.PI * freq * t) * gain * env;
  }
  return samples;
}

function whoosh({ duration = 0.18, sampleRate = 44100 }) {
  const len = Math.floor(duration * sampleRate);
  const samples = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / len;
    const env = Math.sin(Math.PI * t) * 0.12;
    samples[i] = (Math.random() * 2 - 1) * env * (1 - t);
  }
  return samples;
}

mkdirSync(outDir, { recursive: true });
writeWav(join(outDir, "click.wav"), clickTone({ freq: 920, duration: 0.05 }));
writeWav(join(outDir, "toggle.wav"), clickTone({ freq: 640, duration: 0.07, gain: 0.18 }));
writeWav(join(outDir, "sort.wav"), clickTone({ freq: 520, duration: 0.09, gain: 0.2 }));
writeWav(join(outDir, "hide.wav"), whoosh({}));
console.log("Wrote SFX to video/shorts/assets/sfx/");
