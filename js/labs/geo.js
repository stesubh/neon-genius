// Planet Earth: a 3D globe to explore countries, a Find It game, capitals and flags rounds, an India explorer
// with states and union territories, and Earth science (layers, day and night, seasons, climate zones, plates).
// Uses the shared lab shell (./physics/kit.js) for the HUD, level switch, missions and the quiz.
import * as THREE from 'three';
import { createLab } from './physics/kit.js';
import { injectCSS } from '../utils.js';
import { FLAG_FONT_URL } from './geo/data.js';
import { createExplorer } from './geo/explorer.js';
import { createFind } from './geo/find.js';
import { createFlags } from './geo/flags.js';
import { createIndia } from './geo/india.js';
import { createScience } from './geo/science.js';
import { QUIZ } from './geo/quiz.js';

const CSS = `
@font-face{font-family:'GeoFlags';src:url('${FLAG_FONT_URL}') format('woff2');unicode-range:U+1F1E6-1F1FF,U+1F3F4,U+E0062-E007F;font-display:swap}
.ge-flag{font-family:'GeoFlags','Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif;font-style:normal;line-height:1}
.ge-search{position:relative;margin:8px 0 6px}
.ge-search input{width:100%;box-sizing:border-box;padding:10px 12px 10px 34px;border-radius:12px;border:1px solid var(--line);background:rgba(8,4,30,.7);color:#fff;font:600 14px var(--bfont);outline:none}
.ge-search input:focus{border-color:var(--lc);box-shadow:0 0 14px color-mix(in srgb,var(--lc) 35%,transparent)}
.ge-search:before{content:'🔎';position:absolute;left:11px;top:10px;font-size:14px;opacity:.8}
.ge-res{display:grid;gap:4px;margin-top:6px}
.ge-res button{display:flex;align-items:center;gap:8px;text-align:left;padding:7px 10px;border-radius:10px;border:1px solid var(--line);background:rgba(20,10,50,.75);color:#fff;font-size:13px}
.ge-res button:hover,.ge-res button:first-child{border-color:var(--lc)}
.ge-res small{margin-left:auto;color:var(--mute);font-size:11px}
.ge-card{margin-top:10px;padding:12px;border-radius:14px;border:1px solid color-mix(in srgb,var(--lc) 55%,transparent);background:linear-gradient(160deg,rgba(61,220,132,.13),rgba(20,10,50,.55));animation:rise .3s both}
.ge-card .hd{display:flex;align-items:center;gap:10px}
.ge-card .hd .ge-flag{font-size:42px}
.ge-card h3{margin:0;font-family:var(--hfont);font-size:17px;letter-spacing:.03em;color:#fff}
.ge-card .of{font-size:11.5px;color:var(--mute)}
.ge-card dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:10px 0 6px;font-size:13px}
.ge-card dt{color:var(--mute);font-weight:700;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;padding-top:1px}
.ge-card dd{margin:0;color:#fff;font-weight:600}
.ge-card .fact{font-size:13px;line-height:1.45;color:#e9e1ff;background:rgba(255,210,63,.09);border-left:3px solid var(--yellow);padding:7px 9px;border-radius:8px;margin-top:6px}
.ge-card .nbs{display:flex;flex-wrap:wrap;gap:4px;margin-top:4px}
.ge-card .nbs button{padding:4px 8px;border-radius:999px;border:1px solid var(--line);background:rgba(20,10,50,.7);color:#fff;font-size:11.5px}
.ge-card .nbs button:hover{border-color:var(--lc)}
.ge-tag{display:inline-block;font-size:10px;font-weight:800;letter-spacing:.1em;padding:2px 8px;border-radius:999px;background:rgba(62,240,255,.16);color:var(--cyan);margin-right:4px;text-transform:uppercase}
.ge-tip{position:absolute;z-index:4;pointer-events:none;padding:6px 11px;border-radius:10px;background:rgba(8,4,30,.85);border:1px solid rgba(62,240,255,.45);color:#fff;font-weight:700;font-size:13px;white-space:nowrap;transform:translate(14px,-50%);box-shadow:0 0 18px rgba(62,240,255,.25);display:none}
.ge-tip .ge-flag{font-size:16px;margin-right:6px;vertical-align:-2px}
.ge-big{display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:rgba(8,4,30,.6);border:1px solid var(--line);margin:8px 0}
.ge-big .ge-flag{font-size:46px}
.ge-big b{font-family:var(--hfont);font-size:18px;color:#fff;display:block;letter-spacing:.03em}
.ge-big span{font-size:12px;color:var(--mute)}
.ge-flagq{font-size:96px;text-align:center;line-height:1.1;margin:6px 0;filter:drop-shadow(0 0 18px rgba(255,255,255,.18))}
.ge-qt{font-family:var(--hfont);font-size:16px;text-align:center;color:#fff;margin:6px 0 10px;line-height:1.35}
.ge-opts{display:grid;gap:7px}
.ge-opts button{display:flex;align-items:center;gap:10px;padding:11px 12px;border-radius:12px;border:1px solid var(--line);background:rgba(20,10,50,.75);color:#fff;font-size:14.5px;font-weight:700;text-align:left;transition:all .12s}
.ge-opts button kbd{font:800 11px var(--hfont);color:var(--mute);border:1px solid var(--line);border-radius:6px;padding:2px 6px}
.ge-opts button:hover:not(:disabled){border-color:var(--lc);transform:translateX(2px)}
.ge-opts button.ok{border-color:var(--green);background:rgba(61,255,154,.18)}
.ge-opts button.no{border-color:var(--red);background:rgba(255,77,94,.18)}
.ge-fb{margin-top:10px;padding:9px 11px;border-radius:12px;font-size:13.5px;line-height:1.45;background:rgba(61,255,154,.1);border:1px solid rgba(61,255,154,.4)}
.ge-fb.bad{background:rgba(255,77,94,.1);border-color:rgba(255,77,94,.45)}
.ge-row{display:flex;gap:8px;margin-top:10px}
.ge-row .btn{flex:1}
.ge-score{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:8px 0}
.ge-score div{background:rgba(8,4,30,.6);border:1px solid var(--line);border-radius:12px;padding:7px;text-align:center}
.ge-score small{display:block;font-size:10px;color:var(--mute);letter-spacing:.12em;font-weight:800}
.ge-score b{font-family:var(--hfont);font-size:18px;color:#fff}
.ge-dots{display:flex;gap:4px;justify-content:center;margin:6px 0}
.ge-dots i{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.15)}
.ge-dots i.ok{background:var(--green);box-shadow:0 0 8px var(--green)}
.ge-dots i.no{background:var(--red)}
.ge-dots i.cur{background:var(--yellow);box-shadow:0 0 8px var(--yellow)}
.ge-legend{display:grid;gap:5px;margin:8px 0}
.ge-legend button{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:11px;border:1px solid var(--line);background:rgba(20,10,50,.7);color:#fff;font-size:13px;font-weight:700;text-align:left}
.ge-legend button i{width:14px;height:14px;border-radius:4px;flex:none}
.ge-legend button.on{border-color:var(--yellow);box-shadow:0 0 12px rgba(255,210,63,.25)}
.ge-legend button span{margin-left:auto;font-size:11px;color:var(--mute);font-weight:600}
.ge-info{margin-top:8px;padding:10px 12px;border-radius:12px;background:rgba(8,4,30,.6);border:1px solid color-mix(in srgb,var(--lc) 45%,transparent);font-size:13.5px;line-height:1.5;color:#ece4ff;animation:rise .25s both}
.ge-info b{color:#fff}
.ge-info h4{margin:0 0 4px;font-family:var(--hfont);font-size:14px;color:#fff;letter-spacing:.04em}
@media (max-width:800px){.ge-flagq{font-size:64px}.ge-card .hd .ge-flag{font-size:34px}.ge-opts button{padding:9px 10px;font-size:13.5px}}
`;

export function createGeoLab(app) {
  injectCSS('geo', CSS);
  const mode = createLab(app, {
    id: 'geo',
    qidPrefix: 'geo',
    subject: 'geography',
    title: 'Planet Earth',
    icon: '🌍',
    color: '#3ddc84',
    quiz: QUIZ,
    experiences: [createExplorer, createFind, createFlags, createIndia, createScience],
    startFor: { kids: 'globe', middle: 'globe', high: 'globe', adult: 'globe' },
    bloom: { s: 0.55, t: 0.78, r: 0.42 },
    music: 'learn',
  });
  const { scene } = mode;
  scene.background = new THREE.Color(0x04021a);
  scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x2a1450, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.7);
  sun.position.set(20, 40, 30);
  scene.add(sun);
  return mode;
}
