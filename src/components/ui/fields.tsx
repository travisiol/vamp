"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Field({ label, hint, children, error, right }: { label: string; hint?: ReactNode; children: ReactNode; error?: string | null; right?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between">
        <span className="label">{label}</span>
        {right ? <span className="label text-bone-3">{right}</span> : null}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-blood-3" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-bone-3">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input ${className}`} {...rest} />;
}

export function TextArea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`input ${className}`} rows={3} {...rest} />;
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: ReactNode }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-start gap-3 rounded-xl border border-graphite-2 bg-white/[0.015] px-4 py-3 text-left transition hover:border-graphite-3">
      <span className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full border transition ${checked ? "border-blood-2 bg-blood" : "border-graphite-3 bg-graphite"}`}>
        <span className={`absolute top-0.5 h-3.5 w-3.5 rounded-full transition-all ${checked ? "left-[18px] bg-bone shadow-[0_0_8px_rgba(255,59,78,0.8)]" : "left-0.5 bg-bone-3"}`} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs leading-relaxed text-bone-3">{hint}</span> : null}
      </span>
    </button>
  );
}

export function Slider({ value, min, max, step, onChange, format }: { value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-4">
      <div className="relative flex-1">
        <div className="pointer-events-none absolute top-1/2 right-0 left-0 h-[3px] -translate-y-1/2 rounded-full bg-graphite-2">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#8b0000,#d3132a)] shadow-[0_0_10px_rgba(211,19,42,0.5)]" style={{ width: `${pct}%` }} />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="relative h-6 w-full cursor-pointer appearance-none bg-transparent [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-chrome-2 [&::-moz-range-thumb]:bg-[linear-gradient(180deg,#fff,#a9adb5)] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-chrome-2 [&::-webkit-slider-thumb]:bg-[linear-gradient(180deg,#fff,#a9adb5)] [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
        />
      </div>
      <span className="mono w-14 text-right text-sm">{format(value)}</span>
    </div>
  );
}
