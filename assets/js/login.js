function getForm() {
  const form = document.querySelector('.auth-form');
  if (!form) return null;
  const email = form.querySelector('input[type="email"]');
  const password = form.querySelector('input[type="password"]');
  const button = form.querySelector('button[type="button"]');
  return { form, email, password, button };
}
async function attachLogin() {
  const client = window.supabaseClient;
  if (!client) return;
  try {
    const { data } = await client.auth.getUser();
    if (data && data.user) {
      window.location.href = 'profile.html';
      return;
    }
  } catch (_) {}
  const refs = getForm();
  if (!refs || !refs.button || !refs.email || !refs.password) return;
  refs.button.addEventListener('click', async () => {
    const email = (refs.email.value || '').trim();
    const password = refs.password.value || '';
    if (!email || !password) {
      alert('Enter email and password.');
      return;
    }
    const removeSpin = () => {
      refs.button.disabled = false;
      const ring = refs.button.querySelector('.spin-ring');
      if (ring) ring.remove();
    };
    refs.button.disabled = true;
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        alert('Login failed. Check email or password.');
        removeSpin();
        return;
      }
      try { localStorage.setItem('last_checkout_email', email); } catch (_) {}
      removeSpin();
      window.location.href = 'profile.html';
    } catch (_) {
      alert('Login failed.');
      removeSpin();
    }
  });
}
if (window.supabaseClient) {
  attachLogin();
} else {
  window.addEventListener('supabase-ready', attachLogin);
}
