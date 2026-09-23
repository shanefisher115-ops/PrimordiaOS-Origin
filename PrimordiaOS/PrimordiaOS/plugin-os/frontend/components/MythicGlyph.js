"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MythicGlyph = MythicGlyph;
function MythicGlyph({ className = "" }) {
    return (<svg className={className} viewBox="0 0 120 120" fill="none" role="img" aria-label="PrimordiaOS glyph">
      <circle cx="60" cy="60" r="46" stroke="url(#glyph-a)" strokeWidth="2"/>
      <path d="M60 14L77 50L116 60L77 70L60 106L43 70L4 60L43 50L60 14Z" stroke="url(#glyph-b)" strokeWidth="3" strokeLinejoin="round"/>
      <circle cx="60" cy="60" r="13" fill="rgba(248,215,123,.16)" stroke="#f8d77b" strokeWidth="2"/>
      <path d="M60 34V86M34 60H86" stroke="#27d8ff" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="glyph-a" x1="14" x2="106" y1="14" y2="106">
          <stop stopColor="#27d8ff"/>
          <stop offset="1" stopColor="#ff385c"/>
        </linearGradient>
        <linearGradient id="glyph-b" x1="4" x2="116" y1="14" y2="106">
          <stop stopColor="#f8d77b"/>
          <stop offset=".5" stopColor="#27d8ff"/>
          <stop offset="1" stopColor="#ff385c"/>
        </linearGradient>
      </defs>
    </svg>);
}
