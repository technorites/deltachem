/**
 * DeltaChem Global Action Animations Controller
 */
(function () {
  'use strict';

  // 1. IntersectionObserver for Viewport Scroll Reveals
  function initScrollReveals() {
    const selector = '.elementor-widget, .elementor-post__card, .elementor-column, .elementor-icon-box';
    const elements = document.querySelectorAll(selector);

    if (!elements.length) return;

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('dc-in-view');
          obs.unobserve(entry.target);
        }
      });
    }, observerOptions);

    elements.forEach((el, index) => {
      if (!el.classList.contains('dc-reveal') && !el.classList.contains('dc-reveal-scale')) {
        // Apply staggered animation styles
        if (index % 3 === 0) {
          el.classList.add('dc-reveal');
        } else if (index % 3 === 1) {
          el.classList.add('dc-reveal-scale');
        } else {
          el.classList.add('dc-reveal-left');
        }
      }
      observer.observe(el);
    });
  }

  // 2. Interactive Ripple Click Effect on Action Buttons
  function initButtonRipples() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.elementor-button, button, .ast-button, .wp-block-button__link');
      if (!btn) return;

      const rect = btn.getBoundingClientRect();
      const circle = document.createElement('span');
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.classList.add('dc-ripple-effect');

      const existingRipple = btn.querySelector('.dc-ripple-effect');
      if (existingRipple) {
        existingRipple.remove();
      }

      btn.appendChild(circle);
    });
  }

  // 3. Instant Menu Link Redirection & Prefetching Engine
  function initInstantNavigation() {
    const prefetchedUrls = new Set();

    // Prefetch page on hover for zero-latency loading
    document.addEventListener('mouseover', (e) => {
      const link = e.target.closest('a[href], .e-n-menu-title, .elementor-item, .menu-item a');
      if (!link) return;

      const href = link.getAttribute('href') || link.querySelector('a')?.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('tel:') || href.startsWith('mailto:')) return;

      try {
        const targetUrl = new URL(href, window.location.origin).href;
        if (targetUrl.startsWith(window.location.origin) && !prefetchedUrls.has(targetUrl)) {
          prefetchedUrls.add(targetUrl);
          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = targetUrl;
          document.head.appendChild(prefetchLink);
        }
      } catch (err) {}
    }, { passive: true });

    // Instant Redirection on Click for Header / Menu Links
    document.addEventListener('click', (e) => {
      const link = e.target.closest('.e-n-menu-title, .elementor-item, .main-header-menu a, header a, nav a, .menu-item a');
      if (!link) return;

      const href = link.getAttribute('href') || link.querySelector('a')?.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('tel:') || href.startsWith('mailto:')) return;

      try {
        const targetUrl = new URL(href, window.location.origin).href;
        if (targetUrl.startsWith(window.location.origin) && targetUrl !== window.location.href) {
          window.location.href = targetUrl;
        }
      } catch (err) {}
    }, true);
  }

  // 4. Initialize Controller
  function init() {
    initScrollReveals();
    initButtonRipples();
    initInstantNavigation();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
