(() => {
  const theme = window.theme || {};
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const debounce = (fn, wait = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  const parseHTML = (html) => new DOMParser().parseFromString(html, 'text/html');

  const toast = (message) => {
    let el = $('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('is-visible'), 2600);
  };

  /* Drawers */
  const DRAWERS = '[data-menu-drawer], [data-cart-drawer], [data-search-drawer], [data-filters-drawer], [data-size-guide]';
  let lastFocus = null;

  const openDrawer = (drawer) => {
    if (!drawer) return;
    $$(DRAWERS).forEach((d) => d !== drawer && d.classList.contains('is-open') && closeDrawer(d, false));
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    const focusTarget = $('[data-predictive-input]', drawer) || $('[role="dialog"]', drawer) || drawer;
    setTimeout(() => focusTarget.focus({ preventScroll: true }), 50);
  };

  const closeDrawer = (drawer, restoreFocus = true) => {
    if (!drawer) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (!$$(DRAWERS).some((d) => d.classList.contains('is-open'))) document.body.classList.remove('is-locked');
    if (restoreFocus && lastFocus) lastFocus.focus({ preventScroll: true });
  };

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('[data-menu-open]')) {
      e.preventDefault();
      openDrawer($('[data-menu-drawer]'));
    } else if (t.closest('[data-search-open]')) {
      e.preventDefault();
      openDrawer($('[data-search-drawer]'));
    } else if (t.closest('[data-cart-open]') && theme.cartType === 'drawer' && !document.body.classList.contains('template-cart')) {
      e.preventDefault();
      openDrawer($('[data-cart-drawer]'));
    } else if (t.closest('[data-filters-open]')) {
      e.preventDefault();
      openDrawer($('[data-filters-drawer]'));
    } else if (t.closest('[data-size-guide-open]')) {
      e.preventDefault();
      openDrawer($('[data-size-guide]'));
    } else if (t.closest('[data-drawer-close]')) {
      e.preventDefault();
      closeDrawer(t.closest(DRAWERS));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$(DRAWERS).forEach((d) => d.classList.contains('is-open') && closeDrawer(d));
  });

  /* Header */
  const initHeader = () => {
    const header = $('[data-header]');
    if (!header) return;
    const setHeight = () => {
      const sticky = header.classList.contains('header--sticky');
      document.documentElement.style.setProperty('--header-height', sticky ? `${header.offsetHeight}px` : '0px');
    };
    setHeight();
    window.addEventListener('resize', debounce(setHeight, 150));

    if (header.classList.contains('header--transparent')) {
      const onScroll = () => header.classList.toggle('is-solid', window.scrollY > 40);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    $$('[data-nav-item]', header).forEach((item) => {
      const link = $('.nav__link[aria-haspopup]', item);
      if (!link) return;
      item.addEventListener('mouseenter', () => link.setAttribute('aria-expanded', 'true'));
      item.addEventListener('mouseleave', () => link.setAttribute('aria-expanded', 'false'));
    });
  };

  /* Announcement */
  const initAnnouncement = (root = document) => {
    $$('[data-announcement]', root).forEach((bar) => {
      if (bar._init) return;
      bar._init = true;
      const items = $$('.announcement__item', bar);
      if (items.length < 2) return;
      let index = 0;
      const show = (i) => {
        index = (i + items.length) % items.length;
        items.forEach((it, n) => it.classList.toggle('is-active', n === index));
      };
      const interval = (parseInt(bar.dataset.interval, 10) || 5) * 1000;
      let timer = setInterval(() => show(index + 1), interval);
      const reset = () => {
        clearInterval(timer);
        timer = setInterval(() => show(index + 1), interval);
      };
      $('[data-ann-prev]', bar)?.addEventListener('click', () => { show(index - 1); reset(); });
      $('[data-ann-next]', bar)?.addEventListener('click', () => { show(index + 1); reset(); });
    });
  };

  /* Countdown */
  const initCountdown = (root = document) => {
    $$('[data-countdown]', root).forEach((bar) => {
      if (bar._init) return;
      bar._init = true;
      const raw = bar.dataset.end;
      if (!raw) return;
      let iso = raw.trim().replace(' ', 'T');
      if (/T\d\d:\d\d$/.test(iso)) iso += ':00-03:00';
      else if (/T\d\d:\d\d:\d\d$/.test(iso)) iso += '-03:00';
      else if (/^\d{4}-\d\d-\d\d$/.test(iso)) iso += 'T23:59:59-03:00';
      const end = new Date(iso);
      if (Number.isNaN(end.getTime())) return;
      const pad = (n) => String(n).padStart(2, '0');
      const tick = () => {
        const diff = end - new Date();
        if (diff <= 0) {
          if (bar.dataset.hideExpired === 'true') bar.hidden = true;
          ['days', 'hours', 'minutes', 'seconds'].forEach((k) => {
            const el = $(`[data-cd-${k}]`, bar);
            if (el) el.textContent = '00';
          });
          clearInterval(bar._timer);
          return;
        }
        const s = Math.floor(diff / 1000);
        const values = { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
        Object.entries(values).forEach(([k, v]) => {
          const el = $(`[data-cd-${k}]`, bar);
          if (el) el.textContent = pad(v);
        });
      };
      tick();
      bar._timer = setInterval(tick, 1000);
    });
  };

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.classList.add('is-copied');
      toast(btn.dataset.copy);
    } catch (err) {
      toast(btn.dataset.copy);
    }
  });

  /* Slideshow */
  const initSlideshows = (root = document) => {
    $$('[data-slideshow]', root).forEach((show) => {
      if (show._init) return;
      show._init = true;
      const slides = $$('[data-slide]', show);
      const dots = $$('[data-slide-to]', show);
      if (slides.length < 2) return;
      let index = 0;
      let timer = null;
      const go = (i) => {
        index = (i + slides.length) % slides.length;
        slides.forEach((s, n) => {
          const active = n === index;
          s.classList.toggle('is-active', active);
          s.setAttribute('aria-hidden', active ? 'false' : 'true');
          $$('a, button', s).forEach((el) => (active ? el.removeAttribute('tabindex') : el.setAttribute('tabindex', '-1')));
          $$('video', s).forEach((v) => (active ? v.play().catch(() => {}) : v.pause()));
        });
        dots.forEach((d, n) => d.classList.toggle('is-active', n === index));
      };
      const autoplay = show.dataset.autoplay === 'true';
      const interval = (parseInt(show.dataset.interval, 10) || 6) * 1000;
      const start = () => {
        if (!autoplay) return;
        stop();
        timer = setInterval(() => go(index + 1), interval);
      };
      const stop = () => timer && clearInterval(timer);
      $('[data-slide-prev]', show)?.addEventListener('click', () => { go(index - 1); start(); });
      $('[data-slide-next]', show)?.addEventListener('click', () => { go(index + 1); start(); });
      dots.forEach((d) => d.addEventListener('click', () => { go(parseInt(d.dataset.slideTo, 10)); start(); }));
      show.addEventListener('mouseenter', stop);
      show.addEventListener('mouseleave', start);
      show.addEventListener('focusin', stop);

      let startX = null;
      show.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      show.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) { go(dx < 0 ? index + 1 : index - 1); start(); }
        startX = null;
      });

      show._go = go;
      go(0);
      start();
    });
  };

  /* Horizontal scrollers */
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-scroll-prev], [data-scroll-next]');
    if (!btn) return;
    const section = btn.closest('.shelf');
    const scroller = section && $('[data-scroller]', section);
    if (!scroller) return;
    const dir = btn.hasAttribute('data-scroll-next') ? 1 : -1;
    scroller.scrollBy({ left: dir * scroller.clientWidth * 0.8, behavior: 'smooth' });
  });

  /* Cart */
  const cartSections = () => ['cart-drawer'];

  const renderCart = (sections) => {
    if (!sections) return;
    const html = sections['cart-drawer'];
    if (!html) return;
    const doc = parseHTML(html);
    const fresh = $('[data-cart-drawer]', doc);
    const current = $('[data-cart-drawer]');
    if (fresh && current) {
      const wasOpen = current.classList.contains('is-open');
      current.replaceWith(fresh);
      if (wasOpen) {
        fresh.classList.add('is-open');
        fresh.setAttribute('aria-hidden', 'false');
      }
      updateCount(parseInt(fresh.dataset.count, 10) || 0);
    }
  };

  const updateCount = (count) => {
    $$('[data-cart-count]').forEach((el) => {
      el.textContent = count;
      el.classList.toggle('is-empty', count === 0);
    });
  };

  const addToCart = async (items, button, { openCart = true } = {}) => {
    button?.classList.add('is-loading');
    try {
      const res = await fetch(`${theme.routes.cartAdd}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ items, sections: cartSections(), sections_url: window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || data.message || theme.strings.error);
      if (theme.cartType === 'page' && openCart) {
        window.location.href = theme.routes.cart;
        return true;
      }
      renderCart(data.sections);
      if (openCart) openDrawer($('[data-cart-drawer]'));
      else toast(theme.strings.added);
      return true;
    } catch (err) {
      toast(err.message || theme.strings.error);
      return false;
    } finally {
      button?.classList.remove('is-loading');
    }
  };

  const changeLine = async (line, quantity) => {
    const item = $(`[data-cart-drawer] [data-line="${line}"]`) || $(`[data-cart-page] [data-line="${line}"]`);
    item?.classList.add('is-loading');
    try {
      const res = await fetch(`${theme.routes.cartChange}.js`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ line, quantity, sections: cartSections(), sections_url: window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok || data.status) throw new Error(data.description || data.message || theme.strings.error);
      if ($('[data-cart-page]')) {
        window.location.reload();
        return;
      }
      renderCart(data.sections);
    } catch (err) {
      item?.classList.remove('is-loading');
      toast(err.message || theme.strings.error);
    }
  };

  document.addEventListener('click', (e) => {
    const qtyBtn = e.target.closest('[data-qty-change]');
    if (qtyBtn) {
      e.preventDefault();
      const input = $('[data-line-qty]', qtyBtn.closest('[data-qty]'));
      const next = Math.max(0, (parseInt(input.value, 10) || 0) + parseInt(qtyBtn.dataset.qtyChange, 10));
      input.value = next;
      changeLine(parseInt(input.dataset.lineQty, 10), next);
      return;
    }
    const remove = e.target.closest('[data-line-remove]');
    if (remove) {
      e.preventDefault();
      changeLine(parseInt(remove.dataset.lineRemove, 10), 0);
      return;
    }
    const quick = e.target.closest('[data-quick-add]');
    if (quick) {
      e.preventDefault();
      addToCart([{ id: parseInt(quick.dataset.quickAdd, 10), quantity: 1 }], quick).then((ok) => {
        if (ok) {
          quick.classList.add('is-added');
          setTimeout(() => quick.classList.remove('is-added'), 1500);
        }
      });
    }
  });

  document.addEventListener(
    'change',
    debounce((e) => {
      const input = e.target.closest?.('[data-line-qty]');
      if (input) changeLine(parseInt(input.dataset.lineQty, 10), Math.max(0, parseInt(input.value, 10) || 0));
    }, 400)
  );

  document.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-product-form]');
    if (!form) return;
    e.preventDefault();
    const button = $('[data-add-button]', form);
    const errorEl = $('[data-form-error]', form);
    if (errorEl) errorEl.hidden = true;
    const id = parseInt($('[data-variant-id]', form).value, 10);
    const qtyInput = $('input[name="quantity"]', form);
    const quantity = qtyInput ? parseInt(qtyInput.value, 10) || 1 : 1;
    addToCart([{ id, quantity }], button);
  });

  /* Product page */
  const getSelected = (fieldsets) => fieldsets.map((fs) => $('input:checked', fs)?.value);

  const checkOptions = (fieldsets, selected) => {
    fieldsets.forEach((fs, i) => {
      $$('input[type="radio"]', fs).forEach((input) => {
        input.checked = input.value === selected[i];
      });
      const label = $('[data-selected-value]', fs);
      if (label) label.textContent = selected[i] || '';
    });
  };

  const updateFromDoc = (product, doc) => {
    ['[data-price]', '[data-sku]', '[data-vs-price]'].forEach((sel) => {
      const fresh = $(sel, doc);
      $$(sel, product).forEach((current) => {
        if (fresh) current.innerHTML = fresh.innerHTML;
      });
    });
    $$('label[for]', product).forEach((label) => {
      const freshLabel = doc.querySelector(`label[for="${CSS.escape(label.htmlFor)}"]`);
      if (freshLabel) label.classList.toggle('is-unavailable', freshLabel.classList.contains('is-unavailable'));
    });
    ['[data-add-button]', '[data-vs-add]'].forEach((sel) => {
      const fresh = $(sel, doc);
      const current = $(sel, product);
      if (fresh && current) {
        current.disabled = fresh.disabled;
        current.textContent = fresh.textContent.trim();
      }
    });
    const freshPayment = $('.shopify-payment-button', doc);
    const payment = $('.shopify-payment-button', product);
    if (freshPayment && payment) payment.replaceWith(freshPayment);
  };

  const setButtons = (product, available, text) => {
    ['[data-add-button]', '[data-vs-add]'].forEach((sel) => {
      const btn = $(sel, product);
      if (!btn) return;
      btn.disabled = !available;
      btn.textContent = text;
    });
  };

  const initProduct = (root = document) => {
    $$('[data-product]', root).forEach((product) => {
      if (product._init) return;
      product._init = true;
      const sectionId = product.dataset.sectionId;
      const productUrl = product.dataset.url;

      const mediaList = $('[data-media-list]', product);
      const dots = $$('.product__dot', product);
      if (mediaList && dots.length) {
        mediaList.addEventListener(
          'scroll',
          debounce(() => {
            const i = Math.round(mediaList.scrollLeft / mediaList.clientWidth);
            dots.forEach((d, n) => d.classList.toggle('is-active', n === i));
          }, 50),
          { passive: true }
        );
      }

      const dialog = $('[data-zoom-dialog]');
      product.addEventListener('click', (e) => {
        const zoom = e.target.closest('[data-zoom]');
        if (!zoom || !dialog) return;
        $('[data-zoom-img]', dialog).src = zoom.dataset.zoom;
        dialog.showModal();
      });
      if (dialog && !dialog._init) {
        dialog._init = true;
        dialog.addEventListener('click', () => dialog.close());
      }

      const variantsEl = $('[data-variants]', product);
      const variants = variantsEl ? JSON.parse(variantsEl.textContent) : [];
      const mainSets = $$('[data-variant-picker] fieldset', product);
      const storySets = $$('[data-vs-options] fieldset', product);
      const idInput = $('[data-variant-id]', product);
      product._variantId = parseInt(idInput?.value || $('[data-vstories]', product)?.dataset.variantId, 10) || null;

      const scrollToMedia = (mediaId) => {
        if (!mediaId || !mediaList) return;
        const item = $(`[data-media-id="${mediaId}"]`, mediaList);
        if (!item) return;
        if (window.matchMedia('(min-width: 990px)').matches) {
          const video = $('[data-media-video]', mediaList);
          if (video) {
            if (video.nextElementSibling !== item) video.after(item);
          } else if (item !== mediaList.firstElementChild) {
            mediaList.prepend(item);
          }
        } else {
          mediaList.scrollTo({ left: item.offsetLeft, behavior: 'smooth' });
        }
      };

      const selectVariant = async (selected) => {
        checkOptions(mainSets, selected);
        checkOptions(storySets, selected);
        const variant = variants.find((v) => v.options.every((opt, i) => opt === selected[i]));
        if (!variant) {
          product._variantId = null;
          setButtons(product, false, theme.strings.unavailable);
          return;
        }
        product._variantId = variant.id;
        if (idInput) idInput.value = variant.id;
        const url = `${productUrl}?variant=${variant.id}`;
        window.history.replaceState({}, '', url);
        if (variant.featured_media) scrollToMedia(variant.featured_media.id);
        try {
          const res = await fetch(`${url}&section_id=${sectionId}`);
          updateFromDoc(product, parseHTML(await res.text()));
        } catch (err) {
          setButtons(product, variant.available, variant.available ? theme.strings.addToCart : theme.strings.soldOut);
        }
      };

      const picker = $('[data-variant-picker]', product);
      picker?.addEventListener('change', () => selectVariant(getSelected(mainSets)));
      $('[data-vs-options]', product)?.addEventListener('change', () => selectVariant(getSelected(storySets)));

      $('[data-vs-add]', product)?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        if (!product._variantId) return;
        const label = btn.textContent;
        const ok = await addToCart([{ id: product._variantId, quantity: 1 }], btn, { openCart: false });
        if (ok) {
          btn.textContent = theme.strings.added;
          setTimeout(() => {
            btn.textContent = label;
          }, 2000);
        }
      });

      initStories(product);
    });
  };

  /* Video stories */
  const initStories = (root) => {
    const wrap = $('[data-vstories]', root);
    if (!wrap || wrap._init) return;
    wrap._init = true;
    const dialog = $('[data-vstories-dialog]', wrap);
    const videos = $$('.vstories__video', wrap);
    const bars = $$('.vstories__bar i', wrap);
    const muteBtn = $('[data-vs-mute]', wrap);
    let index = 0;
    let muted = false;
    let holdTimer = null;
    let held = false;

    const setMuted = (value) => {
      muted = value;
      videos.forEach((v) => (v.muted = muted));
      muteBtn?.classList.toggle('is-muted', muted);
    };

    const play = (video) => {
      video.muted = muted;
      video.play().catch(() => {
        setMuted(true);
        video.play().catch(() => {});
      });
    };

    const go = (i) => {
      if (i < 0) i = 0;
      if (i >= videos.length) i = 0;
      index = i;
      videos.forEach((v, n) => {
        const active = n === index;
        v.classList.toggle('is-active', active);
        if (active) {
          if (!v.src) v.src = v.dataset.src;
          v.currentTime = 0;
          play(v);
          const next = videos[n + 1];
          if (next && !next.src) {
            next.preload = 'metadata';
            next.src = next.dataset.src;
          }
        } else {
          v.pause();
        }
      });
      bars.forEach((bar, n) => {
        bar.style.transform = `scaleX(${n < index ? 1 : 0})`;
      });
    };

    videos.forEach((v, n) => {
      v.addEventListener('timeupdate', () => {
        if (n === index && v.duration) bars[n].style.transform = `scaleX(${v.currentTime / v.duration})`;
      });
      v.addEventListener('ended', () => {
        if (n === index) go(index + 1);
      });
    });

    const open = () => {
      dialog.showModal();
      document.body.classList.add('is-locked');
      $('.vstories__bubble-video', wrap)?.pause();
      go(0);
    };

    const close = () => {
      videos.forEach((v) => v.pause());
      if (dialog.open) dialog.close();
    };

    dialog.addEventListener('close', () => {
      videos.forEach((v) => v.pause());
      document.body.classList.remove('is-locked');
      $('.vstories__bubble-video', wrap)?.play().catch(() => {});
    });

    $('[data-vstories-open]', wrap).addEventListener('click', open);
    $('[data-vs-close]', wrap)?.addEventListener('click', close);
    $('[data-vs-prev]', wrap)?.addEventListener('click', () => go(index - 1));
    $('[data-vs-next]', wrap)?.addEventListener('click', () => go(index + 1));
    muteBtn?.addEventListener('click', () => setMuted(!muted));

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) close();
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    });

    $$('[data-vs-tap]', wrap).forEach((tap) => {
      tap.addEventListener('pointerdown', () => {
        held = false;
        holdTimer = setTimeout(() => {
          held = true;
          videos[index].pause();
        }, 250);
      });
      const release = () => {
        clearTimeout(holdTimer);
        if (held) play(videos[index]);
      };
      tap.addEventListener('pointerup', release);
      tap.addEventListener('pointerleave', release);
      tap.addEventListener('click', () => {
        if (held) {
          held = false;
          return;
        }
        go(index + parseInt(tap.dataset.vsTap, 10));
      });
    });

    let startY = null;
    const frame = $('.vstories__frame', wrap);
    frame.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    frame.addEventListener('touchend', (e) => {
      if (startY !== null && e.changedTouches[0].clientY - startY > 120 && !e.target.closest('.vstories__panel')) close();
      startY = null;
    });
  };

  /* Money */
  const formatMoney = (cents) => {
    const format = theme.moneyFormat || 'R$ {{amount_with_comma_separator}}';
    const value = (Number(cents) || 0) / 100;
    const fmt = (decimals, thousands, decimal) => {
      const [int, dec] = value.toFixed(decimals).split('.');
      const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
      return dec ? `${withSep}${decimal}${dec}` : withSep;
    };
    return format.replace(/\{\{\s*(\w+)\s*\}\}/, (_, key) => {
      switch (key) {
        case 'amount_no_decimals': return fmt(0, ',', '.');
        case 'amount_with_comma_separator': return fmt(2, '.', ',');
        case 'amount_no_decimals_with_comma_separator': return fmt(0, '.', ',');
        case 'amount_with_apostrophe_separator': return fmt(2, "'", '.');
        default: return fmt(2, ',', '.');
      }
    });
  };

  /* Shop the look */
  const initLook = (root = document) => {
    $$('[data-look]', root).forEach((look) => {
      if (look._init) return;
      look._init = true;
      const items = $$('[data-look-item]', look);

      items.forEach((item) => {
        const variants = JSON.parse($('[data-look-variants]', item)?.textContent || '[]');
        const sets = $$('[data-look-option]', item);
        const btn = $('[data-look-add]', item);

        const refresh = () => {
          const selected = sets.map((fs) => $('input:checked', fs)?.value);
          sets.forEach((fs, i) => {
            $$('input', fs).forEach((input) => {
              const possible = variants.some(
                (v) => v.available && v.options[i] === input.value && v.options.every((o, n) => n === i || !selected[n] || o === selected[n])
              );
              $(`label[for="${CSS.escape(input.id)}"]`, fs)?.classList.toggle('is-unavailable', !possible);
            });
          });
          item.classList.remove('is-missing');
          if (selected.some((v) => v === undefined)) return;
          const variant = variants.find((v) => v.options.every((o, i) => o === selected[i]));
          if (!variant) {
            btn.removeAttribute('data-variant-id');
            btn.disabled = true;
            btn.textContent = theme.strings.unavailable;
            return;
          }
          btn.dataset.variantId = variant.id;
          btn.disabled = !variant.available;
          btn.textContent = variant.available ? theme.strings.addToCart : theme.strings.soldOut;
          const price = $('[data-look-price] .price', item);
          if (price) {
            const current = $('.price__current', price);
            if (current) current.textContent = formatMoney(variant.price);
            const onSale = variant.compare_at_price > variant.price;
            price.classList.toggle('price--sale', onSale);
            let compare = $('.price__compare', price);
            if (onSale) {
              if (!compare) {
                compare = document.createElement('s');
                compare.className = 'price__compare';
                $('.price__main', price)?.prepend(compare);
              }
              compare.textContent = formatMoney(variant.compare_at_price);
            } else {
              compare?.remove();
              $('.price__off', price)?.remove();
            }
          }
        };

        sets.forEach((fs) => fs.addEventListener('change', refresh));
        if (sets.length) refresh();

        btn?.addEventListener('click', async () => {
          if (!btn.dataset.variantId) {
            item.classList.add('is-missing');
            return;
          }
          const label = btn.textContent;
          const ok = await addToCart([{ id: parseInt(btn.dataset.variantId, 10), quantity: 1 }], btn);
          if (ok) {
            btn.textContent = theme.strings.added;
            setTimeout(() => (btn.textContent = label), 2000);
          }
        });
      });

      $('[data-look-add-all]', look)?.addEventListener('click', async (e) => {
        const button = e.currentTarget;
        const hint = $('[data-look-hint]', look);
        const buttons = items.map((item) => $('[data-look-add]', item)).filter((b) => b && !b.disabled);
        const missing = items.filter((item) => {
          const b = $('[data-look-add]', item);
          return b && !b.disabled && !b.dataset.variantId;
        });
        if (missing.length) {
          missing.forEach((item) => item.classList.add('is-missing'));
          if (hint) hint.hidden = false;
          missing[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
        if (hint) hint.hidden = true;
        const lineItems = buttons.map((b) => ({ id: parseInt(b.dataset.variantId, 10), quantity: 1 }));
        if (!lineItems.length) return;
        await addToCart(lineItems, button);
      });
    });
  };

  /* Recommendations */
  const initRecommendations = (root = document) => {
    $$('[data-recommendations]', root).forEach(async (el) => {
      if (el._init || !el.dataset.url) return;
      el._init = true;
      try {
        const res = await fetch(el.dataset.url);
        const doc = parseHTML(await res.text());
        const fresh = $('[data-recommendations]', doc);
        if (fresh && fresh.innerHTML.trim()) el.innerHTML = fresh.innerHTML;
      } catch (err) {}
    });
  };

  /* Predictive search */
  const initPredictive = () => {
    const input = $('[data-predictive-input]');
    const results = $('[data-predictive-results]');
    if (!input || !results) return;
    let controller;
    input.addEventListener(
      'input',
      debounce(async () => {
        const q = input.value.trim();
        if (q.length < 2) {
          results.innerHTML = '';
          return;
        }
        controller?.abort();
        controller = new AbortController();
        try {
          const url = `${theme.routes.predictiveSearch}?q=${encodeURIComponent(q)}&resources[type]=product,collection,query&resources[limit]=4&section_id=predictive-search`;
          const res = await fetch(url, { signal: controller.signal });
          const doc = parseHTML(await res.text());
          const content = $('.predictive', doc);
          results.innerHTML = content ? content.outerHTML : '';
        } catch (err) {}
      }, 280)
    );
  };

  /* Collection */
  const initCollection = (root = document) => {
    $$('[data-sort-select]', root).forEach((select) => {
      select.addEventListener('change', () => select.form.submit());
    });

    const grid = $('[data-product-grid]', root);
    const colButtons = $$('[data-grid-cols]', root);
    if (grid && colButtons.length) {
      let saved = null;
      try { saved = localStorage.getItem('gridCols'); } catch (err) {}
      const apply = (cols) => {
        if (cols) grid.dataset.cols = cols;
        colButtons.forEach((b) => b.classList.toggle('is-active', b.dataset.gridCols === (cols || '4')));
      };
      apply(saved);
      colButtons.forEach((b) =>
        b.addEventListener('click', () => {
          apply(b.dataset.gridCols);
          try { localStorage.setItem('gridCols', b.dataset.gridCols); } catch (err) {}
        })
      );
    }
  };

  document.addEventListener('click', async (e) => {
    const link = e.target.closest('[data-load-more-link]');
    if (!link) return;
    e.preventDefault();
    const grid = $('[data-product-grid]');
    const wrapper = link.closest('[data-load-more]');
    if (!grid || !wrapper) return;
    link.classList.add('is-loading');
    try {
      const res = await fetch(link.href);
      const doc = parseHTML(await res.text());
      const nextGrid = $('[data-product-grid]', doc);
      const nextMore = $('[data-load-more]', doc);
      if (nextGrid) grid.append(...Array.from(nextGrid.children));
      if (nextMore) wrapper.replaceWith(nextMore);
      else wrapper.remove();
      window.history.replaceState({}, '', link.href);
    } catch (err) {
      window.location.href = link.href;
    }
  });

  /* Card swatch hover */
  document.addEventListener('mouseover', (e) => {
    const swatch = e.target.closest?.('[data-swatch-image]');
    if (!swatch) return;
    const card = swatch.closest('[data-product-card]');
    const img = card && $('[data-card-image]', card);
    if (!img) return;
    if (!img.dataset.originalSrc) {
      img.dataset.originalSrc = img.currentSrc || img.src;
      img.dataset.originalSrcset = img.srcset;
    }
    img.srcset = '';
    img.src = swatch.dataset.swatchImage;
    $$('.swatch', card).forEach((s) => s.classList.toggle('is-active', s === swatch));
  });

  /* Card videos */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const videoObserver =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            entries.forEach(({ target: video, isIntersecting }) => {
              if (isIntersecting) {
                if (!video.src && video.dataset.src) video.src = video.dataset.src;
                if (!reduceMotion) video.play().catch(() => {});
              } else if (!video.paused) {
                video.pause();
              }
            });
          },
          { rootMargin: '200px 0px', threshold: 0.1 }
        )
      : null;

  const initCardVideos = (root = document) => {
    $$('[data-card-video]', root).forEach((video) => {
      if (video._init) return;
      video._init = true;
      video.muted = true;
      if (videoObserver) videoObserver.observe(video);
      else if (video.dataset.src) video.src = video.dataset.src;
    });
  };

  new MutationObserver((mutations) => {
    mutations.forEach((m) =>
      m.addedNodes.forEach((node) => {
        if (node.nodeType === 1) initCardVideos(node.matches?.('[data-card-video]') ? node.parentNode : node);
      })
    );
  }).observe(document.documentElement, { childList: true, subtree: true });

  /* Account recover password */
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle-recover]');
    if (!toggle) return;
    e.preventDefault();
    $('#RecoverPanel')?.classList.add('is-visible');
    $('#RecoverPanel')?.scrollIntoView({ behavior: 'smooth' });
  });

  const init = (root = document) => {
    initCardVideos(root);
    initLook(root);
    initAnnouncement(root);
    initCountdown(root);
    initSlideshows(root);
    initProduct(root);
    initRecommendations(root);
    initCollection(root);
  };

  document.addEventListener('DOMContentLoaded', () => {
    initHeader();
    initPredictive();
    init();
    if (window.location.hash === '#RecoverPanel') $('#RecoverPanel')?.classList.add('is-visible');
  });

  document.addEventListener('shopify:section:load', (e) => {
    init(e.target);
    if ($('[data-header]', e.target)) initHeader();
  });

  document.addEventListener('shopify:block:select', (e) => {
    const slide = e.target.closest('[data-slide]');
    const show = slide && slide.closest('[data-slideshow]');
    if (show && show._go) show._go($$('[data-slide]', show).indexOf(slide));
  });
})();
