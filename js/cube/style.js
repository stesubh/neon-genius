// Cube Lab styles (prefix cb-). Injected once with injectCSS('cube', CSS).
export const CSS = `
.cb-title{font-family:var(--hfont);font-weight:900;letter-spacing:.14em;font-size:14px;padding:10px 14px;border-radius:12px;background:rgba(16,8,40,.66);border:1px solid rgba(255,154,61,.45);color:#ffe0bf;text-shadow:0 0 14px rgba(255,154,61,.65);backdrop-filter:blur(8px)}
.cb-side{position:absolute;top:66px;left:14px;bottom:14px;width:332px;display:flex;flex-direction:column;padding:10px 10px 8px;pointer-events:auto;
  background:linear-gradient(160deg,rgba(28,12,62,.82),rgba(12,6,32,.8));border:1px solid rgba(190,150,255,.3);border-radius:18px;backdrop-filter:blur(12px);
  box-shadow:0 18px 60px rgba(0,0,0,.45),0 0 0 1px rgba(255,63,164,.06),inset 0 1px 0 rgba(255,255,255,.07);animation:cbIn .35s both}
@keyframes cbIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.cb-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:3px;border-radius:14px;background:rgba(0,0,0,.28);border:1px solid rgba(190,150,255,.14);margin-bottom:8px;flex:none}
.cb-tabs button{border:0;background:transparent;color:var(--mute);font-weight:800;font-size:11px;padding:6px 2px;border-radius:11px;line-height:1.15;letter-spacing:.02em;transition:background .2s,color .2s}
.cb-tabs button .i{display:block;font-size:16px;margin-bottom:2px}
.cb-tabs button:hover{color:#fff}
.cb-tabs button.on{background:linear-gradient(135deg,rgba(255,63,164,.42),rgba(139,92,255,.42));color:#fff;box-shadow:0 0 18px rgba(255,63,164,.28),inset 0 0 0 1px rgba(255,255,255,.14)}
.cb-body{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;padding:2px 4px 6px 2px;scrollbar-width:thin;scrollbar-color:rgba(190,150,255,.3) transparent}
.cb-body>*{animation:cbFade .3s both}
@keyframes cbFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.cb-h{font-family:var(--hfont);font-size:16px;letter-spacing:.05em;margin:2px 0 4px;line-height:1.3}
.cb-h small{display:block;font-family:var(--bfont);font-size:11px;letter-spacing:.14em;color:var(--mute);text-transform:uppercase;margin-bottom:3px}
.cb-p{font-size:13.5px;line-height:1.5;color:#e7dfff;margin:6px 0}
.cb-p b{color:#fff}
.cb-p code,.cb-alg{font-family:var(--hfont);font-weight:700;color:var(--cyan);letter-spacing:.02em}
.cb-lbl{font-family:var(--hfont);font-size:9.5px;letter-spacing:.2em;color:var(--mute);text-transform:uppercase;margin:12px 0 6px;display:flex;align-items:center;gap:8px}
.cb-lbl::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,rgba(190,150,255,.3),transparent)}
.cb-goal{position:relative;padding:10px 12px 10px 14px;border-radius:12px;background:linear-gradient(120deg,rgba(62,240,255,.14),rgba(139,92,255,.12));border:1px solid rgba(62,240,255,.35);font-size:14px;line-height:1.45;font-weight:600;color:#fff;margin:8px 0}
.cb-goal::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:3px;background:var(--cyan);box-shadow:0 0 10px var(--cyan)}
.cb-look{padding:9px 11px;border-radius:12px;background:rgba(255,210,63,.1);border:1px solid rgba(255,210,63,.4);font-size:13px;line-height:1.45;color:#fff3c4;margin:8px 0}
.cb-how{margin:4px 0 0;padding:0;list-style:none;counter-reset:h}
.cb-how li{counter-increment:h;position:relative;padding:4px 0 4px 26px;font-size:13px;line-height:1.45;color:#e2d8ff}
.cb-how li::before{content:counter(h);position:absolute;left:0;top:5px;width:18px;height:18px;border-radius:50%;background:rgba(139,92,255,.35);color:#fff;font-size:10.5px;font-weight:800;display:grid;place-items:center}
.cb-row{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
.cb-row .btn{flex:1;padding:10px 8px;font-size:13px;white-space:nowrap}
.cb-row .btn.ghost{background:rgba(255,255,255,.04)}
.cb-steps{display:flex;gap:6px;margin:4px 0 8px}
.cb-steps span{flex:1;text-align:center;font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;padding:5px 0;border-radius:999px;background:rgba(255,255,255,.05);color:var(--mute);border:1px solid transparent}
.cb-steps span.on{background:rgba(255,63,164,.2);color:#fff;border-color:rgba(255,63,164,.55);box-shadow:0 0 12px rgba(255,63,164,.3)}
.cb-steps span.ok{color:var(--green);background:rgba(61,255,154,.1)}
.cb-lessons{display:grid;gap:6px}
.cb-les{position:relative;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:13px;border:1px solid rgba(190,150,255,.16);background:rgba(20,10,50,.55);color:var(--ink);text-align:left;width:100%;transition:transform .12s,border-color .2s,background .2s}
.cb-les:hover{transform:translateX(3px);border-color:rgba(62,240,255,.5);background:rgba(40,20,90,.6)}
.cb-les .n{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-family:var(--hfont);font-weight:900;font-size:12px;background:rgba(255,255,255,.06);border:1px solid rgba(190,150,255,.3);flex:none}
.cb-les.done .n{background:var(--green);color:#062014;border-color:transparent;box-shadow:0 0 12px rgba(61,255,154,.5)}
.cb-les.next{border-color:rgba(255,210,63,.65);box-shadow:0 0 18px rgba(255,210,63,.16);background:rgba(50,30,40,.55)}
.cb-les .tx{flex:1;min-width:0}
.cb-les b{display:block;font-size:13.5px}
.cb-les span{display:block;font-size:11.5px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cb-les .tag{font-size:9px;font-weight:800;letter-spacing:.1em;color:#1a0f00;background:var(--yellow);padding:2px 7px;border-radius:999px;flex:none}
.cb-hero{position:relative;padding:12px;border-radius:16px;margin:2px 0 6px;background:linear-gradient(135deg,rgba(255,63,164,.22),rgba(62,240,255,.12));border:1px solid rgba(255,63,164,.45);box-shadow:0 0 26px rgba(255,63,164,.16)}
.cb-hero b{font-family:var(--hfont);font-size:14px;letter-spacing:.05em}
.cb-hero p{margin:4px 0 0;font-size:12.5px;color:#eadfff;line-height:1.4}
.cb-meter{display:flex;align-items:center;gap:10px;margin:2px 0 10px}
.cb-meter .bar{flex:1;height:7px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden}
.cb-meter .bar i{display:block;height:100%;border-radius:9px;background:linear-gradient(90deg,var(--pink),var(--yellow));box-shadow:0 0 10px rgba(255,63,164,.6);transition:width .6s}
.cb-meter b{font-family:var(--hfont);font-size:12px;color:#fff}
.cb-chips{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}
.cb-mv{font-family:var(--hfont);font-weight:700;font-size:13px;min-width:34px;text-align:center;padding:6px 6px;border-radius:9px;background:rgba(255,255,255,.06);border:1px solid rgba(190,150,255,.25);transition:all .2s}
.cb-mv.done{opacity:.5;border-color:rgba(61,255,154,.5);color:var(--green)}
.cb-mv.cur{border-color:var(--yellow);color:#1b1200;background:var(--yellow);box-shadow:0 0 16px rgba(255,210,63,.65)}
.cb-mv.fix{border-color:var(--red);color:#ffc3c9;background:rgba(255,77,94,.18)}
.cb-mv.fix.cur{background:var(--red);color:#fff;box-shadow:0 0 16px rgba(255,77,94,.65)}
.cb-next{display:flex;align-items:center;gap:12px;padding:9px 12px;border-radius:14px;background:rgba(255,210,63,.08);border:1px solid rgba(255,210,63,.35);margin:8px 0}
.cb-next .m{font-family:var(--hfont);font-weight:900;font-size:28px;color:var(--yellow);text-shadow:0 0 18px rgba(255,210,63,.6);min-width:56px;text-align:center}
.cb-next .d{font-size:13px;line-height:1.35;color:#fff}
.cb-next .d small{display:block;color:var(--mute);font-size:11.5px}
.cb-stage{display:flex;gap:4px;margin:6px 0 8px}
.cb-stage i{flex:1;height:6px;border-radius:6px;background:rgba(255,255,255,.08)}
.cb-stage i.ok{background:var(--green);box-shadow:0 0 8px rgba(61,255,154,.6)}
.cb-stage i.on{background:var(--yellow);box-shadow:0 0 10px rgba(255,210,63,.7);animation:cbBlink 1.2s infinite}
@keyframes cbBlink{50%{opacity:.55}}
.cb-q{display:grid;gap:7px;margin-top:8px}
.cb-q button{text-align:left;padding:11px 12px;font-size:14px}
.cb-q button.ok{background:rgba(61,255,154,.25);border-color:var(--green)}
.cb-q button.no{background:rgba(255,77,94,.25);border-color:var(--red)}
.cb-fact{font-size:12.5px;color:#d9ccff;line-height:1.45;margin-top:8px;padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04)}
.cb-faces{display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:8px 0}
.cb-faces button{padding:9px 0;font-family:var(--hfont);font-size:15px}
.cb-pad{position:absolute;bottom:12px;left:calc(50% + 173px);transform:translateX(-50%);width:min(500px,calc(100% - 380px));padding:8px;display:flex;flex-direction:column;gap:5px;pointer-events:auto;
  background:rgba(14,7,36,.72);border:1px solid rgba(190,150,255,.25);border-radius:16px;backdrop-filter:blur(10px);transition:opacity .2s}
.cb-pad .g{display:grid;grid-template-columns:repeat(6,1fr);gap:5px}
.cb-pad .r{display:grid;grid-template-columns:auto repeat(9,1fr);gap:4px;align-items:center}
.cb-pad .r em{font-style:normal;font-size:9.5px;font-weight:800;letter-spacing:.08em;color:#ff9ad0;text-transform:uppercase;padding:0 4px;line-height:1.1}
.cb-pad button{position:relative;padding:8px 0 9px;font-family:var(--hfont);font-size:14px;font-weight:700;border-radius:10px;border:1px solid rgba(190,150,255,.22);background:rgba(34,16,76,.85);color:#fff;transition:transform .08s,background .15s}
.cb-pad button:hover{background:rgba(70,30,140,.9)}
.cb-pad button:active{transform:scale(.94)}
.cb-pad button::after{content:'';position:absolute;left:32%;right:32%;bottom:3px;height:3px;border-radius:3px;background:var(--fc,transparent);opacity:.9}
.cb-pad .r button{font-size:12px;padding:6px 0;background:rgba(66,16,66,.75);border-color:rgba(255,63,164,.3)}
.cb-pad button.hot{border-color:var(--yellow);color:#1b1200;background:var(--yellow);animation:cbHot 1s infinite;z-index:1}
@keyframes cbHot{0%,100%{box-shadow:0 0 6px rgba(255,210,63,.4)}50%{box-shadow:0 0 0 4px rgba(255,210,63,.18),0 0 26px rgba(255,210,63,.85)}}
.cb-pad.off button{opacity:.5;pointer-events:none}
.cb-pad.off button.hot{opacity:1}
.cb-status{position:absolute;top:14px;left:calc(50% + 173px);transform:translateX(-50%);padding:7px 20px 8px;text-align:center;font-family:var(--hfont);font-size:26px;font-weight:900;border-radius:14px;
  background:rgba(14,7,36,.66);border:1px solid rgba(190,150,255,.25);backdrop-filter:blur(8px);white-space:nowrap;max-width:calc(100% - 520px);overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 16px rgba(139,92,255,.7)}
.cb-status small{display:block;font-family:var(--bfont);font-size:10.5px;font-weight:700;color:var(--mute);letter-spacing:.14em;text-transform:uppercase;margin-top:1px}
.cb-status.sm{font-size:15px;letter-spacing:.08em}
.cb-view{position:absolute;top:70px;right:14px;display:flex;flex-direction:column;gap:6px;pointer-events:auto}
.cb-view button{width:40px;height:40px;border-radius:12px;border:1px solid rgba(190,150,255,.3);background:rgba(16,8,40,.7);color:#fff;font-size:17px;backdrop-filter:blur(8px)}
.cb-view button:hover{border-color:var(--cyan)}
.cb-ans{position:absolute;bottom:16px;left:calc(50% + 173px);transform:translateX(-50%);display:grid;grid-template-columns:repeat(4,1fr);gap:10px;width:min(520px,calc(100% - 380px));pointer-events:auto}
.cb-ans button{font-family:var(--hfont);font-size:22px;padding:15px 0}
.cb-ans button.ok{background:rgba(61,255,154,.3);border-color:var(--green)}
.cb-ans button.no{background:rgba(255,77,94,.3);border-color:var(--red)}
.cb-algs{display:grid;gap:6px;margin:8px 0}
.cb-algs button{text-align:left;font-size:13px;padding:8px 10px;display:flex;flex-direction:column;gap:2px}
.cb-algs button code{color:var(--cyan);font-family:var(--hfont);font-size:11.5px;font-weight:700}
.cb-algs .grp{font-size:10px;letter-spacing:.16em;color:var(--mute);text-transform:uppercase;margin-top:6px}
.cb-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:min(210px,100%);margin:8px auto;padding:8px;border-radius:14px;background:#0b0816;border:1px solid rgba(190,150,255,.25)}
.cb-grid button{aspect-ratio:1;border-radius:9px;border:2px solid rgba(255,255,255,.12);background:var(--c,#2a2440);box-shadow:inset 0 -6px 12px rgba(0,0,0,.25)}
.cb-grid button.ctr{cursor:default;outline:2px dashed rgba(255,255,255,.35);outline-offset:-6px}
.cb-grid button.bad{border-color:var(--red);box-shadow:0 0 14px var(--red)}
.cb-pal{display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin:6px 0}
.cb-pal button{position:relative;height:40px;border-radius:10px;border:2px solid rgba(255,255,255,.15);background:var(--c)}
.cb-pal button.on{border-color:#fff;box-shadow:0 0 0 3px rgba(62,240,255,.6),0 0 16px rgba(62,240,255,.5);transform:translateY(-2px)}
.cb-pal button i{position:absolute;bottom:-1px;right:2px;font-style:normal;font-size:9.5px;font-weight:800;color:#000;background:rgba(255,255,255,.8);border-radius:6px;padding:0 3px}
.cb-dots{display:flex;gap:5px;justify-content:center;margin:4px 0}
.cb-dots i{width:22px;height:22px;border-radius:7px;background:var(--c);opacity:.35;border:2px solid transparent}
.cb-dots i.on{opacity:1;border-color:#fff;box-shadow:0 0 10px rgba(255,255,255,.5)}
.cb-dots i.ok{opacity:.85}
.cb-err{font-size:13px;line-height:1.45;color:#ffd0d5;background:rgba(255,77,94,.14);border:1px solid rgba(255,77,94,.5);border-radius:10px;padding:8px 10px;margin:8px 0}
.cb-win{text-align:center;padding:6px 0}
.cb-win .big{font-size:46px;line-height:1;margin:6px 0;filter:drop-shadow(0 0 16px rgba(255,210,63,.6));animation:cbBump .6s both}
@keyframes cbBump{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
.cb-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:10px 0}
.cb-stats div{background:rgba(255,255,255,.05);border-radius:10px;padding:8px 4px;text-align:center}
.cb-stats b{display:block;font-family:var(--hfont);font-size:17px}
.cb-stats span{font-size:10.5px;color:var(--mute)}
.cb-pop{position:absolute;left:calc(50% + 173px);top:30%;transform:translate(-50%,-50%);font-family:var(--hfont);font-weight:900;font-size:clamp(28px,5vw,52px);letter-spacing:.06em;color:#fff;
  text-shadow:0 0 18px var(--pink),0 0 44px rgba(255,63,164,.7);pointer-events:none;opacity:0;white-space:nowrap}
.cb-pop.go{animation:cbPop 1.6s both}
@keyframes cbPop{0%{opacity:0;transform:translate(-50%,-50%) scale(.5)}18%{opacity:1;transform:translate(-50%,-50%) scale(1.08)}30%{transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-62%) scale(1)}}
.cb-toast{position:absolute;left:calc(50% + 173px);bottom:var(--cb-toastb,190px);transform:translate(-50%,16px);width:min(520px,calc(100% - 380px));padding:10px 14px;border-radius:14px;background:rgba(12,6,32,.92);border:1px solid var(--line);font-size:14px;line-height:1.45;opacity:0;transition:opacity .25s,transform .25s;text-align:center;pointer-events:none;z-index:3}
.cb-toast.show{opacity:1;transform:translate(-50%,0)}
.cb-toast.good{border-color:var(--green);box-shadow:0 0 24px rgba(61,255,154,.25)}
.cb-toast.bad{border-color:var(--red);box-shadow:0 0 24px rgba(255,77,94,.25)}
.cb-words{display:flex;gap:4px;align-items:center;font-size:11px;color:var(--mute);margin:0 0 6px}
.cb-words button{padding:3px 9px;border-radius:999px;border:1px solid rgba(190,150,255,.3);background:transparent;color:var(--mute);font-size:11px;font-weight:700}
.cb-words button.on{background:rgba(62,240,255,.18);color:#fff;border-color:var(--cyan)}
.cb-cfop{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}
.cb-cfop div{padding:8px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(190,150,255,.16);font-size:11.5px;line-height:1.35;color:#d9ccff}
.cb-cfop b{display:block;font-family:var(--hfont);font-size:12px;color:#fff;margin-bottom:2px}
@media (max-width:800px){
  .cb-title{display:none}
  .cb-side{top:auto;left:8px;right:8px;width:auto;bottom:calc(var(--cb-padh,0px) + 10px);max-height:calc(100% - var(--cb-padh,0px) - 340px);min-height:150px;padding:8px 8px 6px;border-radius:16px}
  .cb-tabs button{font-size:10px;padding:4px 1px}
  .cb-tabs button .i{font-size:14px;margin-bottom:0}
  .cb-pad{left:8px;right:8px;width:auto;transform:none;bottom:8px;padding:6px}
  .cb-pad button{padding:7px 0 8px;font-size:13px}
  .cb-pad .r button{font-size:11px;padding:5px 0}
  .cb-pad .r em{display:none}
  .cb-pad .r{grid-template-columns:repeat(9,1fr)}
  .cb-status{top:62px;left:50%;font-size:18px;padding:5px 14px 6px;max-width:calc(100% - 120px)}
  .cb-status.sm{font-size:12px}
  .cb-status small{font-size:9px}
  .cb-view{top:62px;right:8px}
  .cb-view button{width:36px;height:36px;font-size:15px}
  .cb-ans{left:8px;right:8px;width:auto;transform:none;bottom:8px;gap:6px}
  .cb-ans button{font-size:18px;padding:12px 0}
  .cb-pop{left:50%;top:22%}
  .cb-toast{left:8px;right:8px;width:auto;transform:translateY(16px);top:108px;bottom:auto}
  .cb-toast.show{transform:none}
  .cb-grid{width:min(156px,100%);gap:5px;padding:6px;margin:6px auto}
  .cb-pal button{height:34px}
}
`;
