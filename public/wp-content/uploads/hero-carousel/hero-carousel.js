/**
 * DeltaChem Full-Hero Background Carousel Controller
 */
(function () {
  console.log('[HeroCarousel] Initializing...');

  function initHeroBgCarousel() {
    console.log('[HeroCarousel] Running initHeroBgCarousel...');
    const heroSection = document.querySelector('.elementor-element-51baec5');
    if (!heroSection) {
      console.warn('[HeroCarousel] Hero section .elementor-element-51baec5 not found!');
      return;
    }

    const slides = heroSection.querySelectorAll('.deltachem-bg-slide');
    const dots = heroSection.querySelectorAll('.deltachem-hero-dot');
    const prevBtn = heroSection.querySelector('.deltachem-hero-nav.prev');
    const nextBtn = heroSection.querySelector('.deltachem-hero-nav.next');

    console.log('[HeroCarousel] Found slides:', slides.length, 'dots:', dots.length, 'nextBtn:', !!nextBtn);
    if (!slides.length) return;

    let currentIndex = 0;
    const totalSlides = slides.length;
    const slideDuration = 4500; // 4.5 seconds per slide
    let timer = null;

    function showSlide(index) {
      if (index < 0) {
        index = totalSlides - 1;
      } else if (index >= totalSlides) {
        index = 0;
      }

      currentIndex = index;

      // Update slides
      slides.forEach((slide, idx) => {
        if (idx === currentIndex) {
          slide.classList.add('active');
        } else {
          slide.classList.remove('active');
        }
      });

      // Update dots
      dots.forEach((dot, idx) => {
        if (idx === currentIndex) {
          dot.classList.add('active');
          const progress = dot.querySelector('.dot-progress');
          if (progress) {
            progress.style.animation = 'none';
            void progress.offsetWidth; // Trigger reflow
            progress.style.animation = '';
          }
        } else {
          dot.classList.remove('active');
        }
      });

      resetTimer();
    }

    function nextSlide() {
      showSlide(currentIndex + 1);
    }

    function prevSlide() {
      showSlide(currentIndex - 1);
    }

    function startTimer() {
      if (timer) clearInterval(timer);
      timer = setInterval(() => {
        nextSlide();
      }, slideDuration);
    }

    function resetTimer() {
      startTimer();
    }

    // Event Listeners for Nav Buttons
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextSlide();
      });
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevSlide();
      });
    }

    // Event Listeners for Dots (click only, hover ignored)
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showSlide(idx);
      });
    });

    // Touch Swipe Support
    let touchStartX = 0;
    let touchEndX = 0;

    heroSection.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    heroSection.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          nextSlide();
        } else {
          prevSlide();
        }
      }
    }, { passive: true });

    // Keyboard navigation when hero in viewport
    document.addEventListener('keydown', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const inView = rect.top < window.innerHeight && rect.bottom > 0;
      if (!inView) return;

      if (e.key === 'ArrowRight') {
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        prevSlide();
      }
    });

    // Explicitly block/disable all mouse hover events (mouseenter, mouseleave, mouseover, mouseout)
    // so hover is strictly false and never affects carousel playback
    ['mouseenter', 'mouseleave', 'mouseover', 'mouseout'].forEach((evt) => {
      heroSection.addEventListener(evt, (e) => {
        e.stopPropagation();
      }, true);
    });

    // Initial trigger
    showSlide(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroBgCarousel);
  } else {
    initHeroBgCarousel();
  }
})();
