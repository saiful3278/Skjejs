document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('menu-toggle');
  const menu = document.getElementById('nav-popover') || document.getElementById('nav-drawer');
  if (toggle && menu) {
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
  }
  function hideLoginIfSignedIn() {
    const client = window.supabaseClient;
    if (!client) return;
    client.auth.getUser().then(({ data }) => {
      const user = data && data.user ? data.user : null;
      if (user) {
        const menus = [document.getElementById('nav-popover'), document.getElementById('nav-drawer')].filter(Boolean);
        menus.forEach((m) => {
          const links = m.querySelectorAll('a[href$="login.html"], a[href="login.html"]');
          links.forEach((a) => { a.style.display = 'none'; });
        });
      }
    }).catch(() => {});
  }
  if (window.supabaseClient) {
    hideLoginIfSignedIn();
  } else {
    window.addEventListener('supabase-ready', hideLoginIfSignedIn);
  }
  function hideCheckout() {
    const menus = [document.getElementById('nav-popover'), document.getElementById('nav-drawer')].filter(Boolean);
    menus.forEach((m) => {
      const links = m.querySelectorAll('a[href$="checkout.html"], a[href="checkout.html"]');
      links.forEach((a) => { a.style.display = 'none'; });
    });
  }
  hideCheckout();
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    if (btn.querySelector('.spin-ring')) return;
    const ring = document.createElement('span');
    ring.className = 'spin-ring';
    ring.style.marginLeft = '8px';
    ring.setAttribute('aria-hidden', 'true');
    btn.appendChild(ring);
    setTimeout(() => {
      if (btn.disabled) return;
      const r = btn.querySelector('.spin-ring');
      if (r) r.remove();
    }, 800);
  });
});
