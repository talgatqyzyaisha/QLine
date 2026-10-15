import { L } from './i18n.js';

/** Non-modal disclosure: native links, no focus trap, Escape restores trigger. */
export function bindResponsiveMenu({ button, menu, root = document, media = window.matchMedia('(min-width: 1181px)') }) {
  let opened = false;

  const setOpen = (value, restoreFocus = false) => {
    opened = value && !media.matches;
    menu.hidden = !opened;
    menu.classList.toggle('open', opened);
    button.setAttribute('aria-expanded', String(opened));
    button.setAttribute('aria-label', opened ? L('Закрыть меню', 'Мәзірді жабу') : L('Открыть меню', 'Мәзірді ашу'));
    if (restoreFocus) button.focus();
  };
  const toggle = () => setOpen(!opened);
  const keydown = event => {
    if (event.key === 'Escape' && opened) {
      event.preventDefault();
      setOpen(false, true);
    }
  };
  const outside = event => {
    if (opened && !menu.contains(event.target) && !button.contains(event.target)) setOpen(false);
  };
  const followLink = event => {
    if (event.target.closest('a[href]')) setOpen(false);
  };
  const resize = () => { if (media.matches) setOpen(false); };

  setOpen(false);
  button.addEventListener('click', toggle);
  menu.addEventListener('click', followLink);
  root.addEventListener('keydown', keydown);
  root.addEventListener('click', outside);
  if (media.addEventListener) media.addEventListener('change', resize);
  else media.addListener(resize);

  return () => {
    button.removeEventListener('click', toggle);
    menu.removeEventListener('click', followLink);
    root.removeEventListener('keydown', keydown);
    root.removeEventListener('click', outside);
    if (media.removeEventListener) media.removeEventListener('change', resize);
    else media.removeListener(resize);
  };
}
