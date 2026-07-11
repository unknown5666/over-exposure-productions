/* Portfolio: GSAP Flip category filtering + video-ready lightbox. */
import { Flip } from 'gsap/Flip';

export function initPortfolio({ gsap, reduceMotion }) {
  gsap.registerPlugin(Flip);
  const grid = document.querySelector('[data-portfolio]');
  const cards = Array.from(grid.querySelectorAll('.pf-card'));
  const filters = Array.from(document.querySelectorAll('[data-filter]'));

  /* ---- filtering ---- */
  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => b.classList.toggle('active', b === btn));
      const cat = btn.dataset.filter;
      const apply = () =>
        cards.forEach((c) => {
          c.hidden = !(cat === 'all' || c.dataset.cat === cat);
        });

      if (reduceMotion) return apply();
      const state = Flip.getState(cards);
      apply();
      Flip.from(state, {
        duration: 0.6,
        ease: 'power3.inOut',
        absolute: true,
        scale: false,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 0.45 }),
        onLeave: (els) => gsap.to(els, { opacity: 0, duration: 0.2 }),
      });
    });
  });

  /* ---- lightbox ---- */
  const lb = document.querySelector('[data-lightbox]');
  if (!lb) return;
  const stage = lb.querySelector('[data-lb-stage]');
  const capCat = lb.querySelector('[data-lb-cat]');
  const capIdx = lb.querySelector('[data-lb-idx]');
  let visible = [];
  let pos = 0;

  const render = () => {
    const card = visible[pos];
    const type = card.dataset.mediaType;
    const src = card.dataset.mediaSrc;
    const img = card.dataset.img;
    const alt = card.dataset.alt || '';
    stage.innerHTML = '';
    let el;
    if (type === 'video' && src) {
      el = document.createElement('video');
      el.src = src;
      el.controls = true;
      el.autoplay = true;
      el.loop = true;
      el.playsInline = true;
      el.poster = img;
    } else if (type === 'embed' && src) {
      el = document.createElement('iframe');
      el.src = src;
      el.allow = 'autoplay; fullscreen; picture-in-picture';
      el.allowFullscreen = true;
      el.style.width = 'min(1100px, 92vw)';
      el.style.aspectRatio = '16 / 9';
    } else {
      el = document.createElement('img');
      el.src = img;
      el.alt = alt;
    }
    stage.appendChild(el);
    capCat.textContent = card.dataset.cat;
    capIdx.textContent = `${String(pos + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
  };

  const open = (card) => {
    visible = cards.filter((c) => !c.hidden);
    pos = Math.max(0, visible.indexOf(card));
    render();
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
    lb.querySelector('[data-lb-close]').focus();
  };
  const close = () => {
    lb.classList.remove('open');
    document.body.style.overflow = '';
    stage.innerHTML = '';
  };
  const step = (d) => {
    pos = (pos + d + visible.length) % visible.length;
    render();
  };

  cards.forEach((card) =>
    card.addEventListener('click', () => open(card))
  );
  lb.querySelector('[data-lb-close]').addEventListener('click', close);
  lb.querySelector('[data-lb-prev]').addEventListener('click', () => step(-1));
  lb.querySelector('[data-lb-next]').addEventListener('click', () => step(1));
  lb.addEventListener('click', (e) => {
    if (e.target === lb) close();
  });
  document.addEventListener('keydown', (e) => {
    if (!lb.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}
