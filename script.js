(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    mobileNav.classList.toggle('is-open', open);
    mobileNav.inert = !open;
    document.body.classList.toggle('menu-open', open);
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobileNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries, currentObserver) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          currentObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -36px 0px' });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }

  const track = document.querySelector('.story-track');
  const cards = [...track.querySelectorAll('.story-card')];
  const progress = document.querySelector('.story-progress span');
  let storyIndex = 0;
  const visibleCount = () => window.matchMedia('(max-width: 640px)').matches ? 1 : window.matchMedia('(max-width: 900px)').matches ? 2 : 3;
  const updateStories = () => {
    const maxIndex = Math.max(0, cards.length - visibleCount());
    storyIndex = Math.min(storyIndex, maxIndex);
    const cardWidth = cards[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    track.style.transform = `translateX(-${storyIndex * (cardWidth + gap)}px)`;
    progress.style.width = `${100 / (maxIndex + 1)}%`;
    progress.style.transform = `translateX(${storyIndex * 100}%)`;
  };
  document.querySelectorAll('[data-story]').forEach((button) => button.addEventListener('click', () => {
    const maxIndex = Math.max(0, cards.length - visibleCount());
    storyIndex = button.dataset.story === 'next' ? Math.min(maxIndex, storyIndex + 1) : Math.max(0, storyIndex - 1);
    updateStories();
  }));
  window.addEventListener('resize', updateStories, { passive: true });
  updateStories();

  document.querySelectorAll('[data-copy]').forEach((button) => button.addEventListener('click', async () => {
    const original = 'Copy account number';
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.innerHTML = 'Account number copied <span aria-hidden="true">✓</span>';
    } catch {
      button.textContent = button.dataset.copy;
    }
    window.setTimeout(() => { button.innerHTML = `${original} <span aria-hidden="true">↗</span>`; }, 2200);
  }));
})();
