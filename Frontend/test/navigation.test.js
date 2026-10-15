import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.localStorage = { getItem: () => 'ru', setItem() {} };
globalThis.document = { documentElement: {} };
const { bindResponsiveMenu } = await import('../js/navigation.js');

class Element extends EventTarget {
  hidden = false;
  focused = false;
  attributes = new Map();
  classes = new Set();
  classList = { toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name) };
  setAttribute(name, value) { this.attributes.set(name, value); }
  contains(element) { return element === this; }
  focus() { this.focused = true; }
  closest() { return null; }
}
function fixture() {
  const button = new Element(), menu = new Element(), root = new Element();
  const media = new EventTarget();
  media.matches = false;
  const dispose = bindResponsiveMenu({ button, menu, root, media });
  return { button, menu, root, media, dispose };
}

test('menu is hidden until requested; Escape closes it and returns keyboard focus', () => {
  const f = fixture();
  assert.equal(f.menu.hidden, true);
  f.button.dispatchEvent(new Event('click'));
  assert.equal(f.menu.hidden, false);
  assert.equal(f.button.attributes.get('aria-expanded'), 'true');
  const escape = new Event('keydown', { cancelable: true });
  Object.defineProperty(escape, 'key', { value: 'Escape' });
  f.root.dispatchEvent(escape);
  assert.equal(f.menu.hidden, true);
  assert.equal(f.button.focused, true);
  assert.equal(escape.defaultPrevented, true);
  f.dispose();
});

test('outside click and returning to desktop close the menu without stealing focus', () => {
  const f = fixture();
  f.button.dispatchEvent(new Event('click'));
  f.root.dispatchEvent(new Event('click'));
  assert.equal(f.menu.hidden, true);
  assert.equal(f.button.focused, false);
  f.button.dispatchEvent(new Event('click'));
  f.media.matches = true;
  f.media.dispatchEvent(new Event('change'));
  assert.equal(f.menu.hidden, true);
  f.button.dispatchEvent(new Event('click'));
  assert.equal(f.menu.hidden, true);
  f.dispose();
});

test('following a link closes the menu; rendering another page removes old listeners', () => {
  const f = fixture();
  f.button.dispatchEvent(new Event('click'));
  f.menu.closest = () => ({ href: '/clinics' });
  f.menu.dispatchEvent(new Event('click'));
  assert.equal(f.menu.hidden, true);
  f.dispose();
  f.button.dispatchEvent(new Event('click'));
  assert.equal(f.menu.hidden, true);
});
