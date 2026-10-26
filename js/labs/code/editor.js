// Small code editor: textarea over a syntax-coloured <pre>, with line numbers, auto indent and line highlights.
import { esc } from '../../utils.js';

const KW = /^(let|const|var|function|return|if|else|for|while|do|break|continue|new|of|in|typeof|true|false|null|undefined|class|this|switch|case|default)$/;
export function highlight(code) {
  const re = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?|`(?:\\.|[^`\\])*`?)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(\s*\()?|([{}()[\];,.=+\-*/%<>!&|?:]+)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index)); last = re.lastIndex;
    if (m[1]) out += `<i class="c">${esc(m[1])}</i>`;
    else if (m[2]) out += `<i class="s">${esc(m[2])}</i>`;
    else if (m[3]) out += `<i class="n">${m[3]}</i>`;
    else if (m[4]) {
      const w = m[4];
      if (KW.test(w)) out += `<i class="k">${w}</i>`;
      else if (w === 'robot' || w === 'console' || w === 'Math') out += `<i class="o">${w}</i>`;
      else if (m[5]) out += `<i class="f">${w}</i>`;
      else out += w;
      if (m[5]) out += esc(m[5]);
    } else out += `<i class="p">${esc(m[6])}</i>`;
  }
  return out + esc(code.slice(last));
}

export function createEditor(host, { value = '', onChange = null, minLines = 8 } = {}) {
  host.innerHTML = `<div class="cl-ed"><div class="cl-gut"></div><div class="cl-edw"><pre class="cl-hl" aria-hidden="true"><div class="cl-lnhi"></div><div class="cl-lnerr"></div><code></code></pre><textarea spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="Code editor"></textarea></div></div>`;
  const ta = host.querySelector('textarea'), code = host.querySelector('code'), pre = host.querySelector('pre'), gut = host.querySelector('.cl-gut');
  const hi = host.querySelector('.cl-lnhi'), er = host.querySelector('.cl-lnerr');
  const LH = 20, PAD = 10;
  ta.value = value;
  function render() {
    code.innerHTML = highlight(ta.value) + '\n';
    const n = Math.max(minLines, ta.value.split('\n').length);
    gut.innerHTML = Array.from({ length: n }, (_, i) => `<b data-l="${i + 1}">${i + 1}</b>`).join('');
    const h = Math.min(Math.max(minLines, ta.value.split('\n').length + 1) * LH + PAD * 2, 460);
    host.querySelector('.cl-ed').style.height = h + 'px';
    sync();
  }
  function sync() { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; gut.scrollTop = ta.scrollTop; }
  function insert(text) {
    ta.focus();
    if (!document.execCommand || !document.execCommand('insertText', false, text)) ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    render(); if (onChange) onChange(ta.value);
  }
  ta.addEventListener('input', () => { render(); if (onChange) onChange(ta.value); });
  ta.addEventListener('scroll', sync);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') { e.preventDefault(); insert('  '); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      const before = ta.value.slice(0, ta.selectionStart);
      const line = before.slice(before.lastIndexOf('\n') + 1);
      let ind = /^\s*/.exec(line)[0];
      if (/[{([]\s*$/.test(line)) ind += '  ';
      insert('\n' + ind);
      return;
    }
    if (e.key === '}') {
      const before = ta.value.slice(0, ta.selectionStart);
      const line = before.slice(before.lastIndexOf('\n') + 1);
      if (/^\s{2,}$/.test(line)) { e.preventDefault(); ta.setSelectionRange(ta.selectionStart - 2, ta.selectionStart); insert('}'); }
    }
  });
  function mark(el, line) {
    if (!line) { el.style.display = 'none'; return; }
    el.style.display = 'block'; el.style.top = (PAD + (line - 1) * LH) + 'px';
  }
  render();
  return {
    ta,
    get value() { return ta.value; },
    set value(v) { ta.value = v; render(); },
    insert,
    setActive(line) {
      mark(hi, line);
      gut.querySelectorAll('b.on').forEach((b) => b.classList.remove('on'));
      if (line) { const b = gut.querySelector(`b[data-l="${line}"]`); if (b) b.classList.add('on'); }
      if (line) { const y = PAD + (line - 1) * LH; if (y < ta.scrollTop || y > ta.scrollTop + ta.clientHeight - LH) { ta.scrollTop = y - 40; sync(); } }
    },
    setError(line) { mark(er, line); },
    focus() { ta.focus(); },
  };
}
