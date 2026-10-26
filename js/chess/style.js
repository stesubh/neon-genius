export const CSS = `
.ch-title{font-family:var(--hfont);font-weight:900;letter-spacing:.14em;font-size:14px;padding:10px 14px;border-radius:12px;background:rgba(16,8,40,.66);border:1px solid rgba(255,210,63,.35);color:#ffe9a8;text-shadow:0 0 14px rgba(255,210,63,.55);backdrop-filter:blur(8px)}
.ch-crumb{font-size:13px}
.ch-side{position:absolute;top:66px;left:14px;width:332px;max-height:calc(100% - 80px);overflow-y:auto;overflow-x:hidden;padding:14px 14px 16px;scrollbar-width:thin;animation:chIn .35s both}
@keyframes chIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.ch-h{font-family:var(--hfont);font-size:18px;letter-spacing:.08em;margin:0 0 4px;line-height:1.25}
.ch-sub{color:var(--mute);font-size:13px;line-height:1.45;margin:0 0 12px}
.ch-lbl{font-family:var(--hfont);font-size:10.5px;letter-spacing:.18em;color:var(--mute);margin:14px 0 7px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center}
.ch-cards{display:grid;gap:10px}
.ch-card{--cc:#ffd23f;position:relative;display:flex;align-items:center;gap:12px;text-align:left;padding:12px 14px;border-radius:16px;border:1px solid var(--line);background:rgba(20,10,50,.72);color:var(--ink);transition:transform .15s,border-color .15s,box-shadow .2s;width:100%;animation:rise .45s both;animation-delay:calc(var(--i,0) * 60ms)}
.ch-card:hover{transform:translateY(-2px);border-color:var(--cc);box-shadow:0 8px 28px color-mix(in srgb,var(--cc) 30%,transparent)}
.ch-card .ic{width:46px;height:46px;border-radius:14px;display:grid;place-items:center;font-size:24px;background:color-mix(in srgb,var(--cc) 18%,rgba(10,4,30,.6));border:1px solid color-mix(in srgb,var(--cc) 55%,transparent);box-shadow:0 0 16px color-mix(in srgb,var(--cc) 35%,transparent);flex:none}
.ch-card .tx{flex:1;min-width:0}
.ch-card b{display:block;font-family:var(--hfont);font-size:14.5px;letter-spacing:.03em}
.ch-card span{display:block;font-size:12.5px;color:var(--mute);margin-top:2px;line-height:1.35}
.ch-card .pbar{height:5px;border-radius:9px;background:rgba(255,255,255,.08);margin-top:7px;overflow:hidden}
.ch-card .pbar i{display:block;height:100%;background:linear-gradient(90deg,var(--cc),#fff);border-radius:9px}
.ch-card .tag{position:absolute;top:8px;right:10px;font-size:9.5px;font-weight:800;letter-spacing:.1em;color:#100626;background:var(--cc);padding:2px 7px;border-radius:999px}
.ch-suggest{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;margin:0 0 12px;background:linear-gradient(120deg,rgba(255,210,63,.18),rgba(255,63,164,.12));border:1px solid rgba(255,210,63,.45);font-size:13px;line-height:1.4}
.ch-suggest .e{font-size:22px}
.ch-suggest .btn{margin-left:auto;padding:8px 12px;flex:none}
.ch-resume{border-color:var(--green)!important}
.ch-lessons{display:flex;flex-direction:column;gap:6px}
.ch-grp{font-family:var(--hfont);font-size:10.5px;letter-spacing:.16em;color:var(--mute);margin:12px 2px 2px;text-transform:uppercase}
.ch-les{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:12px;border:1px solid var(--line);background:rgba(20,10,50,.6);color:var(--ink);text-align:left;font-size:13.5px;font-weight:600;transition:all .15s;width:100%}
.ch-les:hover{border-color:var(--cyan);transform:translateX(3px)}
.ch-les .n{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;font-size:15px;background:rgba(255,255,255,.07);flex:none}
.ch-les .st{margin-left:auto;font-size:13px;flex:none}
.ch-les.done .n{background:rgba(61,255,154,.18);box-shadow:0 0 10px rgba(61,255,154,.3)}
.ch-les.next{border-color:var(--yellow);background:rgba(255,210,63,.12);box-shadow:0 0 18px rgba(255,210,63,.2)}
.ch-les.locked{opacity:.55}
.ch-prog{height:8px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;margin:8px 0 4px}
.ch-prog i{display:block;height:100%;background:linear-gradient(90deg,var(--pink),var(--yellow));box-shadow:0 0 10px var(--pink);border-radius:9px;transition:width .5s}
.ch-lhead{display:flex;gap:12px;align-items:center;margin-bottom:10px}
.ch-licon{width:50px;height:50px;border-radius:15px;display:grid;place-items:center;font-size:28px;background:rgba(255,210,63,.14);border:1px solid rgba(255,210,63,.5);box-shadow:0 0 18px rgba(255,210,63,.3);flex:none}
.ch-lhead small{font-size:10.5px;letter-spacing:.16em;color:var(--mute);font-family:var(--hfont)}
.ch-lhead h3{margin:2px 0 0;font-family:var(--hfont);font-size:17px;letter-spacing:.03em}
.ch-phases{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin:0 0 12px}
.ch-phases i{font-style:normal;text-align:center;font-size:10.5px;font-weight:800;letter-spacing:.08em;padding:5px 0;border-radius:8px;background:rgba(255,255,255,.06);color:var(--mute);text-transform:uppercase}
.ch-phases i.on{background:linear-gradient(135deg,var(--pink),var(--violet));color:#fff;box-shadow:0 0 14px rgba(255,63,164,.4)}
.ch-phases i.done{background:rgba(61,255,154,.16);color:var(--green)}
.ch-say{font-size:15.5px;line-height:1.5;margin:4px 0 10px}
.ch-say p{margin:0 0 8px;animation:rise .35s both}
.ch-say p.old{color:var(--mute);font-size:14px}
.ch-say b{color:var(--yellow)}
.ch-task{padding:12px;border-radius:14px;background:rgba(62,240,255,.08);border:1px solid rgba(62,240,255,.35);font-size:15px;line-height:1.45;font-weight:600;animation:rise .35s both}
.ch-task .goal{display:block;font-size:10.5px;letter-spacing:.16em;color:var(--cyan);font-family:var(--hfont);margin-bottom:5px}
.ch-meter{display:flex;gap:8px;align-items:center;margin:10px 0 2px;font-size:13px;color:var(--mute)}
.ch-meter b{color:#fff;font-family:var(--hfont)}
.ch-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.ch-row .btn{flex:1;padding:10px 8px;font-size:13.5px;min-width:88px}
.ch-coach{position:absolute;bottom:18px;left:50%;transform:translate(-50%,16px);max-width:min(520px,calc(100% - 32px));display:flex;gap:10px;align-items:center;padding:10px 14px 10px 10px;border-radius:16px;background:rgba(12,6,32,.9);border:1px solid var(--line);font-size:14.5px;line-height:1.4;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;z-index:3}
.ch-coach.show{opacity:1;transform:translate(-50%,0)}
.ch-coach .av{font-size:24px;width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.07);flex:none;box-shadow:none}
.ch-coach.good{border-color:var(--green);box-shadow:0 0 24px rgba(61,255,154,.25)}
.ch-coach.bad{border-color:var(--red);box-shadow:0 0 24px rgba(255,77,94,.25)}
.ch-coach.tip{border-color:var(--yellow);box-shadow:0 0 24px rgba(255,210,63,.22)}
.ch-coach b{color:var(--yellow)}
.ch-center{position:absolute;top:56px;bottom:0;left:360px;right:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:4;padding:16px}
.ch-center:empty{display:none}
.ch-ov{pointer-events:auto;width:min(520px,100%);max-height:100%;overflow-y:auto;padding:24px 24px 20px;text-align:center;animation:chPop .4s cubic-bezier(.2,.9,.3,1.2) both;box-shadow:0 20px 70px rgba(0,0,0,.5)}
@keyframes chPop{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}
.ch-ov h2{font-family:var(--hfont);font-size:24px;margin:4px 0 8px;letter-spacing:.04em}
.ch-ov .big{font-size:52px;line-height:1;margin-bottom:6px;filter:drop-shadow(0 0 18px rgba(255,210,63,.6))}
.ch-ov p{color:#e6dcff;font-size:15.5px;line-height:1.5;margin:6px 0}
.ch-ov .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:18px}
.ch-ov .row .btn{padding:12px 18px;font-size:14.5px}
.ch-take{font-size:19px!important;font-weight:700;color:#fff!important;padding:14px 16px;border-radius:14px;background:rgba(255,210,63,.1);border:1px solid rgba(255,210,63,.45);margin:12px 0!important}
.ch-q{font-size:19px;font-weight:800;line-height:1.35;margin:8px 0 16px}
.ch-ans{display:grid;gap:9px}
.ch-ans button{text-align:left;padding:13px 15px;border-radius:13px;border:1px solid var(--line);background:rgba(30,14,70,.75);color:#fff;font-size:15.5px;font-weight:600;transition:all .15s;display:flex;gap:10px;align-items:center}
.ch-ans button kbd{font-family:var(--hfont);font-size:12px;width:26px;height:26px;display:grid;place-items:center;border-radius:8px;background:rgba(255,255,255,.1);flex:none}
.ch-ans button:hover:not([disabled]){border-color:var(--cyan);transform:translateX(4px)}
.ch-ans button.ok{border-color:var(--green);background:rgba(61,255,154,.2)}
.ch-ans button.no{border-color:var(--red);background:rgba(255,77,94,.2)}
.ch-fact{margin-top:14px;padding:12px 14px;border-radius:13px;background:rgba(255,255,255,.06);text-align:left;font-size:14.5px;line-height:1.5;animation:rise .3s both}
.ch-dots{display:flex;gap:6px;justify-content:center;margin-bottom:6px}
.ch-dots i{width:8px;height:8px;border-radius:9px;background:rgba(255,255,255,.18)}
.ch-dots i.on{background:var(--cyan);width:22px}
.ch-dots i.ok{background:var(--green)}
.ch-dots i.no{background:var(--red)}
.ch-levels{display:grid;gap:7px}
.ch-lv{--cc:#3ef0ff;display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:13px;border:1px solid var(--line);background:rgba(20,10,50,.65);color:#fff;text-align:left;transition:all .15s;width:100%}
.ch-lv .e{font-size:22px;width:34px;text-align:center}
.ch-lv b{font-family:var(--hfont);font-size:13.5px;letter-spacing:.04em}
.ch-lv small{display:block;color:var(--mute);font-size:11.5px;margin-top:1px}
.ch-lv .r{margin-left:auto;font-family:var(--hfont);font-size:11px;color:var(--cc);text-align:right}
.ch-lv .r i{display:block;font-style:normal;font-size:9px;letter-spacing:.1em;color:var(--yellow)}
.ch-lv:hover{border-color:var(--cc)}
.ch-lv.on{border-color:var(--cc);background:color-mix(in srgb,var(--cc) 16%,rgba(20,10,50,.7));box-shadow:0 0 18px color-mix(in srgb,var(--cc) 30%,transparent)}
.ch-seg{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.ch-seg button{padding:9px 4px;border-radius:11px;border:1px solid var(--line);background:rgba(20,10,50,.65);color:#fff;font-weight:700;font-size:13px}
.ch-seg button.on{border-color:var(--cyan);background:rgba(62,240,255,.16);box-shadow:0 0 14px rgba(62,240,255,.25)}
.ch-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:#ddd2ff;margin-top:10px;cursor:pointer}
.ch-toggle input{accent-color:var(--pink);width:16px;height:16px}
.ch-go{width:100%;margin-top:14px;font-family:var(--hfont);letter-spacing:.08em;font-size:15px;padding:14px!important;animation:pulseGlow 2.2s infinite}
.ch-opp{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:rgba(255,255,255,.05);margin-bottom:10px}
.ch-opp .e{font-size:26px;width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:rgba(255,255,255,.07)}
.ch-opp b{font-family:var(--hfont);font-size:14px}
.ch-opp small{display:block;color:var(--mute);font-size:11.5px}
.ch-status{margin-left:auto;font-size:12px;font-weight:800;letter-spacing:.06em;padding:5px 9px;border-radius:999px;background:rgba(62,240,255,.15);color:var(--cyan);white-space:nowrap}
.ch-status.think{background:rgba(255,63,164,.16);color:#ff8fca}
.ch-status.think::after{content:'';display:inline-block;width:10px;text-align:left;animation:chDots 1s steps(4) infinite}
@keyframes chDots{0%{content:''}25%{content:'.'}50%{content:'..'}75%{content:'...'}}
.ch-status.over{background:rgba(255,210,63,.18);color:var(--yellow)}
.ch-eval{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--mute);margin:6px 0 4px}
.ch-evalbar{flex:1;height:12px;border-radius:9px;background:#120a24;border:1px solid rgba(255,255,255,.14);overflow:hidden;position:relative}
.ch-evalbar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#d9d0ff,#ffffff);box-shadow:0 0 12px rgba(255,255,255,.5);transition:width .6s cubic-bezier(.2,.8,.2,1)}
.ch-evalbar::after{content:'';position:absolute;left:50%;top:-2px;bottom:-2px;width:2px;background:var(--pink);opacity:.7}
.ch-eval b{font-family:var(--hfont);color:#fff;min-width:46px;text-align:right;font-size:12px}
.ch-caps{display:grid;gap:4px;margin:8px 0;font-size:18px;line-height:1.1}
.ch-caps div{display:flex;align-items:center;gap:6px;min-height:22px;padding:3px 8px;border-radius:10px;background:rgba(255,255,255,.04)}
.ch-caps small{font-size:11px;color:var(--mute);font-weight:700;min-width:62px}
.ch-caps em{font-style:normal;font-size:12px;color:var(--green);font-weight:800;margin-left:auto}
.ch-moves{display:grid;grid-template-columns:30px 1fr 1fr;gap:2px 6px;max-height:150px;overflow-y:auto;font-size:13.5px;padding:8px 10px;border-radius:12px;background:rgba(0,0,0,.25);font-variant-numeric:tabular-nums;scrollbar-width:thin}
.ch-moves span{color:var(--mute)}
.ch-moves b{font-weight:600;padding:1px 5px;border-radius:6px}
.ch-moves b.last{background:rgba(255,210,63,.2);color:var(--yellow)}
.ch-moves .empty{grid-column:1/-1;color:var(--mute);font-size:12.5px}
.ch-promo{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);padding:18px 18px 16px;text-align:center;z-index:6;animation:chPop .3s both}
.ch-promo h3{font-family:var(--hfont);font-size:15px;margin:0 0 12px;letter-spacing:.06em}
.ch-promo .pp{display:grid;grid-template-columns:repeat(4,72px);gap:10px}
.ch-promo button{height:86px;border-radius:16px;border:1px solid var(--line);background:rgba(30,14,70,.85);color:#fff;font-size:40px;line-height:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;transition:all .15s}
.ch-promo button small{font-size:10.5px;font-weight:700;letter-spacing:.06em;color:var(--mute)}
.ch-promo button:hover{border-color:var(--yellow);transform:translateY(-3px);box-shadow:0 0 22px rgba(255,210,63,.35)}
.ch-ptabs{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
.ch-ptabs button{--cc:#fff;padding:9px 4px;border-radius:12px;border:1px solid var(--line);background:rgba(20,10,50,.6);color:var(--mute);font-weight:800;font-size:12px;line-height:1.25}
.ch-ptabs button span{display:block;font-size:17px;margin-bottom:2px}
.ch-ptabs button.on{color:#fff;border-color:var(--cc);background:color-mix(in srgb,var(--cc) 16%,rgba(20,10,50,.7));box-shadow:0 0 14px color-mix(in srgb,var(--cc) 30%,transparent)}
.ch-pgrid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px}
.ch-pz{--cc:#3dff9a;aspect-ratio:1;border-radius:12px;border:1px solid var(--line);background:rgba(20,10,50,.65);color:#fff;font-family:var(--hfont);font-weight:700;font-size:15px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all .15s;padding:0}
.ch-pz small{font-family:var(--bfont);font-size:9px;letter-spacing:1px;color:var(--yellow)}
.ch-pz:hover{border-color:var(--cc);transform:translateY(-2px)}
.ch-pz.solved{background:color-mix(in srgb,var(--cc) 20%,rgba(20,10,50,.7));border-color:var(--cc)}
.ch-pz.cur{outline:2px solid var(--yellow)}
.ch-pinfo{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:2px 0 8px}
.ch-chip{font-size:11px;font-weight:800;letter-spacing:.08em;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.08);text-transform:uppercase}
.ch-chip.w{background:#f3ecff;color:#1a1030}
.ch-chip.b{background:#1a1030;color:#f3ecff;border:1px solid rgba(255,255,255,.3)}
.ch-explain{margin-top:12px;padding:12px 14px;border-radius:14px;background:rgba(61,255,154,.1);border:1px solid rgba(61,255,154,.45);font-size:14.5px;line-height:1.5;animation:rise .35s both}
.ch-explain b{color:var(--green)}
.ch-mini{font-size:12px;color:var(--mute);margin-top:8px;line-height:1.4}
@media (max-width:800px){
  .ch-side{top:auto;bottom:8px;left:8px;right:8px;width:auto;height:42%;max-height:42%;padding:12px;border-radius:18px;animation:none}
  .ch-center{left:0;top:56px;bottom:0;padding:8px}
  .ch-ov{padding:18px 16px 16px}
  .ch-ov h2{font-size:20px}
  .ch-q{font-size:17px;margin-bottom:12px}
  .ch-ans button{padding:11px 12px;font-size:14.5px}
  .ch-cards{grid-template-columns:1fr 1fr;gap:8px}
  .ch-card{flex-direction:column;align-items:flex-start;gap:6px;padding:10px}
  .ch-card .ic{width:38px;height:38px;font-size:20px;border-radius:11px}
  .ch-card b{font-size:13px}
  .ch-card span{font-size:11.5px}
  .ch-say{font-size:14.5px}
  .ch-title{font-size:12px;padding:9px 10px;letter-spacing:.1em}
  .ch-promo .pp{grid-template-columns:repeat(4,62px)}
  .ch-promo button{height:74px;font-size:34px}
  .ch-pgrid{grid-template-columns:repeat(6,1fr)}
  .ch-moves{max-height:84px}
  .ch-coach{font-size:13px;bottom:auto}
  .ch-nophone{display:none}
}
`;
