/* ============================================================
   MÆKH — PDP prototype v0.1
   Interactive: swatches, sizes, ATC, mini-cart, sticky bar, modal
   ============================================================ */

const CART_KEY = 'maekh_cart_v1';

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
}
function saveCart() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(STATE.cart)); } catch (e) {}
}

const STATE = {
  product: {
    id: 'black-os-longsleeve',
    title: 'CZARNY LONGSLEEVE OVERSIZE',
    price: 270,
    img: 'assets/product-front.png',
  },
  selectedColor: 'Czarny',
  selectedSize: 'S',
  freeShippingTier: 200, // EUR ≈ 870 zł (sample), trzymamy w EUR ale wyświetlamy w EUR też
  cart: loadCart(),
};

const FREE_SHIP_THRESHOLD_PLN = 870; // 200 EUR ≈ 870 zł

const $  = (s, p = document) => p ? p.querySelector(s) : null;
const $$ = (s, p = document) => p ? [...p.querySelectorAll(s)] : [];

/* ─── 3. Color swatches ────────────────────────────────────── */
function initSwatches() {
  $$('.sw').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.sw').forEach(b => { b.classList.remove('sw--active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('sw--active');
      btn.setAttribute('aria-pressed', 'true');
      STATE.selectedColor = btn.dataset.color;
      $('[data-color-name]').textContent = STATE.selectedColor;
    });
  });
}

/* ─── 6. Sizes + stock indicator ───────────────────────────── */
function initSizes() {
  $$('.size').forEach(btn => {
    if (btn.classList.contains('size--out')) return;
    btn.addEventListener('click', () => {
      $$('.size').forEach(b => { b.classList.remove('size--active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('size--active');
      btn.setAttribute('aria-pressed', 'true');
      STATE.selectedSize = btn.dataset.size;
      const stock = parseInt(btn.dataset.stock || '0', 10);
      const msg = $('[data-stock-msg]');
      const isLow = stock > 0 && stock < 5;
      msg.classList.toggle('is-low', isLow);
      if (stock === 0) {
        msg.innerHTML = '<span class="dot dot--ok" aria-hidden="true"></span><strong>Brak na stanie</strong> — powiadom mnie';
      } else if (isLow) {
        msg.innerHTML = `<span class="dot" aria-hidden="true"></span><strong>Zostały ostatnie ${stock} sztuk(i)</strong> w rozm. ${STATE.selectedSize}`;
      } else {
        msg.innerHTML = `<span class="dot dot--ok" aria-hidden="true"></span><strong>${stock} sztuk dostępnych</strong> w rozm. ${STATE.selectedSize} — wysyłka 24h`;
      }
      // update sticky bar
      const stickySize = $('[data-sticky-size]');
      if (stickySize) stickySize.textContent = STATE.selectedSize;
    });
  });
}

/* ─── 2. Mini-cart with progress bar ───────────────────────── */
function getCartTotal() {
  return STATE.cart.reduce((t, l) => t + l.price * l.qty, 0);
}
function renderCart() {
  const itemsEl = $('[data-cart-items]');
  const footEl  = $('[data-cart-foot]');
  const countEls = $$('[data-cart-count]'); // header + FAB
  const labelEl = $('[data-cart-items-label]');
  const totalEl = $('[data-cart-total]');
  const progFill= $('[data-progress-fill]');
  const progTier= $('[data-progress-tier]');
  const progLabel = $('.cart__progress-label');

  const totalItems = STATE.cart.reduce((t, l) => t + l.qty, 0);
  const total = getCartTotal();
  countEls.forEach(el => {
    el.textContent = totalItems;
    el.classList.add('is-bump');
    setTimeout(() => el.classList.remove('is-bump'), 400);
  });
  if (labelEl) labelEl.textContent = `${totalItems} ${totalItems === 1 ? 'sztuka' : (totalItems > 1 && totalItems < 5 ? 'sztuki' : 'sztuk')}`;
  if (totalEl) totalEl.textContent = total.toFixed(2).replace('.', ',') + ' zł';

  // Progress bar (rebuild progLabel.innerHTML — bez referencji do data-progress-remaining, bo innerHTML overwrite go usuwa)
  if (progFill && progLabel && progTier) {
    const pct = Math.min(100, (total / FREE_SHIP_THRESHOLD_PLN) * 100);
    progFill.style.width = pct + '%';
    if (total >= FREE_SHIP_THRESHOLD_PLN) {
      progFill.classList.add('is-done');
      progLabel.innerHTML = '🎉 <strong>Masz darmową wysyłkę UE!</strong>';
      progTier.innerHTML = '<span class="dot dot--ok"></span> Możesz zrealizować zamówienie';
    } else {
      progFill.classList.remove('is-done');
      const remaining = FREE_SHIP_THRESHOLD_PLN - total;
      const remEur = Math.ceil(remaining / 4.35); // PLN→EUR rough
      progLabel.innerHTML = `Do <strong>darmowej wysyłki UE</strong> brakuje <strong data-progress-remaining>${remEur} EUR</strong>`;
      progTier.innerHTML = totalItems === 0
        ? '<span class="dot dot--ok"></span> Dodaj produkt aby zacząć'
        : `<span class="dot dot--ok"></span> Dodaj jeszcze <strong>${(remaining).toFixed(0)} zł</strong>, by uniknąć kosztu wysyłki`;
    }
  }

  // Items render
  if (!itemsEl) return;
  if (STATE.cart.length === 0) {
    itemsEl.innerHTML = '<div class="cart__empty"><p>Koszyk jest pusty</p><a class="cart__continue" href="#" data-cart-close-link>Wróć do zakupów</a></div>';
    if (footEl) footEl.hidden = true;
  } else {
    itemsEl.innerHTML = STATE.cart.map((l, i) => `
      <div class="cart__line">
        <div class="cart__line-img" style="background-image:url('${l.img}')"></div>
        <div class="cart__line-body">
          <p class="cart__line-title">${l.title}</p>
          <p class="cart__line-meta">${l.color} · ${l.size} · ${l.price.toFixed(2).replace('.', ',')} zł / szt.</p>
          <div class="cart__line-bot">
            <div class="cart__qty">
              <button data-qty-dec="${i}" aria-label="Zmniejsz ilość">−</button>
              <span>${l.qty}</span>
              <button data-qty-inc="${i}" aria-label="Zwiększ ilość">+</button>
            </div>
            <p class="cart__line-price">${(l.price * l.qty).toFixed(2).replace('.', ',')} zł</p>
          </div>
          <button class="cart__line-remove" data-remove="${i}">Usuń</button>
        </div>
      </div>
    `).join('');
    if (footEl) footEl.hidden = false;

    // qty + remove handlers (rebind po render)
    $$('[data-qty-inc]').forEach(b => b.addEventListener('click', () => {
      STATE.cart[+b.dataset.qtyInc].qty++;
      saveCart(); renderCart();
    }));
    $$('[data-qty-dec]').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.qtyDec;
      STATE.cart[i].qty--;
      if (STATE.cart[i].qty < 1) STATE.cart.splice(i, 1);
      saveCart(); renderCart();
    }));
    $$('[data-remove]').forEach(b => b.addEventListener('click', () => {
      STATE.cart.splice(+b.dataset.remove, 1);
      saveCart(); renderCart();
    }));
  }

  // close-link rebind
  $$('[data-cart-close-link]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); closeCart(); }));
}

function openCart() {
  $('[data-cart]').classList.add('is-open');
  $('[data-cart]').setAttribute('aria-hidden', 'false');
  $('[data-cart-backdrop]').classList.add('is-open');
  $('[data-cart-backdrop]').setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}
function closeCart() {
  $('[data-cart]').classList.remove('is-open');
  $('[data-cart]').setAttribute('aria-hidden', 'true');
  $('[data-cart-backdrop]').classList.remove('is-open');
  $('[data-cart-backdrop]').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
}

function addToCart() {
  const existing = STATE.cart.find(l =>
    l.id === STATE.product.id && l.size === STATE.selectedSize && l.color === STATE.selectedColor
  );
  if (existing) {
    existing.qty++;
  } else {
    STATE.cart.push({
      id: STATE.product.id,
      title: STATE.product.title,
      img: STATE.product.img,
      price: STATE.product.price,
      size: STATE.selectedSize,
      color: STATE.selectedColor,
      qty: 1,
    });
  }
  saveCart();
  renderCart();
  showToast('Dodano do koszyka · ' + STATE.product.title);
  // open after short delay (user sees toast first)
  setTimeout(openCart, 600);
}

/* ─── Toast feedback ───────────────────────────────────────── */
let toastTimer;
function showToast(msg) {
  const t = $('[data-toast]');
  $('[data-toast-text]').textContent = msg;
  t.classList.add('is-show');
  t.setAttribute('aria-hidden', 'false');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove('is-show');
    t.setAttribute('aria-hidden', 'true');
  }, 2500);
}

/* ─── 1. Sticky ATC bar (mobile + when primary out of viewport) */
function initStickyATC() {
  const sticky = $('[data-sticky-atc]');
  const primary = $('[data-atc]');
  if (!sticky || !primary) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const out = !e.isIntersecting;
      sticky.classList.toggle('is-visible', out);
      sticky.setAttribute('aria-hidden', String(!out));
    });
  }, { threshold: 0.1 });
  io.observe(primary);
}

/* ─── Size guide modal ─────────────────────────────────────── */
function initModal() {
  const modal = $('[data-modal="size"]');
  if (!modal) return;
  const open  = $('[data-size-guide]');
  const closes = $$('[data-modal-close]', modal);
  open?.addEventListener('click', () => {
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  });
  closes.forEach(c => c.addEventListener('click', () => {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  }));
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }
  });
}

/* ─── Newsletter (habit loop trigger) ──────────────────────── */
function initNews() {
  const form = $('[data-news]');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input');
    showToast('Dzięki! ⊕ Powiadomimy Cię 24h przed dropem');
    input.value = '';
  });
}

/* ─── Bind global handlers ─────────────────────────────────── */
function initCartHandlers() {
  $('[data-atc]')?.addEventListener('click', addToCart);
  $('[data-atc-mobile]')?.addEventListener('click', addToCart);
  $('[data-buy-now]')?.addEventListener('click', () => {
    addToCart();
    setTimeout(() => showToast('Przekierowywanie do Shop Pay…'), 800);
  });
  $$('[data-cart-trigger]').forEach(b => b.addEventListener('click', openCart));
  $('[data-cart-close]')?.addEventListener('click', closeCart);
  $('[data-cart-backdrop]')?.addEventListener('click', closeCart);
  $('[data-checkout]')?.addEventListener('click', () => showToast('Przekierowywanie do kasy…'));
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' && $('[data-cart]').classList.contains('is-open')) closeCart();
  });
}

/* ─── Scroll reveals (IntersectionObserver + safety fallback) ─── */
function initReveals() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('is-in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px 0px 100px 0px' });
  els.forEach(e => io.observe(e));
  // SAFETY: po 1s sprawdź ponownie i odsłoń elementy widoczne natywnie
  // (Playwright fullPage screenshot, headless quirks, slow devices)
  setTimeout(() => {
    els.forEach(e => {
      if (e.classList.contains('is-in')) return;
      const r = e.getBoundingClientRect();
      const vh = window.innerHeight;
      // jeśli element jest w/przed viewport lub blisko (< 2× vh poniżej) — pokaż
      if (r.top < vh * 2 || r.bottom > 0) {
        e.classList.add('is-in');
      }
    });
  }, 1000);
}

/* ─── Header shrink on scroll ───────────────────────────────── */
function initHeaderShrink() {
  const hdr = document.querySelector('.hdr');
  if (!hdr) return;
  let last = 0, ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = window.scrollY;
        hdr.classList.toggle('is-shrunk', y > 80);
        last = y;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ─── ATC ripple effect ─────────────────────────────────────── */
function initATCRipple() {
  $$('.atc, .stickybar__atc').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.remove('is-ripple');
      void btn.offsetWidth; // force reflow
      btn.classList.add('is-ripple');
      setTimeout(() => btn.classList.remove('is-ripple'), 700);
    });
  });
}

/* ─── Search overlay ────────────────────────────────────────── */
function initSearch() {
  const overlay = $('[data-search]');
  if (!overlay) return;
  const input = $('[data-search-input]', overlay);
  const clearBtn = $('[data-search-clear]', overlay);
  const hints = $('[data-search-hints]', overlay);
  const results = $('[data-search-results]', overlay);
  const resultsGrid = $('[data-results-grid]', overlay);
  const resultsCount = $('[data-results-count]', overlay);
  const empty = $('[data-search-empty]', overlay);

  // Fake search corpus (per prototype demo)
  const CORPUS = [
    { name: 'CZARNY LONGSLEEVE OVERSIZE', price: '270,00 zł', img: 'assets/product-front.png', tags: 'longsleeve oversize czarny' },
    { name: 'BIAŁY LONGSLEEVE OVERSIZE', price: '270,00 zł', img: 'assets/product-back.png', tags: 'longsleeve oversize biały' },
    { name: 'VINTAGE BLACK LONGSLEEVE', price: '370,00 zł', img: 'assets/product-back.png', tags: 'longsleeve vintage black' },
    { name: 'CZARNA BLUZA Z KAPTUREM OVERSIZE', price: '400,00 zł', img: 'assets/product-lifestyle-1.jpg', tags: 'bluza kaptur hoodie czarna oversize' },
    { name: 'BLUZA Z KAPTUREM VINTAGE BLACK', price: '400,00 zł', img: 'assets/product-lifestyle-2.jpg', tags: 'bluza kaptur hoodie vintage black' },
    { name: 'MAEKH PROTEIN BAR', price: '12,00 zł', img: 'assets/product-front.png', tags: 'protein bar baton' },
    { name: 'MAEKH RUNNING SOCKS', price: '85,00 zł', img: 'assets/product-back.png', tags: 'skarpetki running biegowe' },
    { name: 'CHAPTER ONE TEE', price: '320,00 zł', img: 'assets/product-front.png', tags: 'tee koszulka chapter one' },
  ];

  function open() {
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    setTimeout(() => input?.focus(), 400);
  }
  function close() {
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    input.value = '';
    clearBtn.hidden = true;
    hints.hidden = false;
    results.hidden = true;
  }
  function doSearch(q) {
    q = q.toLowerCase().trim();
    if (!q) { hints.hidden = false; results.hidden = true; return; }
    const matched = CORPUS.filter(p =>
      p.name.toLowerCase().includes(q) || (p.tags || '').toLowerCase().includes(q)
    );
    hints.hidden = true;
    results.hidden = false;
    resultsCount.textContent = matched.length;
    if (matched.length === 0) {
      resultsGrid.innerHTML = '';
      empty.hidden = false;
    } else {
      empty.hidden = true;
      resultsGrid.innerHTML = matched.map((p, i) => `
        <a class="search__product" href="#" style="--p-delay:${i*40}ms">
          <div class="search__product-img" style="background-image:url('${p.img}')"></div>
          <div><p class="search__product-name">${p.name}</p><p class="search__product-price">${p.price}</p></div>
        </a>
      `).join('');
    }
  }

  $$('[data-search-trigger]').forEach(b => b.addEventListener('click', open));
  $$('[data-search-close]', overlay).forEach(b => b.addEventListener('click', close));
  input?.addEventListener('input', () => {
    clearBtn.hidden = !input.value;
    doSearch(input.value);
  });
  clearBtn?.addEventListener('click', () => { input.value = ''; clearBtn.hidden = true; doSearch(''); input.focus(); });
  $$('[data-search-q]', overlay).forEach(chip => chip.addEventListener('click', () => {
    input.value = chip.dataset.searchQ;
    clearBtn.hidden = false;
    doSearch(input.value);
    input.focus();
  }));
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' && overlay.getAttribute('aria-hidden') === 'false') close();
    if (e.key === '/' && overlay.getAttribute('aria-hidden') === 'true' && document.activeElement?.tagName !== 'INPUT') {
      e.preventDefault();
      open();
    }
  });
}

/* ─── Mobile drawer ─────────────────────────────────────────── */
function initDrawer() {
  const drawer = $('[data-drawer]');
  const backdrop = $('[data-drawer-backdrop]');
  if (!drawer) return;
  function open() {
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop?.classList.add('is-open');
    document.body.classList.add('no-scroll', 'drawer-open');
  }
  function close() {
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop?.classList.remove('is-open');
    document.body.classList.remove('no-scroll', 'drawer-open');
  }
  $$('[data-drawer-trigger]').forEach(b => b.addEventListener('click', open));
  $$('[data-drawer-close]').forEach(b => b.addEventListener('click', close));
  backdrop?.addEventListener('click', close);
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) close();
  });
  // klik link w drawer = zamknij (smooth UX)
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setTimeout(close, 120)));
}

/* ─── Newsletter modal z rabatem 10% (popup po 12s lub exit-intent) ─── */
function initNewsletterModal() {
  const modal = $('[data-news-modal]');
  if (!modal) return;
  const DISMISSED_KEY = 'maekh_news_modal_dismissed';
  const dismissed = sessionStorage.getItem(DISMISSED_KEY);
  if (dismissed === 'true') return;

  function open() {
    if (modal.getAttribute('aria-hidden') === 'false') return;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
  }
  function close() {
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    sessionStorage.setItem(DISMISSED_KEY, 'true');
  }

  // Trigger #1: delayed 12s
  const timer = setTimeout(open, 12000);

  // Trigger #2: exit-intent (mouse leaves top of viewport)
  let exitTriggered = false;
  document.addEventListener('mouseout', (e) => {
    if (!exitTriggered && e.clientY < 5 && !e.relatedTarget) {
      exitTriggered = true;
      clearTimeout(timer);
      open();
    }
  });

  // Close handlers
  $$('[data-news-modal-close]').forEach(b => b.addEventListener('click', close));
  $('[data-news-modal-backdrop]')?.addEventListener('click', close);
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') close();
  });
  // submit form
  modal.querySelector('form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = 'MAEKH10';
    const codeEl = $('[data-news-modal-code]', modal);
    if (codeEl) codeEl.hidden = false;
    showToast('Dzięki! Kod rabatowy: ' + code + ' (-10%)');
    setTimeout(close, 3500);
  });
}

/* ─── Cookies modal (centered fullscreen + backdrop blur) ─── */
function initCookies() {
  const modal = $('[data-cookies]');
  if (!modal) return;
  const ACCEPTED_KEY = 'maekh_cookies_v1';
  const stored = localStorage.getItem(ACCEPTED_KEY);
  if (stored) {
    modal.setAttribute('aria-hidden', 'true');
    return;
  }
  // delay 1.2s — let page settle
  setTimeout(() => {
    modal.setAttribute('aria-hidden', 'false');
  }, 1200);

  function accept(scope) {
    localStorage.setItem(ACCEPTED_KEY, JSON.stringify({ scope, at: new Date().toISOString() }));
    modal.setAttribute('aria-hidden', 'true');
  }
  $('[data-cookies-accept-all]')?.addEventListener('click', () => accept('all'));
  $('[data-cookies-reject]')?.addEventListener('click', () => accept('necessary'));
  $('[data-cookies-customize]')?.addEventListener('click', () => {
    const panel = $('[data-cookies-panel]');
    if (panel) panel.hidden = !panel.hidden;
  });
}

/* ─── Mega menu hover (desktop only) ────────────────────────── */
function initMegaMenu() {
  $$('.mega__trigger').forEach(trigger => {
    const target = document.querySelector(trigger.dataset.megaTarget);
    if (!target) return;
    let timer;
    const open = () => {
      clearTimeout(timer);
      $$('.mega__panel').forEach(p => p.classList.remove('is-open'));
      target.classList.add('is-open');
      trigger.setAttribute('aria-expanded', 'true');
    };
    const close = () => {
      timer = setTimeout(() => {
        target.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      }, 200);
    };
    trigger.addEventListener('mouseenter', open);
    trigger.addEventListener('focus', open);
    trigger.addEventListener('mouseleave', close);
    target.addEventListener('mouseenter', () => clearTimeout(timer));
    target.addEventListener('mouseleave', close);
  });
}

/* ─── Collection filters (interactive) ─────────────────────── */
function initFilters() {
  const layout = $('.coll__layout');
  if (!layout) return;

  // Filter toggle (mobile)
  const filterToggle = $('[data-filter-toggle]');
  const filterPanel = $('[data-filters]');
  filterToggle?.addEventListener('click', () => {
    const open = !filterPanel.classList.contains('is-open');
    filterPanel.classList.toggle('is-open', open);
    filterToggle.setAttribute('aria-expanded', String(open));
  });

  // Live filtering — pseudo (toggle is-active class on cards based on swatch/size/category)
  const cards = $$('.coll__grid .prod-card');
  const state = { cat: 'all', color: 'all', size: 'all', sort: 'recommended' };

  function applyFilters() {
    let visible = 0;
    cards.forEach((c, idx) => {
      const matches = true; // pseudo demo — wszystkie matchują "swag" demo
      c.style.display = matches ? '' : 'none';
      if (matches) {
        visible++;
        // re-apply stagger animation
        c.style.animation = 'none';
        void c.offsetWidth;
        c.style.animation = `card-rise 0.6s var(--ease) ${idx * 40}ms backwards`;
      }
    });
    showToast(`${visible} produkt${visible === 1 ? '' : visible > 1 && visible < 5 ? 'y' : 'ów'}`);
  }

  // Sort select
  $('.filters__select')?.addEventListener('change', (e) => {
    state.sort = e.target.value;
    applyFilters();
  });

  // Category checkboxes
  $$('.filters__group input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', applyFilters);
  });

  // Color swatches
  $$('.filters__swatch').forEach(sw => {
    sw.addEventListener('click', () => {
      sw.classList.toggle('is-active');
      applyFilters();
    });
  });

  // Size buttons
  $$('.filters__sizes button').forEach(b => {
    b.addEventListener('click', () => {
      $$('.filters__sizes button').forEach(x => x.classList.remove('is-active'));
      b.classList.add('is-active');
      state.size = b.textContent.trim();
      applyFilters();
    });
  });

  // Price range
  $('.filters input[type="range"]')?.addEventListener('input', (e) => {
    const v = e.target.value;
    const lbl = $('.filters__price-range');
    if (lbl) lbl.textContent = `0 — ${v} zł`;
  });

  // Clear
  $('.filters__clear')?.addEventListener('click', () => {
    $$('.filters input[type="checkbox"]').forEach(cb => { cb.checked = cb.disabled; });
    $$('.filters__swatch').forEach(sw => sw.classList.remove('is-active'));
    $$('.filters__sizes button').forEach(b => b.classList.remove('is-active'));
    const sel = $('.filters__select'); if (sel) sel.selectedIndex = 0;
    const rng = $('.filters input[type="range"]'); if (rng) { rng.value = 425; const lbl = $('.filters__price-range'); if (lbl) lbl.textContent = '0 — 850 zł'; }
    applyFilters();
  });
}

/* ─── SWAG: magnetic hover na CTAs ─────────────────────────── */
function initMagnetic() {
  $$('.hero__cta, .lookbook__cta, .news__form button, .atc, .drawer__cta-btn').forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width/2) * 0.18;
      const dy = (e.clientY - r.top - r.height/2) * 0.18;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* ─── SWAG: scroll-driven hero parallax ────────────────────── */
function initParallax() {
  const hero = $('.hero__bg');
  if (!hero) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 800);
        hero.style.transform = `translateY(${y * 0.4}px) scale(${1 + y * 0.0002})`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

/* ─── SWAG: cursor accent dot (desktop only) ───────────────── */
function initCursor() {
  if (window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches) return;
  const dot = document.createElement('div');
  dot.className = 'swag-cursor';
  document.body.appendChild(dot);
  let x = 0, y = 0;
  window.addEventListener('mousemove', (e) => {
    x = e.clientX; y = e.clientY;
    dot.style.transform = `translate(${x}px, ${y}px)`;
  });
  // hover state on links/buttons
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button')) dot.classList.add('is-hover');
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('a, button')) dot.classList.remove('is-hover');
  });
}

/* ═══════════════════════════════════════════════════════════════
   SMOOTH COLLAPSE — szuflady/<details> z animacją in/out (nie skacze)
   Animuje max-height od 0 → scrollHeight przez 0.45s ease-out-quart.
   Po końcu animacji ustawia max-height: none (pozwala na content reflow).
   ═══════════════════════════════════════════════════════════════ */
function initCollapse() {
  const easeOutQuart = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const duration = 450; // ms

  document.querySelectorAll('details').forEach(d => {
    const summary = d.querySelector(':scope > summary');
    if (!summary) return;
    // Body to wszystko poza <summary>, owinięte w jeden node jeśli więcej niż jeden
    let body;
    const nonSummary = Array.from(d.children).filter(c => c.tagName !== 'SUMMARY');
    if (nonSummary.length === 1) {
      body = nonSummary[0];
    } else if (nonSummary.length > 1) {
      // owijam w wrapper
      const wrap = document.createElement('div');
      wrap.className = 'collapse__wrap';
      nonSummary.forEach(n => wrap.appendChild(n));
      d.appendChild(wrap);
      body = wrap;
    } else {
      return;
    }

    d.setAttribute('data-collapse', '');
    body.style.transition = `max-height ${duration}ms ${easeOutQuart}, opacity ${duration - 100}ms ${easeOutQuart}`;
    body.style.overflow = 'hidden';

    // Stan początkowy
    if (!d.hasAttribute('open')) {
      body.style.maxHeight = '0px';
      body.style.opacity = '0';
    } else {
      body.style.maxHeight = 'none';
      body.style.opacity = '1';
    }

    let animating = false;
    summary.addEventListener('click', (ev) => {
      ev.preventDefault();
      if (animating) return;
      animating = true;

      if (d.hasAttribute('open')) {
        // ─── CLOSE ─────────────────────────────
        body.style.maxHeight = body.scrollHeight + 'px';
        // force reflow
        void body.offsetHeight;
        requestAnimationFrame(() => {
          body.style.maxHeight = '0px';
          body.style.opacity = '0';
        });
        const onEnd = (e) => {
          if (e.propertyName !== 'max-height') return;
          d.removeAttribute('open');
          body.removeEventListener('transitionend', onEnd);
          animating = false;
        };
        body.addEventListener('transitionend', onEnd);
      } else {
        // ─── OPEN ──────────────────────────────
        d.setAttribute('open', '');
        body.style.maxHeight = '0px';
        body.style.opacity = '0';
        void body.offsetHeight;
        requestAnimationFrame(() => {
          body.style.maxHeight = body.scrollHeight + 'px';
          body.style.opacity = '1';
        });
        const onEnd = (e) => {
          if (e.propertyName !== 'max-height') return;
          body.style.maxHeight = 'none'; // pozwól na auto-grow
          body.removeEventListener('transitionend', onEnd);
          animating = false;
        };
        body.addEventListener('transitionend', onEnd);
      }
    });
  });
}

/* ─── Init ─────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initSwatches();
  initSizes();
  initCartHandlers();
  initStickyATC();
  initModal();
  initNews();
  initReveals();
  initHeaderShrink();
  initATCRipple();
  initSearch();
  initDrawer();
  initNewsletterModal();
  initCookies();
  initMegaMenu();
  initFilters();
  initMagnetic();
  initParallax();
  initCursor();
  initCollapse();
  renderCart();
});
