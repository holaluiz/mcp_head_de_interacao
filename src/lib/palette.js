// Paleta: completa tokens a partir de poucas cores, nomeia cores para os
// prompts visuais (em inglês) e confere contraste.

export function parseHex(hex) {
  const m = String(hex || '').trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return null;
  let x = m[1];
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16) };
}
export function toHex({ r, g, b }) {
  return '#' + [r, g, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
}
export function mix(a, b, t) {
  const A = parseHex(a), B = parseHex(b);
  if (!A || !B) return a;
  return toHex({ r: A.r + (B.r - A.r) * t, g: A.g + (B.g - A.g) * t, b: A.b + (B.b - A.b) * t });
}
export function rgba(hex, a) {
  const c = parseHex(hex);
  return c ? `rgba(${c.r}, ${c.g}, ${c.b}, ${a})` : hex;
}
function lum(hex) {
  const c = parseHex(hex);
  if (!c) return 0;
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
export function contrast(a, b) {
  const la = lum(a), lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function hsl(hex) {
  const c = parseHex(hex);
  if (!c) return { h: 0, s: 0, l: 0 };
  const r = c.r / 255, g = c.g / 255, b = c.b / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  let h = 0, s = 0;
  if (d) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  return { h, s, l };
}

/* Nome de cor em inglês para os prompts visuais ("subtle gold rim light"). */
export function colorName(hex) {
  const { h, s, l } = hsl(hex);
  if (s < 0.12) return l > 0.85 ? 'white' : l > 0.6 ? 'silver' : l > 0.25 ? 'graphite' : 'black';
  if (h < 12 || h >= 345) return l < 0.35 ? 'crimson' : 'red';
  if (h < 28) return l < 0.45 ? 'copper' : 'ember orange';
  if (h < 45) return s > 0.45 ? (l > 0.55 ? 'warm gold' : 'amber') : 'bronze';
  if (h < 62) return s > 0.5 ? 'gold' : 'champagne';
  if (h < 90) return 'lime';
  if (h < 160) return l < 0.4 ? 'emerald' : 'green';
  if (h < 195) return 'teal';
  if (h < 225) return 'cyan blue';
  if (h < 250) return 'cobalt blue';
  if (h < 290) return 'violet';
  if (h < 330) return 'magenta';
  return 'rose';
}

/* Completa os tokens --im-* a partir de bg/text/accent. */
export function derivePalette(p = {}) {
  const light = p.theme === 'light' || (p.bg && lum(p.bg) > 0.45);
  const bg = p.bg || (light ? '#F4F0E8' : '#050505');
  const text = p.text || (light ? '#1C1A17' : '#EDEAE4');
  const accent = p.accent || '#B08D57';
  return {
    theme: light ? 'light' : 'dark',
    bg,
    surface: p.surface || mix(bg, text, light ? 0.04 : 0.045),
    text,
    muted: p.muted || rgba(text, light ? 0.66 : 0.62),
    accent,
    accent2: p.accent2 || mix(accent, '#ffffff', 0.38),
    line: p.line || rgba(text, light ? 0.14 : 0.16),
    alert: p.alert || '#FF4D3D',
  };
}

export function checkPalette(t) {
  const warn = [];
  const c1 = contrast(t.text, t.bg);
  if (c1 < 7) warn.push(`Contraste texto/fundo ${c1.toFixed(1)}:1 (ideal ≥ 7:1 para leitura confortável).`);
  const c2 = contrast(t.accent, t.bg);
  if (c2 < 3) warn.push(`O acento ${t.accent} tem contraste ${c2.toFixed(1)}:1 com o fundo; use-o em elementos grandes, não em texto pequeno.`);
  return warn;
}
