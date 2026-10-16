// Catálogo de fontes do Google com eixos válidos (pedir um peso inexistente
// derruba a folha inteira). Fontes fora do catálogo pedem só o regular.

export const FONTES = {
  'Cormorant Garamond': { axes: 'ital,wght@0,300;0,400;0,500;0,600;1,300;1,400', tipo: 'serif', fallback: "'Times New Roman', serif" },
  'Instrument Serif': { axes: 'ital@0;1', tipo: 'serif', fallback: "'Times New Roman', serif" },
  'Playfair Display': { axes: 'ital,wght@0,400;0,500;0,600;1,400', tipo: 'serif', fallback: 'Georgia, serif' },
  'Fraunces': { axes: 'ital,wght@0,300;0,400;0,600;1,400', tipo: 'serif', fallback: 'Georgia, serif' },
  'Bodoni Moda': { axes: 'ital,wght@0,400;0,500;1,400', tipo: 'serif', fallback: "'Didot', 'Times New Roman', serif" },
  'DM Serif Display': { axes: 'ital@0;1', tipo: 'serif', fallback: 'Georgia, serif' },
  'Newsreader': { axes: 'ital,wght@0,300;0,400;0,500;1,400', tipo: 'serif', fallback: 'Georgia, serif' },
  'Italiana': { axes: '', tipo: 'serif', fallback: "'Times New Roman', serif" },
  'Marcellus': { axes: '', tipo: 'serif', fallback: "'Times New Roman', serif" },
  'Inter': { axes: 'wght@300;400;500;600;700', tipo: 'sans', fallback: 'system-ui, sans-serif' },
  'Inter Tight': { axes: 'wght@300;400;500;600;700', tipo: 'sans', fallback: 'system-ui, sans-serif' },
  'Manrope': { axes: 'wght@300;400;500;600;700', tipo: 'sans', fallback: 'system-ui, sans-serif' },
  'Space Grotesk': { axes: 'wght@300;400;500;600;700', tipo: 'sans', fallback: 'system-ui, sans-serif' },
  'Sora': { axes: 'wght@300;400;600;700', tipo: 'sans', fallback: 'system-ui, sans-serif' },
  'Outfit': { axes: 'wght@300;400;500;600;700', tipo: 'sans', fallback: 'system-ui, sans-serif' },
  'Archivo': { axes: 'wdth,wght@62..125,100..900', tipo: 'sans-wide', fallback: 'system-ui, sans-serif' },
  'Unbounded': { axes: 'wght@300;400;500;600;700', tipo: 'sans-wide', fallback: 'system-ui, sans-serif' },
  'Syne': { axes: 'wght@400;500;600;700;800', tipo: 'sans-wide', fallback: 'system-ui, sans-serif' },
  'Anton': { axes: '', tipo: 'condensed', fallback: 'Impact, sans-serif' },
  'Bebas Neue': { axes: '', tipo: 'condensed', fallback: 'Impact, sans-serif' },
  'Oswald': { axes: 'wght@300;400;500;600;700', tipo: 'condensed', fallback: 'Impact, sans-serif' },
  'Barlow Condensed': { axes: 'wght@400;500;600;700;800', tipo: 'condensed', fallback: 'Impact, sans-serif' },
  'Big Shoulders Display': { axes: 'wght@400;600;800', tipo: 'condensed', fallback: 'Impact, sans-serif' },
  'JetBrains Mono': { axes: 'wght@400;500', tipo: 'mono', fallback: 'ui-monospace, monospace' },
  'IBM Plex Mono': { axes: 'wght@400;500', tipo: 'mono', fallback: 'ui-monospace, monospace' },
  'DM Mono': { axes: 'wght@300;400;500', tipo: 'mono', fallback: 'ui-monospace, monospace' },
  'Space Mono': { axes: 'wght@400;700', tipo: 'mono', fallback: 'ui-monospace, monospace' },
};

export function fontStack(name, kind) {
  const f = FONTES[name];
  const fb = f ? f.fallback : kind === 'mono' ? 'ui-monospace, monospace' : kind === 'display' ? 'Georgia, serif' : 'system-ui, sans-serif';
  return `'${String(name).replace(/'/g, '')}', ${fb}`;
}

export function fontsHref(fonts) {
  const names = [...new Set([fonts.display, fonts.body, fonts.mono].filter(Boolean))];
  if (!names.length) return null;
  const fam = names.map((n) => {
    const f = FONTES[n];
    const base = 'family=' + encodeURIComponent(n).replace(/%20/g, '+');
    return f && f.axes ? `${base}:${f.axes}` : base;
  });
  return `https://fonts.googleapis.com/css2?${fam.join('&')}&display=swap`;
}
