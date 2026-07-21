import React, { useState } from 'react';

export const ColorPickerTool: React.FC = () => {
  const [color, setColor] = useState<string>('#3b82f6');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Muunnokset heksadesimaalista
  const hex = color.replace('#', '').toUpperCase();
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;

  // HSL-laskenta
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  const hslString = `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
  const rgbString = `rgb(${r}, ${g}, ${b})`;
  const hexString = `#${hex}`;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  return (
    <div className="p-6 bg-slate-900 text-white rounded-xl max-w-md mx-auto border border-slate-800 shadow-xl">
      <h2 className="text-xl font-bold mb-2">Point & Click Värimuunnin</h2>
      <p className="text-sm text-slate-400 mb-6">
        Klikkaa värilaatikkoa tai valitse väri avautuvasta paletista.
      </p>

      {/* Point & Click Interaktiivinen Värialue */}
      <div className="relative mb-6">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          title="Klikkaa avataksesi väripaletin"
        />
        <div
          className="w-full h-32 rounded-lg border-2 border-slate-700 shadow-inner flex items-center justify-center transition-transform hover:scale-[1.01] cursor-pointer"
          style={{ backgroundColor: color }}
        >
          <span className="bg-slate-950/70 backdrop-blur px-4 py-2 rounded-md font-mono text-sm tracking-wider shadow">
            KLIKKAA VALITAKSESI VÄRI / CLICK TO PICK
          </span>
        </div>
      </div>

      {/* Syötekenttä vaihtoehtoisesti tekstille */}
      <div className="mb-6">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          HEX-koodi / Syöte
        </label>
        <input
          type="text"
          value={color}
          onChange={(e) => {
            if (e.target.value.startsWith('#') || e.target.value.length <= 7) {
              setColor(e.target.value);
            }
          }}
          className="w-full px-4 py-2 bg-slate-950 border border-slate-700 rounded-lg font-mono text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Tulokset kopiointipainikkeilla */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
          <div>
            <span className="text-xs text-slate-500 block">HEX</span>
            <span className="font-mono text-sm">{hexString}</span>
          </div>
          <button
            onClick={() => handleCopy(hexString, 'hex')}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded transition"
          >
            {copiedKey === 'hex' ? 'Kopioitu! ✓' : 'Kopioi'}
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
          <div>
            <span className="text-xs text-slate-500 block">RGB</span>
            <span className="font-mono text-sm">{rgbString}</span>
          </div>
          <button
            onClick={() => handleCopy(rgbString, 'rgb')}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded transition"
          >
            {copiedKey === 'rgb' ? 'Kopioitu! ✓' : 'Kopioi'}
          </button>
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-950 rounded-lg border border-slate-800">
          <div>
            <span className="text-xs text-slate-500 block">HSL</span>
            <span className="font-mono text-sm">{hslString}</span>
          </div>
          <button
            onClick={() => handleCopy(hslString, 'hsl')}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs rounded transition"
          >
            {copiedKey === 'hsl' ? 'Kopioitu! ✓' : 'Kopioi'}
          </button>
        </div>
      </div>
    </div>
  );
};