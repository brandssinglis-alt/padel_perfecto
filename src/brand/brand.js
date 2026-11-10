// Copied from the branding work (project files brand/kit/brand.js). covers.mjs uses cover() for per-video covers.
// Padel Perfecto brand generator. Pure functions that return SVG strings.
// Used by the options page and by the PNG export script.
(function (root) {
  const C = {
    navy: '#0b1220', navy2: '#13203a', court: '#1f6fb2', court2: '#185a92',
    cyan: '#22d3ee', yellow: '#facc15', ball: '#d9f99d', lime: '#c6f432', white: '#ffffff', mist: '#b4dcff'
  };
  const CHAPTERS = {
    'level-up':    { name: 'Level Up',    color: '#c6f432', ink: '#0b1220', sample: { n: 1, lines: ["Why you're", 'stuck at', '3.0'], hi: 2 } },
    'shot-school': { name: 'Shot School', color: '#22d3ee', ink: '#0b1220', sample: { n: 6, lines: ['The vibora:', 'where to', 'aim it'], hi: 0 } },
    'court-zones': { name: 'Court Zones', color: '#5b8cff', ink: '#0b1220', sample: { n: 1, lines: ['Lob to', 'take the', 'net'], hi: 2 } },
    'myth-or-fact':{ name: 'Myth or Fact',color: '#ff5fa2', ink: '#0b1220', sample: { n: 2, lines: ['Smash it', 'off the', 'glass?'], hi: 2 } },
    'kit-room':    { name: 'Kit Room',    color: '#ffb020', ink: '#0b1220', sample: { n: 1, lines: ['Round,', 'teardrop or', 'diamond?'], hi: 2 } }
  };
  const DISPLAY = "font-family:Archivo,'Arial Black',sans-serif;font-weight:900;font-stretch:125%";
  const DISPLAY_N = "font-family:Archivo,'Arial Black',sans-serif;font-weight:900;font-stretch:100%";
  const BODY = "font-family:Inter,system-ui,sans-serif";

  const ballSeam = (cx, cy, r, stroke) =>
    `<path d="M ${cx - r * 0.62} ${cy - r * 0.78} Q ${cx - r * 0.12} ${cy} ${cx - r * 0.62} ${cy + r * 0.78}" fill="none" stroke="${stroke}" stroke-width="${r * 0.1}" stroke-linecap="round"/>` +
    `<path d="M ${cx + r * 0.62} ${cy - r * 0.78} Q ${cx + r * 0.12} ${cy} ${cx + r * 0.62} ${cy + r * 0.78}" fill="none" stroke="${stroke}" stroke-width="${r * 0.1}" stroke-linecap="round"/>`;

  // ---------- Marks (1024 x 1024, content kept inside a centred circle) ----------
  const marks = {
    // A: the existing tilted court, cleaned up for small sizes
    court(bg = true) {
      return `${bg ? `<rect width="1024" height="1024" fill="${C.navy}"/>` : ''}
      <g transform="translate(512 512) rotate(-14) scale(0.9)">
        <rect x="-214" y="-384" width="428" height="768" rx="22" fill="none" stroke="${C.mist}" stroke-opacity="0.5" stroke-width="18"/>
        <rect x="-196" y="-366" width="392" height="732" rx="8" fill="${C.court}"/>
        <rect x="-196" y="-254" width="392" height="508" fill="${C.court2}"/>
        <g stroke="#fff" stroke-width="14" fill="none">
          <rect x="-196" y="-366" width="392" height="732" rx="8"/>
          <line x1="-196" y1="-254" x2="196" y2="-254"/><line x1="-196" y1="254" x2="196" y2="254"/>
          <line x1="0" y1="-254" x2="0" y2="254"/>
        </g>
        <line x1="-232" y1="0" x2="232" y2="0" stroke="#e5e7eb" stroke-width="22" stroke-linecap="round"/>
        <path d="M -110 222 Q 30 -250 104 -292" fill="none" stroke="${C.yellow}" stroke-width="20" stroke-dasharray="36 24" stroke-linecap="round"/>
        <circle cx="-110" cy="248" r="46" fill="${C.cyan}" stroke="#fff" stroke-width="12"/>
        <circle cx="110" cy="-300" r="44" fill="${C.ball}" stroke="${C.navy}" stroke-width="8"/>
      </g>`;
    },
    // B: just the lob. Player, arc over the net, ball. Reads at 32 px.
    lob(bg = true) {
      return `${bg ? `<rect width="1024" height="1024" fill="${C.navy}"/>` : ''}
      <rect x="150" y="612" width="724" height="120" rx="10" fill="${C.court}" opacity="0.55"/>
      <g stroke="#fff" stroke-width="10" opacity="0.35">
        ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => `<line x1="${180 + i * 60}" y1="618" x2="${180 + i * 60}" y2="726"/>`).join('')}
      </g>
      <line x1="150" y1="612" x2="874" y2="612" stroke="#fff" stroke-width="26" stroke-linecap="round"/>
      <line x1="150" y1="604" x2="150" y2="740" stroke="#fff" stroke-width="26" stroke-linecap="round"/>
      <line x1="874" y1="604" x2="874" y2="740" stroke="#fff" stroke-width="26" stroke-linecap="round"/>
      <path d="M 250 830 Q 420 120 690 300" fill="none" stroke="${C.yellow}" stroke-width="30" stroke-dasharray="52 34" stroke-linecap="round"/>
      <circle cx="250" cy="838" r="62" fill="${C.cyan}" stroke="#fff" stroke-width="16"/>
      <circle cx="728" cy="318" r="118" fill="${C.lime}"/>
      ${ballSeam(728, 318, 118, C.navy)}`;
    },
    // C: PP monogram, the second P's bowl is the ball
    pp(bg = true) {
      return `${bg ? `<rect width="1024" height="1024" fill="${C.navy}"/>` : ''}
      <g transform="translate(-20 0)">
        <path d="M 290 262 V 770" stroke="#fff" stroke-width="104" fill="none"/>
        <path d="M 238 314 H 400 A 110 110 0 0 1 400 534 H 290" stroke="${C.cyan}" stroke-width="104" fill="none"/>
        <path d="M 600 262 V 770" stroke="#fff" stroke-width="104" fill="none"/>
        <circle cx="742" cy="424" r="158" fill="${C.lime}"/>
        ${ballSeam(742, 424, 158, C.navy)}
        <path d="M 216 840 H 852" stroke="${C.yellow}" stroke-width="22" stroke-dasharray="44 28" stroke-linecap="round"/>
      </g>`;
    }
  };
  const MARK_NAMES = { court: 'A · Court', lob: 'B · Lob', pp: 'C · PP ball' };

  const svg = (w, h, inner, attrs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${attrs}>${inner}</svg>`;

  function markSvg(kind) { return svg(1024, 1024, marks[kind](true)); }

  // ---------- Chapter glyphs (drawn in a 100 x 100 box) ----------
  const glyphs = {
    'level-up': c => `<path d="M 18 62 L 50 34 L 82 62" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M 18 86 L 50 58 L 82 86" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/><circle cx="50" cy="14" r="9" fill="${c}"/>`,
    'shot-school': c => `<g transform="rotate(-35 50 50)"><rect x="28" y="6" width="44" height="54" rx="22" fill="none" stroke="${c}" stroke-width="10"/><circle cx="43" cy="26" r="3.5" fill="${c}"/><circle cx="57" cy="26" r="3.5" fill="${c}"/><circle cx="50" cy="38" r="3.5" fill="${c}"/><rect x="44" y="58" width="12" height="36" rx="5" fill="${c}"/></g>`,
    'court-zones': c => `<rect x="24" y="6" width="52" height="88" rx="4" fill="none" stroke="${c}" stroke-width="8"/><line x1="16" y1="50" x2="84" y2="50" stroke="${c}" stroke-width="8"/><rect x="28" y="54" width="44" height="18" fill="${c}"/><line x1="24" y1="28" x2="76" y2="28" stroke="${c}" stroke-width="5" opacity="0.6"/>`,
    'myth-or-fact': c => `<path d="M 14 34 Q 14 12 36 12 Q 56 12 56 30 Q 56 42 40 48 L 40 58" fill="none" stroke="${c}" stroke-width="11" stroke-linecap="round"/><circle cx="40" cy="78" r="7" fill="${c}"/><path d="M 60 70 L 72 84 L 92 56" fill="none" stroke="${c}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>`,
    'kit-room': c => `<path d="M 48 8 H 88 V 48 L 50 88 Q 46 92 42 88 L 10 56 Q 6 52 10 48 Z" fill="none" stroke="${c}" stroke-width="10" stroke-linejoin="round"/><circle cx="70" cy="27" r="7" fill="${c}"/>`
  };
  function glyph(ch, x, y, size, color) {
    return `<g transform="translate(${x} ${y}) scale(${size / 100})">${glyphs[ch](color)}</g>`;
  }

  // Faint court lines used behind covers and title cards
  function courtBackdrop(color, opacity) {
    return `<g transform="translate(700 1100) rotate(-14)" stroke="${color}" stroke-opacity="${opacity}" fill="none" stroke-width="10">
      <rect x="-520" y="-1040" width="1040" height="2080" rx="16"/>
      <line x1="-520" y1="-722" x2="520" y2="-722"/><line x1="-520" y1="722" x2="520" y2="722"/>
      <line x1="0" y1="-722" x2="0" y2="722"/><line x1="-580" y1="0" x2="580" y2="0" stroke-width="18"/>
    </g>`;
  }

  // Small mark + name, used at the foot of covers
  function signature(kind, x, y, s, textColor) {
    return `<g transform="translate(${x} ${y})">
      <g transform="scale(${s / 1024})"><clipPath id="sc-${kind}"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#sc-${kind})">${marks[kind](true)}</g></g>
      <text x="${s + 26}" y="${s * 0.47}" style="${DISPLAY}" font-size="${s * 0.36}" fill="${textColor}" dominant-baseline="middle">PADEL</text>
      <text x="${s + 26}" y="${s * 0.86}" style="${DISPLAY}" font-size="${s * 0.36}" fill="${C.lime}" dominant-baseline="middle">PERFECTO</text>
    </g>`;
  }

  // ---------- Cover (1080 x 1920) — the thumbnail people see on the grid ----------
  function cover(kind, ch, opts = {}) {
    const k = CHAPTERS[ch];
    const s = opts.sample || k.sample;
    const maxLen = Math.max(...s.lines.map(l => l.length));
    const fs = Math.min(230, Math.floor(900 / (maxLen * 0.6)));
    const top = 780 - (s.lines.length * fs * 1.02) / 2;
    const lines = s.lines.map((l, i) =>
      `<text data-fit="900" x="90" y="${top + (i + 1) * fs * 1.02}" style="${DISPLAY_N}" font-size="${fs}" letter-spacing="-3" fill="${i === s.hi ? k.color : '#fff'}">${esc(l)}</text>`).join('');
    const tag = opts.tag || `${k.name.toUpperCase()}  #${s.n}`;
    return svg(1080, 1920, `
      <rect width="1080" height="1920" fill="${C.navy}"/>
      ${courtBackdrop(k.color, 0.1)}
      <rect x="0" y="0" width="1080" height="22" fill="${k.color}"/>
      <g transform="translate(90 300)">
        <rect x="0" y="0" width="${tagWidth(tag) + 150}" height="110" rx="55" fill="${k.color}"/>
        ${glyph(ch, 30, 18, 74, k.ink)}
        <text x="124" y="57" style="${DISPLAY}" font-size="50" fill="${k.ink}" dominant-baseline="central">${esc(tag)}</text>
      </g>
      <g transform="translate(520 930) scale(0.62)" opacity="0.95">${marks.court(false)}</g>
      ${lines}
      ${signature(kind, 90, 1600, 150, '#fff')}
      ${opts.guides ? `<rect x="2" y="240" width="1076" height="1440" fill="none" stroke="#fff" stroke-opacity="0.6" stroke-width="4" stroke-dasharray="20 14"/>
      <text x="1060" y="230" text-anchor="end" style="${BODY}" font-size="30" fill="#fff" fill-opacity="0.75">Instagram grid crop (3:4)</text>` : ''}
    `);
  }
  function tagWidth(t) { return t.length * 41; }

  // ---------- Title card (1080 x 1920) — the first second of each video ----------
  function titleCard(kind, ch, opts = {}) {
    const k = CHAPTERS[ch];
    const s = opts.sample || k.sample;
    const words = k.name.toUpperCase().split(' ');
    const fs = Math.min(250, Math.floor(900 / (Math.max(...words.map(w => w.length)) * 1.02)));
    const nameLines = words.map((w, i) =>
      `<text data-fit="900" x="90" y="${560 + i * fs * 0.95}" style="${DISPLAY}" font-size="${fs}" letter-spacing="-6" fill="${k.ink}">${esc(w)}</text>`).join('');
    return svg(1080, 1920, `
      <rect width="1080" height="1920" fill="${k.color}"/>
      ${courtBackdrop(k.ink, 0.1)}
      ${glyph(ch, 90, 170, 150, k.ink)}
      ${nameLines}
      <text x="990" y="1500" text-anchor="end" style="${DISPLAY}" font-size="520" fill="none" stroke="${k.ink}" stroke-width="10" letter-spacing="-10">${String(s.n).padStart(2, '0')}</text>
      <rect x="90" y="1640" width="900" height="8" fill="${k.ink}"/>
      <text x="90" y="1740" style="${DISPLAY}" font-size="58" fill="${k.ink}">PADEL PERFECTO</text>
    `);
  }

  // ---------- YouTube banner (2560 x 1440, safe area 1546 x 423 centred) ----------
  function ytBanner(kind, opts = {}) {
    const chips = Object.keys(CHAPTERS);
    const chipW = 290, gap = 16, total = chips.length * chipW + (chips.length - 1) * gap;
    let x0 = 1280 - total / 2;
    const chipSvg = chips.map((ch, i) => {
      const k = CHAPTERS[ch], x = x0 + i * (chipW + gap);
      return `<g transform="translate(${x} 790)"><rect width="${chipW}" height="64" rx="32" fill="${k.color}"/>
        ${glyph(ch, 18, 12, 40, k.ink)}<text x="70" y="33" style="${DISPLAY_N}" font-size="23" fill="${k.ink}" dominant-baseline="central">${esc(k.name.toUpperCase())}</text></g>`;
    }).join('');
    return svg(2560, 1440, `
      <rect width="2560" height="1440" fill="${C.navy}"/>
      <g transform="translate(1900 700) rotate(-14)" stroke="${C.court}" stroke-opacity="0.45" fill="none" stroke-width="12">
        <rect x="-460" y="-920" width="920" height="1840" rx="16"/><line x1="-460" y1="-640" x2="460" y2="-640"/><line x1="-460" y1="640" x2="460" y2="640"/>
        <line x1="0" y1="-640" x2="0" y2="640"/><line x1="-520" y1="0" x2="520" y2="0" stroke-width="20"/></g>
      <g transform="translate(560 700) rotate(-14)" stroke="${C.court}" stroke-opacity="0.3" fill="none" stroke-width="12">
        <rect x="-460" y="-920" width="920" height="1840" rx="16"/><line x1="-520" y1="0" x2="520" y2="0" stroke-width="20"/></g>
      <g transform="translate(560 538) scale(${200 / 1024})"><clipPath id="yb"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#yb)">${marks[kind](true)}</g></g>
      <text x="800" y="640" style="${DISPLAY}" font-size="118" fill="#fff" letter-spacing="-2">PADEL <tspan fill="${C.lime}">PERFECTO</tspan></text>
      <text x="804" y="718" style="${BODY}" font-weight="600" font-size="46" fill="#cfe3ff">Padel tactics in 30 seconds. New videos every week.</text>
      ${chipSvg}
      ${opts.guides ? `<rect x="507" y="508" width="1546" height="423" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="4" stroke-dasharray="20 14"/>` : ''}
    `);
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  // Shrinks any <text data-fit="maxWidth"> that renders wider than its limit
  function fit(rootEl) {
    // one scale per SVG so stacked lines stay the same size
    rootEl.querySelectorAll('svg').forEach(svgEl => {
      const ts = [...svgEl.querySelectorAll('text[data-fit]')];
      if (!ts.length) return;
      const k = Math.min(1, ...ts.map(t => +t.dataset.fit / t.getComputedTextLength()));
      if (k < 1) ts.forEach(t => t.setAttribute('font-size', (+t.getAttribute('font-size') * k).toFixed(1)));
    });
  }
  // ---------- Instagram highlight cover (1080 x 1920, shown as a centred circle) ----------
  function highlight(ch) {
    const k = CHAPTERS[ch];
    return svg(1080, 1920, `<rect width="1080" height="1920" fill="${C.navy}"/>
      <circle cx="540" cy="960" r="400" fill="${k.color}"/>
      ${glyph(ch, 340, 760, 400, k.ink)}`);
  }

  // ---------- Wordmark lockup (2000 x 600) ----------
  function wordmark(kind, bg = true) {
    return svg(2000, 600, `${bg ? `<rect width="2000" height="600" fill="${C.navy}"/>` : ''}
      <g transform="translate(100 100) scale(${400 / 1024})"><clipPath id="wm"><rect width="1024" height="1024" rx="230"/></clipPath><g clip-path="url(#wm)">${marks[kind](true)}</g></g>
      <text data-fit="1360" x="560" y="290" style="${DISPLAY}" font-size="190" letter-spacing="-3" fill="#fff">PADEL</text>
      <text data-fit="1360" x="560" y="480" style="${DISPLAY}" font-size="190" letter-spacing="-3" fill="${C.lime}">PERFECTO</text>`);
  }

  root.PP = { highlight, wordmark, fit, C, CHAPTERS, marks, MARK_NAMES, markSvg, glyph, cover, titleCard, ytBanner, svg };
})(typeof window !== 'undefined' ? window : globalThis);
