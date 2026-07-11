/* Contact: copy-to-clipboard micro-interaction + validated form.
   Default submit = mailto: fallback. A Formspree/serverless stub is included
   below (commented) — see HANDOVER.md to switch. */

export function initContact() {
  /* ---- copy to clipboard ---- */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const t = document.createElement('textarea');
        t.value = value;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        t.remove();
      }
      const original = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1600);
    });
  });

  /* ---- form ---- */
  const form = document.querySelector('[data-contact-form]');
  if (!form) return;
  const status = form.querySelector('[data-form-status]');
  const setError = (field, on) => field.closest('.field').classList.toggle('field--error', on);
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Honeypot: bots fill this hidden field — silently drop.
    if (form.querySelector('[name="company"]').value.trim() !== '') return;

    const name = form.elements.name;
    const email = form.elements.email;
    const message = form.elements.message;
    let ok = true;

    const bad = (el) => { setError(el, true); ok = false; };
    setError(email, false);
    setError(message, false);
    if (!emailRe.test(email.value.trim())) bad(email);
    if (message.value.trim().length < 10) bad(message);

    if (!ok) {
      status.textContent = 'Please complete the highlighted fields.';
      return;
    }

    const projectType = form.elements.projectType.value || 'General enquiry';
    const phone = form.elements.phone.value.trim();

    /* -------------------------------------------------------------------
       OPTION A — Formspree / serverless endpoint (recommended for prod).
       1. Create a form at https://formspree.io (or your own function).
       2. Put the endpoint URL below and uncomment this block.
       3. Delete / keep the mailto fallback beneath it as you prefer.
    ----------------------------------------------------------------------
    const ENDPOINT = 'https://formspree.io/f/XXXXXXX';
    status.textContent = 'Sending…';
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: new FormData(form),
    })
      .then((r) => {
        if (r.ok) { form.reset(); status.textContent = 'Thanks — we’ll be in touch shortly.'; }
        else status.textContent = 'Something went wrong. Please email info@ox.productionsuae.com.';
      })
      .catch(() => (status.textContent = 'Network error. Please email info@ox.productionsuae.com.'));
    return;
    ------------------------------------------------------------------- */

    // OPTION B — mailto: fallback (works with no backend).
    const subject = `Project enquiry — ${projectType}`;
    const body =
      `Name: ${name.value.trim()}\n` +
      `Email: ${email.value.trim()}\n` +
      `Phone: ${phone || '—'}\n` +
      `Project type: ${projectType}\n\n` +
      `${message.value.trim()}\n`;
    window.location.href =
      `mailto:info@ox.productionsuae.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    status.textContent = 'Opening your email app… or write to info@ox.productionsuae.com directly.';
    form.reset();
  });
}
