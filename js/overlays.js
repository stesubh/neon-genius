// A small stack of full-screen overlays (profile, settings, setup screens).
// Esc always closes the top one.
const stack = [];
export const Overlays = {
  /** Show an element as an overlay. onClose runs when it is closed (by Esc, close button or code). */
  open(el, onClose = null) {
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('ov-in'));
    const entry = { el, onClose };
    stack.push(entry);
    return () => this.close(entry);
  },
  close(entry) {
    const i = stack.indexOf(entry);
    if (i < 0) return;
    stack.splice(i, 1);
    entry.el.classList.remove('ov-in');
    entry.el.classList.add('ov-out');
    setTimeout(() => entry.el.remove(), 260);
    if (entry.onClose) entry.onClose();
  },
  closeTop() { if (!stack.length) return false; const top = stack[stack.length - 1]; if (top.el.dataset.locked) return true; this.close(top); return true; },
  closeAll() { while (stack.length) this.close(stack[stack.length - 1]); },
  get count() { return stack.length; },
};
