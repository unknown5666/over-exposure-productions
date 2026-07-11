/* =========================================================================
   Over Exposure Productions — motion system entry
   Lenis smooth scroll + GSAP ScrollTrigger. Animate transform/opacity only.
   Page-specific behaviour is code-split (dynamic import) to keep JS lean.
   ========================================================================= */
import '../css/main.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

let lenis = null;

/* ------------------------------- Lenis ---------------------------------- */
function initSmoothScroll() {
  if (reduceMotion) return;
  lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
function scrollTo(target) {
  if (lenis) lenis.scrollTo(target, { offset: 0 });
  else document.querySelector(target)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
}

/* ----------------------------- Preloader -------------------------------- */
function runPreloader() {
  const pre = $('#preloader');
  const shutter = $('#shutter');
  if (!pre) return Promise.resolve();

  const seen = sessionStorage.getItem('ox_seen');
  const done = () => {
    pre.style.display = 'none';
    document.body.classList.add('loaded');
  };

  if (seen || reduceMotion) {
    done();
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const bar = $('#preBar');
    const pct = $('#prePct');
    const state = { v: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        // shutter / exposure wipe
        shutter.style.display = 'block';
        const panels = $$('#shutter span');
        gsap.set(panels, { transformOrigin: 'top' });
        gsap
          .timeline({
            onComplete: () => {
              shutter.style.display = 'none';
              sessionStorage.setItem('ox_seen', '1');
              resolve();
            },
          })
          .to(pre, { opacity: 0, duration: 0.3 }, 0)
          .fromTo(panels, { scaleY: 1 }, { scaleY: 0, duration: 0.6, stagger: 0.04, ease: 'power3.inOut' }, 0.05)
          .add(done);
      },
    });
    tl.to(state, {
      v: 100,
      duration: 1.0,
      ease: 'power2.inOut',
      onUpdate: () => {
        const val = Math.round(state.v);
        if (pct) pct.textContent = val + '%';
        if (bar) bar.style.width = val + '%';
      },
    });
  });
}

/* ------------------------------- Nav ------------------------------------ */
function initNav() {
  const nav = $('#nav');
  const burger = $('#burger');
  const overlay = $('#navOverlay');

  // Plain passive scroll listener — reliable (Lenis scrolls the window natively).
  const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 80);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger?.setAttribute('aria-expanded', String(open));
    burger?.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    overlay?.setAttribute('aria-hidden', String(!open));
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger?.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.nav-overlay__link', overlay).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));
}

/* ------------------------- Custom cursor -------------------------------- */
function initCursor() {
  if (!canHover || reduceMotion) return;
  const dot = $('#cursor');
  const ring = $('#cursorRing');
  if (!dot || !ring) return;
  const pos = { x: innerWidth / 2, y: innerHeight / 2 };
  const ring2 = { x: pos.x, y: pos.y };
  window.addEventListener('mousemove', (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
  });
  gsap.ticker.add(() => {
    ring2.x += (pos.x - ring2.x) * 0.18;
    ring2.y += (pos.y - ring2.y) * 0.18;
    ring.style.transform = `translate3d(${ring2.x}px, ${ring2.y}px, 0)`;
  });
  const play = (on) => document.body.classList.toggle('cursor-play', on);
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('[data-cursor="play"]')) play(true);
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('[data-cursor="play"]')) play(false);
  });
}

/* --------------------------- Scroll reveals ----------------------------- */
/* IntersectionObserver-driven (fires reliably regardless of rAF cadence and
   is cheaper than a scroll-tween). A failsafe timer guarantees no .reveal can
   ever remain hidden. */
function initReveals() {
  const els = $$('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      let n = 0;
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        el.style.transitionDelay = (n++ % 5) * 70 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
  );
  els.forEach((el) => io.observe(el));
  // Belt-and-braces: reveal anything still hidden after load settles.
  setTimeout(() => els.forEach((el) => el.classList.add('is-in')), 4000);
}

/* ------------------------------- Hero ----------------------------------- */
function initHero() {
  const hero = $('#hero');
  if (!hero) return;

  // Headline mask reveal — CSS-transition driven (resilient; the word-swap
  // rotation is handled entirely in CSS). Staggered class toggles only.
  const masks = $$('.hero__title .mask', hero);
  masks.forEach((m, i) => setTimeout(() => m.classList.add('is-in'), 150 + i * 90));

  // lazy hero video on capable devices only (keeps mobile/slow fast)
  const video = $('#heroVideo');
  const conn = navigator.connection || {};
  const capable = canHover && !reduceMotion && !conn.saveData && !/2g/.test(conn.effectiveType || '');
  if (video && capable) {
    const src = video.querySelector('source[data-src]');
    if (src) {
      src.src = src.dataset.src;
      video.load();
      const play = () => video.play().then(() => video.classList.add('is-playing')).catch(() => {});
      if (video.readyState >= 2) play();
      else video.addEventListener('canplay', play, { once: true });
    }
  }
}

/* -------------------------- Services list ------------------------------- */
function initServices() {
  const rows = $$('[data-svc-row]');
  if (!rows.length) return;

  if (canHover) {
    const reveal = $('[data-svc-reveal]');
    const img = reveal ? $('img', reveal) : null;
    const target = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    rows.forEach((row) => {
      row.addEventListener('mouseenter', () => {
        if (!reveal) return;
        img.src = row.dataset.img || '';
        reveal.classList.add('is-on');
      });
      row.addEventListener('mouseleave', () => reveal?.classList.remove('is-on'));
    });
    window.addEventListener('mousemove', (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
    });
    if (reveal) {
      gsap.ticker.add(() => {
        cur.x += (target.x - cur.x) * 0.12;
        cur.y += (target.y - cur.y) * 0.12;
        reveal.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0) translate(-50%, -50%)`;
      });
    }
  } else {
    // touch: tap to expand inline thumbnail
    rows.forEach((row) => {
      row.addEventListener('click', () => {
        rows.forEach((r) => r !== row && r.classList.remove('open'));
        row.classList.toggle('open');
        if (lenis) ScrollTrigger.refresh();
      });
    });
  }
}

/* --------------------------- Testimonials ------------------------------- */
function initTestimonials() {
  const root = $('[data-tst]');
  if (!root) return;
  const slides = $$('[data-tst-slide]', root);
  const dots = $$('[data-tst-dot]', root);
  if (slides.length < 2) return;
  let i = 0;
  let timer;
  const go = (n) => {
    i = (n + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('active', k === i));
    dots.forEach((d, k) => d.classList.toggle('active', k === i));
  };
  const auto = () => {
    clearInterval(timer);
    if (!reduceMotion) timer = setInterval(() => go(i + 1), 6000);
  };
  dots.forEach((d) => d.addEventListener('click', () => { go(+d.dataset.tstDot); auto(); }));
  auto();
}

/* ---------------------------- Parallax ---------------------------------- */
function initParallax() {
  if (reduceMotion) return;
  $$('[data-parallax], .about__media img, .pagehead__media img, .svc-sec__media img, .deck__bg img, .split__media img').forEach((el) => {
    gsap.fromTo(
      el,
      { yPercent: -8 },
      {
        yPercent: 8,
        ease: 'none',
        scrollTrigger: { trigger: el.closest('section, div'), start: 'top bottom', end: 'bottom top', scrub: true },
      }
    );
  });
}

/* --------------------------- Smooth anchors ----------------------------- */
function initAnchors() {
  $$('[data-scroll]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (href?.startsWith('#')) {
        e.preventDefault();
        scrollTo(href);
      }
    });
  });
}

/* ------------------------------- Boot ----------------------------------- */
async function boot() {
  initSmoothScroll();
  initNav();
  initCursor();
  initHero();
  initServices();
  initTestimonials();
  initAnchors();
  initReveals();
  initParallax();

  // Page-specific modules (code-split)
  if ($('[data-portfolio]')) import('./portfolio.js').then((m) => m.initPortfolio({ gsap, lenis, canHover, reduceMotion }));
  if ($('[data-contact-form]')) import('./contact.js').then((m) => m.initContact());

  await runPreloader();
  ScrollTrigger.refresh();
  // Re-refresh once fonts/late media settle to keep triggers accurate
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
