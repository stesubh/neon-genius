export const CSS = `
.cl-title{font-family:var(--hfont);font-weight:900;letter-spacing:.14em;font-size:14px;padding:10px 14px;border-radius:12px;background:rgba(16,8,40,.66);border:1px solid rgba(139,123,255,.45);color:#d9d2ff;text-shadow:0 0 14px rgba(139,123,255,.8);backdrop-filter:blur(8px)}
.cl-tabs{display:flex;gap:4px;padding:4px;border-radius:14px;background:rgba(16,8,40,.7);border:1px solid var(--line);backdrop-filter:blur(8px)}
.cl-tabs button{padding:8px 12px;border-radius:10px;border:0;background:transparent;color:var(--mute);font-weight:800;font-size:13px;transition:all .15s}
.cl-tabs button.on{background:linear-gradient(135deg,var(--pink),var(--violet));color:#fff;box-shadow:0 4px 18px rgba(255,63,164,.35)}
.cl-side{position:absolute;top:66px;left:14px;bottom:14px;width:392px;display:flex;flex-direction:column;overflow:hidden;animation:clIn .35s both}
@keyframes clIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}
.cl-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:14px 14px 10px;scrollbar-width:thin}
.cl-foot{display:flex;gap:6px;padding:10px 12px;border-top:1px solid var(--line);background:rgba(10,4,30,.55);flex-wrap:wrap}
.cl-foot .btn{flex:1;padding:11px 6px;font-size:14px;min-width:0;white-space:nowrap}
.cl-foot .btn.sm{flex:0 0 auto;padding:11px 10px}
.cl-foot:empty{display:none}
.cl-h{font-family:var(--hfont);font-size:17px;letter-spacing:.05em;margin:0 0 4px;line-height:1.25}
.cl-sub{color:var(--mute);font-size:13px;line-height:1.45;margin:0 0 10px}
.cl-lbl{font-family:var(--hfont);font-size:10.5px;letter-spacing:.16em;color:var(--mute);margin:12px 0 6px;text-transform:uppercase;display:flex;justify-content:space-between;align-items:center;gap:8px}
.cl-lbl b{color:#fff;letter-spacing:.06em}
.cl-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
.cl-top .back{padding:6px 10px;font-size:13px;border-radius:10px}
.cl-chip{--cc:#3ef0ff;display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;padding:4px 10px;border-radius:999px;color:#0c0620;background:var(--cc);box-shadow:0 0 14px color-mix(in srgb,var(--cc) 45%,transparent);border:0;white-space:nowrap}
.cl-stars{color:var(--yellow);letter-spacing:2px;font-size:13px;text-shadow:0 0 8px rgba(255,210,63,.6)}
.cl-stars .off{color:rgba(255,255,255,.18);text-shadow:none}
.cl-goal{padding:11px 12px;border-radius:14px;background:rgba(62,240,255,.08);border:1px solid rgba(62,240,255,.35);font-size:14.5px;line-height:1.45;font-weight:600;animation:rise .35s both}
.cl-goal b{color:var(--yellow)}
.cl-goal code,.cl-sub code,.cl-say code,.cl-card code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92em;background:rgba(255,255,255,.08);padding:1px 5px;border-radius:5px;color:#bff8ff}
.cl-grp{font-family:var(--hfont);font-size:11px;letter-spacing:.14em;margin:14px 2px 6px;text-transform:uppercase;display:flex;align-items:center;gap:8px}
.cl-grp i{flex:1;height:1px;background:linear-gradient(90deg,var(--cc,#fff),transparent);opacity:.5}
.cl-lvls{display:grid;grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:7px}
.cl-lv{--cc:#3ef0ff;position:relative;text-align:left;padding:9px 10px 8px;border-radius:13px;border:1px solid var(--line);background:rgba(20,10,50,.7);color:var(--ink);transition:transform .15s,border-color .15s,box-shadow .2s;min-height:62px}
.cl-lv:hover:not(:disabled){transform:translateY(-2px);border-color:var(--cc);box-shadow:0 6px 20px color-mix(in srgb,var(--cc) 30%,transparent)}
.cl-lv b{display:block;font-size:12.5px;line-height:1.25;margin-bottom:4px}
.cl-lv small{font-family:var(--hfont);font-size:10px;color:var(--cc);letter-spacing:.08em}
.cl-lv .cl-stars{font-size:11px;display:block}
.cl-lv.next{border-color:var(--yellow);box-shadow:0 0 18px rgba(255,210,63,.25);background:rgba(255,210,63,.08)}
.cl-lv:disabled{opacity:.4}
.cl-lv.done{border-color:color-mix(in srgb,var(--cc) 50%,transparent)}
.cl-suggest{display:flex;gap:10px;align-items:center;padding:10px 12px;border-radius:14px;margin:0 0 10px;background:linear-gradient(120deg,rgba(139,123,255,.22),rgba(255,63,164,.12));border:1px solid rgba(139,123,255,.5);font-size:13.5px;line-height:1.35}
.cl-suggest .btn{margin-left:auto;padding:9px 12px;flex:none}
.cl-prog-bar{height:7px;border-radius:9px;background:rgba(255,255,255,.08);overflow:hidden;margin:6px 0 2px}
.cl-prog-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--pink),var(--cyan));border-radius:9px}
.cl-palrow{display:flex;flex-wrap:wrap;gap:6px}
.cl-pal{--bc:#3ef0ff;position:relative;display:flex;align-items:center;gap:6px;padding:8px 11px;border-radius:11px;border:1px solid color-mix(in srgb,var(--bc) 65%,transparent);background:linear-gradient(135deg,color-mix(in srgb,var(--bc) 30%,rgba(16,8,40,.9)),rgba(16,8,40,.9));color:#fff;font-weight:800;font-size:13px;cursor:grab;touch-action:none;user-select:none;transition:transform .1s,box-shadow .15s}
.cl-pal:hover{transform:translateY(-2px);box-shadow:0 4px 16px color-mix(in srgb,var(--bc) 40%,transparent)}
.cl-pal:active{transform:scale(.95)}
.cl-pal .ic,.cl-bh .ic{font-size:14px;width:18px;text-align:center}
.cl-pal .new{position:absolute;top:-7px;right:-6px;font-style:normal;font-size:8.5px;font-weight:900;letter-spacing:.08em;background:var(--yellow);color:#1a0e00;padding:2px 5px;border-radius:6px;animation:clPulse 1.2s infinite}
@keyframes clPulse{50%{transform:scale(1.12)}}
.cl-progwrap{border-radius:14px;background:rgba(5,2,18,.55);border:1px solid var(--line);padding:8px;min-height:120px}
.cl-phead{font-family:var(--hfont);font-size:10.5px;letter-spacing:.14em;color:var(--mute);margin:2px 2px 6px;text-transform:uppercase}
.cl-phead.fn{color:var(--green)}
.cl-phead small{font-family:var(--bfont);letter-spacing:0;text-transform:none;opacity:.8}
.cl-list{display:flex;flex-direction:column;gap:5px;min-height:30px;padding:2px 0 10px;border-radius:10px}
.cl-list.main{min-height:84px}
.cl-list.fnlist{min-height:40px;margin-bottom:8px;padding:6px;border:1px dashed rgba(61,255,154,.4);background:rgba(61,255,154,.05)}
.cl-list:empty::before{content:'tap or drag blocks here';color:rgba(185,169,230,.55);font-size:12px;padding:8px 10px;border:1px dashed rgba(185,169,230,.3);border-radius:10px}
.cl-blk{--bc:#3ef0ff;border-radius:11px;background:linear-gradient(135deg,color-mix(in srgb,var(--bc) 26%,rgba(14,6,36,.95)),rgba(14,6,36,.95) 80%);border:1px solid color-mix(in srgb,var(--bc) 60%,transparent);touch-action:pan-y;user-select:none;animation:clPop .25s cubic-bezier(.2,.9,.3,1.3) both;transition:box-shadow .15s,transform .15s}
@keyframes clPop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
.cl-bh{display:flex;align-items:center;gap:6px;padding:6px 6px 6px 9px;font-weight:800;font-size:13px;min-height:34px;cursor:grab}
.cl-bh .lb{white-space:nowrap}
.cl-bh .v{font-family:var(--hfont);font-size:12.5px;min-width:24px;text-align:center;padding:3px 6px;border-radius:7px;background:rgba(0,0,0,.35);cursor:pointer}
.cl-bh .v.cond{font-family:var(--bfont)}
.cl-bh .st{width:22px;height:22px;border-radius:7px;border:0;background:rgba(255,255,255,.1);color:#fff;font-weight:900;font-size:13px;line-height:1;padding:0}
.cl-bh select{background:rgba(0,0,0,.4);color:#fff;border:1px solid color-mix(in srgb,var(--bc) 50%,transparent);border-radius:8px;padding:4px 6px;font-weight:700;font-size:12.5px;max-width:150px}
.cl-bh .x{margin-left:auto;width:24px;height:24px;border-radius:8px;border:0;background:transparent;color:rgba(255,255,255,.45);font-size:12px;padding:0;flex:none}
.cl-bh .x:hover{background:rgba(255,77,94,.25);color:#fff}
.cl-blk.box>.cl-list{margin:0 6px 0 14px;padding:4px 0 4px 8px;border-left:3px solid color-mix(in srgb,var(--bc) 70%,transparent);min-height:34px}
.cl-else{font-weight:800;font-size:12.5px;padding:3px 10px;color:var(--bc)}
.cl-cap{height:12px;margin:0 0 0 6px;border-radius:0 0 8px 8px;cursor:pointer}
.cl-blk.run{box-shadow:0 0 0 2px #fff,0 0 22px var(--bc);transform:translateX(3px)}
.cl-blk.ck-t>.cl-bh{animation:clCkT .5s}
.cl-blk.ck-f>.cl-bh{animation:clCkF .5s}
@keyframes clCkT{30%{background:rgba(61,255,154,.45)}}
@keyframes clCkF{30%{background:rgba(255,77,94,.45)}}
.cl-blk.dragging{opacity:.3}
.cl-caret{height:4px;border-radius:4px;background:var(--yellow);box-shadow:0 0 12px var(--yellow);margin:-1px 4px;animation:clBlink 1s infinite;flex:none}
@keyframes clBlink{50%{opacity:.35}}
.cl-drop{height:6px;border-radius:4px;background:var(--cyan);box-shadow:0 0 14px var(--cyan);flex:none}
.cl-ghost{position:fixed;left:0;top:0;z-index:200;pointer-events:none;opacity:.92;box-shadow:0 12px 40px rgba(0,0,0,.6);transition:none!important;animation:none!important}
.cl-ghost.del{opacity:.5;filter:grayscale(1)}
.cl-count{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--mute);margin:8px 2px 0}
.cl-count b{color:#fff;font-family:var(--hfont)}
.cl-count .tools{margin-left:auto;display:flex;gap:6px}
.cl-mini{padding:5px 9px;border-radius:9px;border:1px solid var(--line);background:rgba(30,14,70,.8);color:#fff;font-size:12px;font-weight:700}
.cl-mini.on{border-color:var(--cyan);background:rgba(62,240,255,.18)}
.cl-js{position:absolute;top:66px;left:416px;width:300px;max-height:calc(100% - 200px);overflow:auto;padding:12px 0 12px;animation:clIn .3s both}
.cl-js h4{margin:0 14px 8px;font-family:var(--hfont);font-size:11px;letter-spacing:.16em;color:var(--cyan);text-transform:uppercase}
.cl-code{margin:0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;font-size:13px;line-height:20px;color:#efe8ff;white-space:pre;tab-size:2}
.cl-code .ln{display:block;padding:0 14px;border-left:3px solid transparent}
.cl-code .ln.on{background:rgba(62,240,255,.16);border-left-color:var(--cyan)}
.cl-code i,.cl-hl i{font-style:normal}
i.k{color:#ff7ac8}i.s{color:#ffd76a}i.n{color:#ffb26b}i.c{color:#8f84b8;font-style:italic}i.f{color:#6ff3ff}i.o{color:#b9a3ff}i.p{color:#c9bfee}
.cl-ex{border-radius:12px;background:rgba(5,2,18,.7);border:1px solid var(--line);padding:9px 0;overflow-x:auto}
.cl-ed{position:relative;display:flex;border-radius:12px;background:rgba(5,2,18,.82);border:1px solid var(--line);overflow:hidden;min-height:120px}
.cl-ed:focus-within{border-color:var(--cyan);box-shadow:0 0 0 1px rgba(62,240,255,.3),0 0 22px rgba(62,240,255,.15)}
.cl-gut{flex:none;width:34px;overflow:hidden;padding:10px 0;text-align:right;font:12px/20px ui-monospace,Menlo,Consolas,monospace;color:rgba(185,169,230,.45);background:rgba(255,255,255,.03);user-select:none}
.cl-gut b{display:block;padding-right:7px;font-weight:400}
.cl-gut b.on{color:#fff;background:rgba(62,240,255,.25)}
.cl-edw{position:relative;flex:1;min-width:0}
.cl-hl,.cl-edw textarea{position:absolute;inset:0;margin:0;padding:10px 10px;font:13px/20px ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace;white-space:pre;tab-size:2;letter-spacing:0;border:0;overflow:auto}
.cl-hl{color:#efe8ff;pointer-events:none;overflow:hidden}
.cl-hl code{position:relative;font:inherit}
.cl-edw textarea{background:transparent;color:transparent;caret-color:#fff;resize:none;outline:none;-webkit-text-fill-color:transparent}
.cl-edw textarea::selection{background:rgba(139,123,255,.45);-webkit-text-fill-color:transparent}
.cl-lnhi,.cl-lnerr{position:absolute;left:0;right:0;height:20px;display:none}
.cl-lnhi{background:rgba(62,240,255,.16);box-shadow:inset 3px 0 var(--cyan)}
.cl-lnerr{background:rgba(255,77,94,.2);box-shadow:inset 3px 0 var(--red)}
.cl-snips{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}
.cl-snips button{font:12px ui-monospace,Menlo,Consolas,monospace;padding:5px 8px;border-radius:8px;border:1px solid rgba(62,240,255,.3);background:rgba(62,240,255,.07);color:#bff8ff}
.cl-snips button:hover{background:rgba(62,240,255,.2)}
.cl-out{margin-top:8px;border-radius:12px;background:rgba(0,0,0,.35);border:1px solid var(--line);padding:8px 10px;font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace;max-height:150px;overflow:auto}
.cl-out:empty{display:none}
.cl-out div{white-space:pre-wrap;word-break:break-word}
.cl-out .err{color:#ff9aa5}.cl-out .ok{color:var(--green)}.cl-out .say{color:#d9d2ff}
.cl-tests{display:grid;gap:6px;margin-top:10px}
.cl-test{display:grid;grid-template-columns:24px 1fr;gap:4px 8px;align-items:start;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,.04);border:1px solid var(--line);font-size:12.5px;animation:rise .3s both}
.cl-test .st{width:22px;height:22px;border-radius:7px;display:grid;place-items:center;font-weight:900;font-size:12px}
.cl-test.pass{border-color:rgba(61,255,154,.45)}.cl-test.pass .st{background:rgba(61,255,154,.25);color:var(--green)}
.cl-test.fail{border-color:rgba(255,77,94,.5)}.cl-test.fail .st{background:rgba(255,77,94,.25);color:#ff9aa5}
.cl-test.wait .st{background:rgba(255,255,255,.08);color:var(--mute)}
.cl-test code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;word-break:break-word}
.cl-test .d{color:var(--mute);line-height:1.5}
.cl-banner{margin-top:10px;padding:10px 12px;border-radius:12px;font-weight:700;font-size:14px;line-height:1.4}
.cl-banner.good{background:rgba(61,255,154,.14);border:1px solid var(--green)}
.cl-banner.bad{background:rgba(255,77,94,.12);border:1px solid rgba(255,77,94,.6)}
.cl-hint{margin-top:8px;padding:9px 12px;border-radius:12px;background:rgba(255,210,63,.1);border:1px solid rgba(255,210,63,.45);font-size:13.5px;line-height:1.45;animation:rise .3s both}
.cl-hint code{color:#ffe9a8}
.cl-concept p{margin:0 0 6px;font-size:14px;line-height:1.5}
.cl-concept b{color:var(--yellow)}
.cl-chl{display:flex;flex-direction:column;gap:5px}
.cl-cr{--cc:#3ef0ff;display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:11px;border:1px solid var(--line);background:rgba(20,10,50,.6);color:var(--ink);text-align:left;font-size:13.5px;font-weight:600;width:100%;transition:all .15s}
.cl-cr:hover{border-color:var(--cc);transform:translateX(3px)}
.cl-cr .n{width:26px;height:26px;border-radius:8px;display:grid;place-items:center;font-size:11px;font-family:var(--hfont);background:rgba(255,255,255,.07);flex:none}
.cl-cr.done .n{background:color-mix(in srgb,var(--cc) 30%,transparent);color:#fff}
.cl-cr.next{border-color:var(--yellow);background:rgba(255,210,63,.08)}
.cl-cr small{margin-left:auto;color:var(--mute);font-family:ui-monospace,Menlo,monospace;font-size:11px}
.cl-info{position:absolute;top:70px;left:420px;right:80px;display:flex;justify-content:center;pointer-events:none}
.cl-info>div{display:flex;align-items:center;gap:10px;padding:7px 14px;border-radius:999px;background:rgba(12,6,32,.72);border:1px solid var(--line);backdrop-filter:blur(8px);font-size:13px;font-weight:700}
.cl-info:empty{display:none}
.cl-info .cnt{font-family:var(--hfont);font-size:12px}
.cl-dots{display:flex;gap:5px}
.cl-dots i{width:9px;height:9px;border-radius:9px;background:rgba(255,255,255,.2)}
.cl-dots i.on{background:var(--cyan);box-shadow:0 0 8px var(--cyan)}
.cl-dots i.ok{background:var(--green)}
.cl-coach{position:absolute;bottom:18px;left:50%;transform:translate(-50%,16px);max-width:min(520px,calc(100% - 32px));display:flex;gap:10px;align-items:center;padding:10px 14px 10px 10px;border-radius:16px;background:rgba(12,6,32,.92);border:1px solid var(--line);font-size:14.5px;line-height:1.4;opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;z-index:3}
.cl-coach.show{opacity:1;transform:translate(-50%,0)}
.cl-coach .av{font-size:22px;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:rgba(255,255,255,.07);flex:none}
.cl-coach.good{border-color:var(--green);box-shadow:0 0 24px rgba(61,255,154,.25)}
.cl-coach.bad{border-color:var(--red);box-shadow:0 0 24px rgba(255,77,94,.25)}
.cl-coach.tip{border-color:var(--yellow);box-shadow:0 0 24px rgba(255,210,63,.22)}
.cl-coach b{color:var(--yellow)}
.cl-center{position:absolute;top:56px;bottom:0;left:406px;right:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:4;padding:16px}
.cl-center:empty{display:none}
.cl-card{pointer-events:auto;width:min(480px,100%);max-height:100%;overflow-y:auto;padding:22px 22px 18px;text-align:center;animation:clCard .45s cubic-bezier(.2,.9,.3,1.2) both;box-shadow:0 20px 70px rgba(0,0,0,.55)}
@keyframes clCard{from{opacity:0;transform:translateY(18px) scale(.95)}to{opacity:1;transform:none}}
.cl-card h2{font-family:var(--hfont);font-size:23px;margin:4px 0 6px;letter-spacing:.04em}
.cl-card p{color:#e6dcff;font-size:15px;line-height:1.5;margin:6px 0}
.cl-card .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px}
.cl-card .row .btn{padding:12px 18px;font-size:14.5px}
.cl-bigstars{font-size:46px;letter-spacing:6px;line-height:1.1;margin:2px 0 4px}
.cl-bigstars span{display:inline-block;color:var(--yellow);text-shadow:0 0 20px rgba(255,210,63,.8);animation:clStar .6s cubic-bezier(.2,.9,.3,1.6) both}
.cl-bigstars span.off{color:rgba(255,255,255,.15);text-shadow:none}
@keyframes clStar{from{opacity:0;transform:scale(.2) rotate(-90deg)}to{opacity:1;transform:none}}
.cl-learn{text-align:left;padding:12px 14px;border-radius:14px;background:rgba(139,123,255,.14);border:1px solid rgba(139,123,255,.5);margin-top:12px;font-size:14.5px;line-height:1.5}
.cl-learn small{display:block;font-family:var(--hfont);font-size:10px;letter-spacing:.16em;color:#c9bfff;margin-bottom:4px}
.cl-learn b{color:var(--yellow)}
.cl-q{font-size:18px;font-weight:800;line-height:1.35;margin:8px 0 14px}
.cl-ans{display:grid;gap:8px}
.cl-ans button{text-align:left;padding:12px 14px;border-radius:13px;border:1px solid var(--line);background:rgba(30,14,70,.75);color:#fff;font-size:15px;font-weight:600;transition:all .15s}
.cl-ans button:hover:not([disabled]){border-color:var(--cyan);transform:translateX(4px)}
.cl-ans button.ok{border-color:var(--green);background:rgba(61,255,154,.2)}
.cl-ans button.no{border-color:var(--red);background:rgba(255,77,94,.2)}
.cl-fact{margin-top:12px;padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.06);text-align:left;font-size:14px;line-height:1.5}
.cl-intro .demo{margin:10px 0;padding:8px;border-radius:14px;background:rgba(5,2,18,.55);border:1px solid var(--line)}
.cl-intro .say p{font-size:15px;line-height:1.5;margin:0 0 6px}
.cl-intro .say b{color:var(--yellow)}
.cl-watch{display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--cyan);font-weight:700;margin:4px 0}
.cl-watch i{width:8px;height:8px;border-radius:8px;background:var(--red);box-shadow:0 0 8px var(--red);animation:clBlink 1s infinite}
@media (max-width:1100px){.cl-side{width:360px}.cl-js{left:384px;width:270px}.cl-center{left:374px}.cl-info{left:388px}}
@media (max-width:800px){
  .cl-title{display:none}
  .cl-tabs button{padding:7px 9px;font-size:12px}
  .cl-tabs button span{display:none}
  .cl-side{top:auto;left:6px;right:6px;bottom:6px;width:auto;height:56%;border-radius:18px 18px 14px 14px}
  .cl-scroll{padding:10px 10px 8px}
  .cl-foot{padding:8px}
  .cl-foot .btn{padding:10px 4px;font-size:13px}
  .cl-js{left:6px;right:6px;width:auto;top:100px;max-height:calc(44% - 120px);padding:8px 0}
  .cl-js h4{display:none}
  .cl-info{left:8px;right:8px;top:62px}
  .cl-info>div{font-size:12px;padding:5px 10px}
  .cl-center{left:0;top:52px;bottom:0;align-items:flex-end;padding:10px}
  .cl-card{padding:16px 14px 14px;max-height:calc(100% - 10px)}
  .cl-card h2{font-size:19px}
  .cl-bigstars{font-size:36px}
  .cl-coach{top:auto;bottom:calc(56% + 14px);font-size:13.5px}
  .cl-palrow{flex-wrap:nowrap;overflow-x:auto;padding:6px 2px 4px;scrollbar-width:none}
  .cl-pal{flex:none;touch-action:pan-x}
  .cl-goal{font-size:13.5px;padding:8px 10px}
  .cl-lvls{grid-template-columns:repeat(auto-fill,minmax(96px,1fr))}
}
`;
