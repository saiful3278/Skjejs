document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('nav-popover') || document.getElementById('nav-drawer');
  if (!toggle || !menu) return;
  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
  });
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('open')) return;
    const inToggle = e.target.closest('#menu-toggle');
    const inMenu = e.target.closest('#nav-popover');
    if (!inToggle && !inMenu) {
      menu.classList.remove('open');
    }
  });
  menu.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) menu.classList.remove('open');
  });
});
