import { useId } from "react";
import type { Kind } from "@/lib/data";

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amt < 0 ? c * amt : (255 - c) * amt))));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `rgb(${r},${g},${b})`;
}

/** Мягкая 3D-иллюстрация посуды (замена фото, пока нет студийных снимков на прозрачном фоне). */
export function ProductArt({ kind, color, label }: { kind: Kind; color: string; label?: string }) {
  const id = useId().replace(/:/g, "");
  const hi = shade(color, 0.35);
  const lo = shade(color, -0.28);
  const metal = "#8d8479";
  const body = `url(#b${id})`;

  return (
    <svg viewBox="0 0 200 200" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      <defs>
        <linearGradient id={`b${id}`} x1="0" x2="1">
          <stop offset="0" stopColor={lo} />
          <stop offset="0.35" stopColor={hi} />
          <stop offset="0.7" stopColor={color} />
          <stop offset="1" stopColor={lo} />
        </linearGradient>
        <linearGradient id={`m${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#6d655b" />
          <stop offset="0.4" stopColor="#c9c0b4" />
          <stop offset="1" stopColor="#6d655b" />
        </linearGradient>
      </defs>

      {kind === "pot" && (
        <g>
          <rect x="22" y="92" width="22" height="10" rx="5" fill={`url(#m${id})`} />
          <rect x="156" y="92" width="22" height="10" rx="5" fill={`url(#m${id})`} />
          <path d="M34 86h132l-6 82q-1 12-14 12H54q-13 0-14-12z" fill={body} />
          <ellipse cx="100" cy="86" rx="68" ry="12" fill={shade(color, -0.12)} />
          <path d="M30 80q70-44 140 0v6q-70 16-140 0z" fill={shade(color, 0.12)} />
          <ellipse cx="100" cy="64" rx="22" ry="5" fill={shade(color, -0.2)} />
          <circle cx="100" cy="56" r="9" fill={`url(#m${id})`} />
          <path d="M44 100q56 10 112 0" stroke="rgba(255,255,255,0.35)" strokeWidth="2" fill="none" />
        </g>
      )}

      {kind === "kazan" && (
        <g>
          <path d="M14 82q-6 0-6 8t6 8h14v-16z" fill={`url(#m${id})`} />
          <path d="M186 82q6 0 6 8t-6 8h-14v-16z" fill={`url(#m${id})`} />
          <path d="M22 78h156q4 64-48 100h-60Q18 142 22 78z" fill={body} />
          <ellipse cx="100" cy="78" rx="78" ry="14" fill={shade(color, -0.35)} />
          <ellipse cx="100" cy="80" rx="68" ry="9" fill={shade(color, -0.5)} />
          <path d="M40 110q60 24 120 0" stroke="rgba(255,255,255,0.18)" strokeWidth="3" fill="none" />
        </g>
      )}

      {kind === "pan" && (
        <g>
          <path d="M150 98h44q6 0 6 6t-6 6h-44z" fill={`url(#m${id})`} />
          <path d="M18 92h140l-8 44q-3 16-20 16H46q-17 0-20-16z" fill={body} />
          <ellipse cx="88" cy="92" rx="70" ry="12" fill={shade(color, -0.4)} />
          <ellipse cx="88" cy="93" rx="60" ry="8" fill={shade(color, -0.55)} />
          <ellipse cx="88" cy="166" rx="48" ry="6" fill="rgba(64,56,48,0.12)" />
        </g>
      )}

      {kind === "kettle" && (
        <g>
          <path d="M150 98q34-8 38-40q2-6 8-2q2 4 0 8q-6 40-46 52z" fill={body} />
          <path d="M50 58q50-34 100 0l12 90q2 22-20 22H58q-22 0-20-22z" fill={body} />
          <path d="M60 62q40-24 80 0" stroke="rgba(255,255,255,0.4)" strokeWidth="3" fill="none" />
          <path d="M52 42q48-34 96 0q-48 -4-96 0z" fill={shade(color, -0.1)} />
          <rect x="92" y="26" width="16" height="14" rx="7" fill="#7a6350" />
          <path d="M52 70q-34 0-34 40t34 38" stroke="#7a6350" strokeWidth="9" strokeLinecap="round" fill="none" />
        </g>
      )}

      {kind === "bowl" && (
        <g>
          <ellipse cx="100" cy="164" rx="52" ry="7" fill="rgba(64,56,48,0.15)" />
          <path d="M20 84h160q-6 66-50 82H70Q26 150 20 84z" fill={body} />
          <ellipse cx="100" cy="84" rx="80" ry="15" fill={shade(color, -0.25)} />
          <ellipse cx="100" cy="86" rx="70" ry="10" fill={shade(color, 0.18)} />
          <path d="M44 120q56 22 112 0" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
        </g>
      )}

      {kind === "cup" && (
        <g>
          <ellipse cx="100" cy="158" rx="76" ry="14" fill={shade(color, -0.12)} />
          <ellipse cx="100" cy="154" rx="62" ry="9" fill={shade(color, 0.2)} />
          <path d="M148 92q34-4 28 22t-34 22" stroke={shade(color, -0.1)} strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d="M44 78h108q-2 62-54 70q-52-8-54-70z" fill={body} />
          <ellipse cx="98" cy="78" rx="54" ry="10" fill={shade(color, -0.3)} />
          <ellipse cx="98" cy="80" rx="46" ry="6" fill="#7a5c43" />
        </g>
      )}
    </svg>
  );
}
