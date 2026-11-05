/* Tarik Čolić · Portfolio
   Vanilla JS, no build step. Every feature is isolated so one failure cannot take down the rest. */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var prm = function () { return reduceMotion.matches; };
  var cssVar = function (name) { return getComputedStyle(root).getPropertyValue(name).trim(); };

  function safe(name, fn) {
    try { fn(); } catch (err) { if (window.console) console.warn('[portfolio] ' + name + ' failed:', err); }
  }

  // Run fn while el is on screen; stop it when it leaves. fn(start) returns a stop function.
  function whileVisible(el, start, opts) {
    var stop = null;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !stop) stop = start() || function () {};
        else if (!e.isIntersecting && stop) { stop(); stop = null; }
      });
    }, opts || { threshold: 0.15 });
    io.observe(el);
  }

  var themeListeners = [];
  function onThemeChange(fn) { themeListeners.push(fn); }
  function emitTheme() { themeListeners.forEach(function (fn) { safe('theme listener', fn); }); }
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (!root.hasAttribute('data-theme')) emitTheme();
  });

  /* ---------------- Theme ---------------- */
  safe('theme', function () {
    var btn = $('[data-theme-toggle]');
    if (!btn) return;
    var isDark = function () {
      var t = root.getAttribute('data-theme');
      if (t) return t === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    };
    var sync = function () {
      btn.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme');
      var meta = $$('meta[name="theme-color"]');
      meta.forEach(function (m) { m.setAttribute('content', isDark() ? '#0b1424' : '#fffdee'); });
    };
    sync();
    btn.addEventListener('click', function (ev) {
      var next = isDark() ? 'light' : 'dark';
      var apply = function () {
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        sync();
        emitTheme();
      };
      if (!document.startViewTransition || prm()) { apply(); return; }
      var r = btn.getBoundingClientRect();
      var x = r.left + r.width / 2, y = r.top + r.height / 2;
      var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      var vt = document.startViewTransition(apply);
      vt.ready.then(function () {
        root.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      });
    });
  });

  /* ---------------- Nav: scroll state, hide on scroll, progress ---------------- */
  safe('nav', function () {
    var nav = $('#nav');
    var bar = $('.progress span');
    var lastY = window.scrollY, ticking = false;
    var update = function () {
      var y = window.scrollY;
      var max = document.documentElement.scrollHeight - innerHeight;
      if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(1, y / max) : 0);
      nav.classList.toggle('is-scrolled', y > 12);
      var menuOpen = document.body.classList.contains('menu-open');
      if (!menuOpen) nav.classList.toggle('is-hidden', y > lastY && y > 420);
      lastY = y;
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
    nav.addEventListener('focusin', function () { nav.classList.remove('is-hidden'); });
  });

  /* ---------------- Active section indicator ---------------- */
  safe('active section', function () {
    var links = $$('[data-nav]');
    var ind = $('.nav__indicator');
    var map = {};
    links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var moveTo = function (a) {
      links.forEach(function (l) { l.classList.toggle('is-active', l === a); });
      if (!ind) return;
      if (!a) { ind.style.setProperty('--o', 0); return; }
      ind.style.setProperty('--x', a.offsetLeft + 12 + 'px');
      ind.style.setProperty('--w', a.offsetWidth - 24 + 'px');
      ind.style.setProperty('--o', 1);
    };
    var visible = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting ? e.intersectionRatio : 0; });
      var best = null, bestR = 0;
      Object.keys(visible).forEach(function (id) { if (visible[id] > bestR) { bestR = visible[id]; best = id; } });
      moveTo(best ? map[best] : null);
    }, { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.01, 0.5, 1] });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  });

  /* ---------------- Mobile menu ---------------- */
  safe('mobile menu', function () {
    var btn = $('[data-menu-toggle]');
    var menu = $('#mobile-menu');
    if (!btn || !menu) return;
    menu.hidden = false;
    var setOpen = function (open) {
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      menu.setAttribute('aria-hidden', String(!open));
      if (open) { $('#nav').classList.remove('is-hidden'); var first = $('a', menu); if (first) setTimeout(function () { first.focus(); }, 300); }
    };
    menu.setAttribute('aria-hidden', 'true');
    btn.addEventListener('click', function () { setOpen(btn.getAttribute('aria-expanded') !== 'true'); });
    $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); btn.focus(); } });
    window.addEventListener('resize', function () { if (innerWidth > 1080 && menu.classList.contains('is-open')) setOpen(false); });
  });

  /* ---------------- Hero title split + reveal ---------------- */
  safe('hero', function () {
    var i = 0;
    $$('.hero__title .split').forEach(function (el) {
      var text = el.textContent;
      el.textContent = '';
      Array.prototype.forEach.call(text, function (ch) {
        var s = document.createElement('span');
        s.className = 'char';
        s.textContent = ch;
        s.style.setProperty('--i', i++);
        el.appendChild(s);
      });
    });
    var hero = $('.hero');
    var go = function () { requestAnimationFrame(function () { hero.classList.add('is-ready'); }); };
    if (document.fonts && document.fonts.ready) {
      var done = false;
      document.fonts.ready.then(function () { if (!done) { done = true; go(); } });
      setTimeout(function () { if (!done) { done = true; go(); } }, 900);
    } else go();
  });

  /* ---------------- Reveal on scroll ---------------- */
  safe('reveal', function () {
    var items = $$('[data-reveal]');
    // Stagger siblings that share a parent.
    var groups = new Map();
    items.forEach(function (el) {
      var p = el.parentElement;
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(el);
    });
    groups.forEach(function (list) {
      list.forEach(function (el, idx) { el.style.setProperty('--d', Math.min(idx, 6) * 0.08 + 's'); });
    });
    if (!('IntersectionObserver' in window)) { items.forEach(function (el) { el.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
          e.target.addEventListener('transitionend', function clear(ev) {
            if (ev.target !== e.target || ev.propertyName !== 'opacity') return;
            e.target.style.removeProperty('--d');
            e.target.removeEventListener('transitionend', clear);
          });
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  });

  /* ---------------- Rotating words ---------------- */
  safe('rotator', function () {
    var words = $$('.rotator__word');
    if (words.length < 2) return;
    var box = $('.rotator');
    var widest = 0;
    var measure = function () {
      widest = 0;
      words.forEach(function (w) { widest = Math.max(widest, w.scrollWidth); });
    };
    var idx = 0, timer = null;
    var setWidth = function (w) { box.style.width = w.scrollWidth + 'px'; box.style.transition = 'width 0.6s cubic-bezier(0.22,1,0.36,1)'; };
    var next = function () {
      var cur = words[idx];
      idx = (idx + 1) % words.length;
      var nxt = words[idx];
      cur.classList.remove('is-active');
      cur.classList.add('is-leaving');
      nxt.classList.remove('is-leaving');
      nxt.classList.add('is-active');
      setWidth(nxt);
      setTimeout(function () { cur.classList.remove('is-leaving'); }, 700);
    };
    measure();
    setWidth(words[0]);
    if (prm()) return;
    whileVisible(box, function () {
      timer = setInterval(next, 2600);
      return function () { clearInterval(timer); };
    });
  });

  /* ---------------- Counters ---------------- */
  safe('counters', function () {
    var els = $$('[data-count]');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || '';
        if (prm()) { el.textContent = to + suf; return; }
        var t0 = performance.now(), dur = 1400;
        var tick = function (now) {
          var p = Math.min(1, (now - t0) / dur);
          var eased = 1 - Math.pow(1 - p, 4);
          el.textContent = Math.round(to * eased) + (p === 1 ? suf : '');
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  });

  /* ---------------- Words light up with scroll ---------------- */
  safe('words', function () {
    var blocks = $$('[data-words]');
    if (prm() || !blocks.length) return;
    blocks.forEach(function (b) {
      var words = b.textContent.trim().split(/\s+/);
      b.setAttribute('aria-label', b.textContent.trim());
      b.textContent = '';
      words.forEach(function (w, i) {
        var s = document.createElement('span');
        s.className = 'w';
        s.setAttribute('aria-hidden', 'true');
        s.textContent = w;
        b.appendChild(s);
        if (i < words.length - 1) b.appendChild(document.createTextNode(' '));
      });
    });
    var ticking = false;
    var update = function () {
      blocks.forEach(function (b) {
        var r = b.getBoundingClientRect();
        // 0 when the block's top hits 85% of viewport, 1 when its bottom reaches 45%.
        var start = innerHeight * 0.85, end = innerHeight * 0.45;
        var p = (start - r.top) / (start - end + r.height);
        // The last block may never reach the end line on tall screens: finish it at the page bottom.
        if (window.scrollY + innerHeight >= document.documentElement.scrollHeight - 4) p = 1;
        p = Math.max(0, Math.min(1, p));
        var ws = b.querySelectorAll('.w');
        var n = Math.round(p * ws.length);
        for (var i = 0; i < ws.length; i++) ws[i].classList.toggle('on', i < n);
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ---------------- Local clock (Mostar) ---------------- */
  safe('clock', function () {
    var el = $('[data-clock]');
    if (!el) return;
    var fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Sarajevo' });
    var tick = function () { el.textContent = fmt.format(new Date()) + ' CET'; };
    tick();
    setInterval(tick, 15000);
    var y = $('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  });

  /* ---------------- Magnetic buttons & photo tilt ---------------- */
  safe('pointer fx', function () {
    if (!finePointer.matches || prm()) return;
    $$('[data-magnetic]').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = 'translate(' + dx * 0.18 + 'px,' + dy * 0.28 + 'px)';
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });
    var tilt = $('[data-tilt]');
    if (tilt) {
      tilt.addEventListener('pointermove', function (e) {
        var r = tilt.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        tilt.style.transform = 'perspective(900px) rotateY(' + px * 8 + 'deg) rotateX(' + -py * 8 + 'deg)';
      });
      tilt.addEventListener('pointerleave', function () { tilt.style.transform = ''; });
    }
    $$('.project').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty('--mx', e.clientX - r.left + 'px');
        card.style.setProperty('--my', e.clientY - r.top + 'px');
      });
    });
  });

  /* ---------------- Project filters ---------------- */
  safe('filters', function () {
    var btns = $$('.filter');
    var pill = $('.filters__pill');
    var cards = $$('.project');
    var place = function (b) {
      pill.style.setProperty('--x', b.offsetLeft + 'px');
      pill.style.setProperty('--w', b.offsetWidth + 'px');
    };
    var current = 'all';
    var apply = function (f) {
      if (f === current) return;
      current = f;
      var show = cards.filter(function (c) { return f === 'all' || c.dataset.cat.split(' ').indexOf(f) > -1; });
      var hide = cards.filter(function (c) { return show.indexOf(c) === -1; });
      var delay = prm() ? 0 : 280;
      cards.forEach(function (c) { if (!c.classList.contains('is-gone')) c.classList.add('is-filtered-out'); });
      setTimeout(function () {
        hide.forEach(function (c) { c.classList.add('is-gone'); });
        show.forEach(function (c, i) {
          c.classList.remove('is-gone');
          c.classList.add('is-in');
          c.style.setProperty('--d', '0s');
          setTimeout(function () { c.classList.remove('is-filtered-out'); }, prm() ? 0 : 30 + i * 60);
        });
      }, delay);
    };
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', String(x === b)); });
        place(b);
        apply(b.dataset.filter);
      });
    });
    var init = function () { place($('.filter.is-active')); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
    init();
    window.addEventListener('resize', init);
  });

  /* ---------------- Tabs ---------------- */
  safe('tabs', function () {
    $$('[data-tabs]').forEach(function (wrap) {
      var tabs = $$('[role="tab"]', wrap);
      var ind = $('.tabs__indicator', wrap);
      var place = function (t) {
        ind.style.setProperty('--x', t.offsetLeft + 'px');
        ind.style.setProperty('--w', t.offsetWidth + 'px');
      };
      var select = function (t, focus) {
        tabs.forEach(function (x) {
          var on = x === t;
          x.setAttribute('aria-selected', String(on));
          x.tabIndex = on ? 0 : -1;
          document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
        });
        place(t);
        if (focus) t.focus();
      };
      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () { select(t); });
        t.addEventListener('keydown', function (e) {
          var n = null;
          if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
          if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
          if (e.key === 'Home') n = tabs[0];
          if (e.key === 'End') n = tabs[tabs.length - 1];
          if (n) { e.preventDefault(); select(n, true); }
        });
      });
      var init = function () { place(tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0]); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(init);
      init();
      window.addEventListener('resize', init);
    });
  });

  /* ---------------- Copy email + toast ---------------- */
  safe('copy', function () {
    var toast = $('.toast');
    var t = null;
    var show = function (msg) {
      toast.textContent = msg;
      toast.hidden = false;
      requestAnimationFrame(function () { toast.classList.add('is-on'); });
      clearTimeout(t);
      t = setTimeout(function () { toast.classList.remove('is-on'); setTimeout(function () { toast.hidden = true; }, 400); }, 2200);
    };
    $$('[data-copy]').forEach(function (b) {
      b.addEventListener('click', function () {
        var text = b.dataset.copy;
        var ok = function () { show('Email copied to clipboard'); var s = $('span', b); if (s) { s.textContent = 'Copied'; setTimeout(function () { s.textContent = 'Copy'; }, 2000); } };
        if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, function () { show(text); });
        else {
          var ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); ok(); } catch (e) { show(text); }
          document.body.removeChild(ta);
        }
      });
    });
  });

  /* ---------------- Marquee: duplicate for a seamless loop ---------------- */
  safe('marquee', function () {
    var track = $('.marquee__track');
    if (!track) return;
    track.innerHTML += track.innerHTML;
  });

  /* ---------------- DNA helix canvas ---------------- */
  safe('helix', function () {
    var c = $('#helix');
    if (!c || !c.getContext) return;
    var ctx = c.getContext('2d');
    var w = 0, h = 0, dpr = 1, t = 0, raf = 0, last = 0;
    var mouseX = -1e5, unzip = 0, unzipTarget = 0;
    var accent = '#0958a7', ink = '#7a796f';
    var pairs = { A: 'T', T: 'A', G: 'C', C: 'G' };
    var seq = '';
    var rnd = 11;
    var rand = function () { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
    for (var i = 0; i < 400; i++) seq += 'ATGC'[Math.floor(rand() * 4)];

    var readColors = function () { accent = cssVar('--accent') || accent; ink = cssVar('--ink-3') || ink; };
    var resize = function () {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = c.clientWidth; h = c.clientHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    };

    var draw = function () {
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      var cy = h / 2;
      var A = h * 0.34;
      var wl = Math.max(360, Math.min(560, w * 0.42));
      var k = (Math.PI * 2) / wl;
      var phase = t * 0.55;
      var spacing = w < 600 ? 16 : 20;
      var amp = function (x) {
        var d = (x - mouseX) / 110;
        return 1 + 0.55 * unzip * Math.exp(-d * d);
      };

      // Rungs and bases
      ctx.lineWidth = 1;
      ctx.font = '500 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var offset = (t * 14) % spacing;
      for (var x = -spacing + offset, n = Math.floor(t * 14 / spacing); x < w + spacing; x += spacing) {
        var idx = Math.abs(Math.floor((x - offset) / spacing) - n) % seq.length;
        var th = k * x + phase;
        var s = Math.sin(th);
        var a = A * amp(x);
        var y1 = cy + a * s, y2 = cy - a * s;
        var depth = (Math.cos(th) + 1) / 2;
        var d = (x - mouseX) / 110;
        var gap = unzip * Math.exp(-d * d);
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.1 + 0.22 * depth;
        if (gap > 0.15) {
          var mid = (y1 + y2) / 2, half = Math.abs(y2 - y1) / 2 * Math.min(0.9, gap);
          var dir = y2 > y1 ? 1 : -1;
          ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, mid - dir * half); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x, mid + dir * half); ctx.lineTo(x, y2); ctx.stroke();
        } else {
          ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        }
        if (Math.abs(s) > 0.55 && w > 480) {
          var base = seq[idx];
          ctx.fillStyle = accent;
          ctx.globalAlpha = 0.18 + 0.55 * depth;
          ctx.fillText(base, x, y1 + (y1 < cy ? 11 : -11));
          ctx.fillText(pairs[base], x, y2 + (y2 < cy ? 11 : -11));
        }
      }

      // Backbones, drawn in short segments so depth can fade them
      var step = 5;
      for (var strand = 0; strand < 2; strand++) {
        var sign = strand ? -1 : 1;
        var px = null, py = null;
        for (var xx = -step; xx <= w + step; xx += step) {
          var th2 = k * xx + phase;
          var yy = cy + sign * A * amp(xx) * Math.sin(th2);
          var dep = (sign * Math.cos(th2) + 1) / 2;
          if (px !== null) {
            ctx.globalAlpha = 0.2 + 0.8 * dep;
            ctx.lineWidth = 1 + 1.6 * dep;
            ctx.strokeStyle = accent;
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(xx, yy); ctx.stroke();
          }
          px = xx; py = yy;
        }
      }

      // Nodes on the backbone at each rung
      for (var x3 = -spacing + offset; x3 < w + spacing; x3 += spacing) {
        var th3 = k * x3 + phase;
        var s3 = Math.sin(th3), a3 = A * amp(x3);
        var dA = (Math.cos(th3) + 1) / 2, dB = 1 - dA;
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.25 + 0.75 * dA;
        ctx.beginPath(); ctx.arc(x3, cy + a3 * s3, 1.5 + 1.6 * dA, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.25 + 0.75 * dB;
        ctx.beginPath(); ctx.arc(x3, cy - a3 * s3, 1.5 + 1.6 * dB, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    var frame = function (now) {
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      t += dt;
      unzip += (unzipTarget - unzip) * Math.min(1, dt * 6);
      draw();
      raf = requestAnimationFrame(frame);
    };

    readColors();
    resize();
    window.addEventListener('resize', resize);
    onThemeChange(function () { readColors(); draw(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);

    var hero = $('.hero');
    hero.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      mouseX = e.clientX - r.left;
      unzipTarget = (e.clientY > r.top - 80 && e.clientY < r.bottom + 40) ? 1 : 0.35;
    });
    hero.addEventListener('pointerleave', function () { unzipTarget = 0; });

    if (prm()) return;
    whileVisible(c, function () {
      last = 0;
      raf = requestAnimationFrame(frame);
      return function () { cancelAnimationFrame(raf); };
    }, { threshold: 0 });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) cancelAnimationFrame(raf);
      else if (c.getBoundingClientRect().bottom > 0) { last = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
    });
  });

  /* ---------------- StreamGene: transcription & translation ---------------- */
  safe('sequence', function () {
    var box = $('[data-seq]');
    if (!box) return;
    // ATG ACC GCC CGT ATC AAG GAT AAT GCA TAA  ->  M T A R I K D N A *
    var codons = ['ATG', 'ACC', 'GCC', 'CGT', 'ATC', 'AAG', 'GAT', 'AAT', 'GCA', 'TAA'];
    var table = { ATG: 'M', ACC: 'T', GCC: 'A', CGT: 'R', ATC: 'I', AAG: 'K', GAT: 'D', AAT: 'N', GCA: 'A', TAA: 'Stop' };
    var comp = { A: 'T', T: 'A', G: 'C', C: 'G' };
    var rows = {
      dna: $('[data-strand="dna"]', box), comp: $('[data-strand="comp"]', box),
      rna: $('[data-strand="rna"]', box), aa: $('[data-strand="aa"]', box)
    };
    var gcEl = $('[data-gc]', box), lenEl = $('[data-len]', box), cEl = $('[data-codons]', box);
    var i = 0, gc = 0, timer = null;

    var span = function (txt, cls) {
      var s = document.createElement('span');
      s.className = 'cd ' + (cls || '');
      s.textContent = txt;
      return s;
    };
    var reset = function () {
      Object.keys(rows).forEach(function (k) { rows[k].textContent = ''; });
      i = 0; gc = 0;
      gcEl.textContent = '0.0%'; lenEl.textContent = '0 bp'; cEl.textContent = '0';
    };
    var step = function (animate) {
      if (i >= codons.length) return false;
      var cod = codons[i];
      $$('.cd.hl', box).forEach(function (e) { e.classList.remove('hl'); });
      var cls = animate ? 'new hl' : '';
      rows.dna.appendChild(span(cod, cls));
      rows.comp.appendChild(span(cod.split('').map(function (b) { return comp[b]; }).join(''), cls));
      rows.rna.appendChild(span(cod.replace(/T/g, 'U'), cls));
      var aa = table[cod];
      rows.aa.appendChild(span(aa === 'Stop' ? '■' : aa, cls));
      gc += cod.split('').filter(function (b) { return b === 'G' || b === 'C'; }).length;
      i++;
      var len = i * 3;
      gcEl.textContent = (gc / len * 100).toFixed(1) + '%';
      lenEl.textContent = len + ' bp';
      cEl.textContent = String(i);
      Object.keys(rows).forEach(function (k) { rows[k].scrollLeft = rows[k].scrollWidth; });
      return true;
    };
    var fill = function () { reset(); while (step(false)) {} };

    if (prm()) { fill(); return; }
    reset();
    whileVisible(box, function () {
      var run = function () {
        if (!step(true)) {
          timer = setTimeout(function () { reset(); run(); }, 2800);
          return;
        }
        timer = setTimeout(run, 620);
      };
      if (i >= codons.length) reset();
      run();
      return function () { clearTimeout(timer); };
    }, { threshold: 0.3 });
  });

  /* ---------------- bcrypt visual ---------------- */
  safe('hash', function () {
    var box = $('[data-hash]');
    if (!box) return;
    var pwEl = $('[data-pw]', box), saltEl = $('[data-salt]', box), sumEl = $('[data-sum]', box);
    var ALPH = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var pwds = ['correct-horse-42', 'hunter2', 'Mostar!2026', 'p@ssw0rd'];
    var r = function (n) { var s = ''; for (var i = 0; i < n; i++) s += ALPH[Math.floor(Math.random() * ALPH.length)]; return s; };
    var p = 0, timers = [];
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var clear = function () { timers.forEach(clearTimeout); timers = []; };

    var showStatic = function () { pwEl.textContent = pwds[0]; saltEl.textContent = r(22); sumEl.textContent = r(31); };
    if (prm()) { showStatic(); return; }

    var cycle = function () {
      var pw = pwds[p++ % pwds.length];
      pwEl.textContent = '';
      saltEl.textContent = ''; sumEl.textContent = '';
      var k = 0;
      var type = function () {
        if (k < pw.length) { pwEl.textContent += pw[k++]; later(type, 70 + Math.random() * 60); }
        else later(scramble, 450);
      };
      var scramble = function () {
        var salt = r(22), sum = r(31), f = 0, frames = 26;
        var tick = function () {
          var sp = Math.floor((f / frames) * 22), hp = Math.floor((f / frames) * 31);
          saltEl.textContent = salt.slice(0, sp) + r(22 - sp);
          sumEl.textContent = sum.slice(0, hp) + r(31 - hp);
          if (++f <= frames) later(tick, 45);
          else later(cycle, 3200);
        };
        tick();
      };
      type();
    };
    whileVisible(box, function () { cycle(); return clear; }, { threshold: 0.3 });
  });

  /* ---------------- REST API visual ---------------- */
  safe('api', function () {
    var box = $('[data-api]');
    if (!box) return;
    var routes = $$('[data-route]', box);
    var res = $('[data-res]', box);
    var replies = [
      '200 OK\n[\n  { "id": 1, "firstName": "Tarik", "lastName": "Čolić",\n    "age": 21, "occupation": "Software Engineering Student" },\n  …\n]',
      '200 OK\n"A new user was saved."',
      '200 OK\n"A user\'s data has been updated."',
      '200 OK\n"User with ID=7 has been deleted."'
    ];
    var idx = 0, timers = [];
    var later = function (fn, ms) { timers.push(setTimeout(fn, ms)); };
    var render = function (txt, upto) {
      var shown = txt.slice(0, upto);
      var nl = shown.indexOf('\n');
      res.textContent = '';
      var st = document.createElement('span');
      st.className = 'st';
      st.textContent = nl === -1 ? shown : shown.slice(0, nl);
      res.appendChild(st);
      if (nl !== -1) res.appendChild(document.createTextNode(shown.slice(nl)));
    };
    var show = function (i, animate) {
      routes.forEach(function (r, j) { r.classList.toggle('is-on', j === i); });
      var txt = replies[i];
      if (!animate) { render(txt, txt.length); return; }
      var n = 0;
      var type = function () {
        n = Math.min(txt.length, n + 3);
        render(txt, n);
        if (n < txt.length) later(type, 16);
        else later(function () { idx = (idx + 1) % routes.length; show(idx, true); }, 2400);
      };
      later(type, 350);
    };
    if (prm()) { show(0, false); return; }
    whileVisible(box, function () {
      show(idx, true);
      return function () { timers.forEach(clearTimeout); timers = []; };
    }, { threshold: 0.3 });
  });

  /* ---------------- Wireframe -> design ---------------- */
  safe('browser', function () {
    var b = $('.browser');
    if (!b) return;
    if (prm()) { b.classList.add('is-designed'); return; }
    var t = null;
    whileVisible(b, function () {
      t = setInterval(function () { b.classList.toggle('is-designed'); }, 2400);
      setTimeout(function () { b.classList.add('is-designed'); }, 500);
      return function () { clearInterval(t); };
    }, { threshold: 0.4 });
  });

  /* ---------------- Bidding visual ---------------- */
  safe('bid', function () {
    var box = $('[data-bid]');
    if (!box) return;
    var priceEl = $('[data-price]', box), log = $('[data-log]', box), timerEl = $('[data-timer]', box);
    var names = ['amra_k', 'dino.m', 'lejla22', 'haris_b', 'selma.h', 'kenan7'];
    var price = 120, secs = 59, timers = [];
    var add = function (animate) {
      price += 5 * (1 + Math.floor(Math.random() * 4));
      priceEl.textContent = price;
      if (animate) { priceEl.parentNode.classList.remove('bump'); void priceEl.offsetWidth; priceEl.parentNode.classList.add('bump'); }
      var li = document.createElement('li');
      li.innerHTML = '<span></span><b></b>';
      li.firstChild.textContent = names[Math.floor(Math.random() * names.length)];
      li.lastChild.textContent = price + ' KM';
      log.insertBefore(li, log.firstChild);
      while (log.children.length > 3) log.removeChild(log.lastChild);
    };
    var fmt = function (s) { return '00:' + (s < 10 ? '0' : '') + s; };
    add(false); add(false); add(false);
    if (prm()) return;
    whileVisible(box, function () {
      var bidLoop = function () { add(true); timers.push(setTimeout(bidLoop, 1600 + Math.random() * 1800)); };
      timers.push(setTimeout(bidLoop, 900));
      var clock = setInterval(function () { secs = secs <= 1 ? 59 : secs - 1; timerEl.textContent = fmt(secs); }, 1000);
      return function () { timers.forEach(clearTimeout); timers = []; clearInterval(clock); };
    }, { threshold: 0.3 });
  });

  /* ---------------- Shared SVG helpers ---------------- */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function placeTip(tip, plot, x, y) {
    var pw = plot.clientWidth;
    tip.hidden = false;
    var tw = tip.offsetWidth;
    var left = Math.max(tw / 2 + 4, Math.min(pw - tw / 2 - 4, x));
    tip.style.left = left + 'px';
    tip.style.top = y + 'px';
  }

  /* ---------------- Volcano plot (real DESeq2 output) ---------------- */
  safe('volcano', function () {
    var fig = $('[data-volcano]');
    if (!fig) return;
    var svg = $('svg', fig), tip = $('.viz__tip', fig), plot = $('.viz__plot', fig);
    var W = 640, H = 340, m = { l: 46, r: 14, t: 12, b: 40 };
    // Size the viewBox to real pixels so text stays legible on phones.
    var size = function () {
      W = Math.max(300, Math.round(plot.clientWidth || 640));
      H = Math.round(Math.max(250, Math.min(360, W * 0.55)));
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    };
    size();
    var data = null, pts = [], built = false, revealed = false;

    var build = function () {
      if (!data) return;
      size();
      svg.textContent = '';
      var P = data.points;
      var xmax = 0, ymax = 0;
      P.forEach(function (p) { xmax = Math.max(xmax, Math.abs(p[0])); ymax = Math.max(ymax, p[1]); });
      xmax = Math.min(10, Math.ceil(xmax));
      ymax = Math.ceil(ymax / 20) * 20;
      var sx = function (v) { return m.l + (Math.max(-xmax, Math.min(xmax, v)) + xmax) / (2 * xmax) * (W - m.l - m.r); };
      var sy = function (v) { return H - m.b - v / ymax * (H - m.t - m.b); };

      var ax = svgEl('g', { class: 'axis' }, svg);
      for (var yv = 0; yv <= ymax; yv += ymax / 4) {
        svgEl('line', { x1: m.l, x2: W - m.r, y1: sy(yv), y2: sy(yv), class: yv === 0 ? 'baseline' : 'gridline' }, ax);
        var ty = svgEl('text', { x: m.l - 8, y: sy(yv) + 4, 'text-anchor': 'end' }, ax);
        ty.textContent = Math.round(yv);
      }
      var step = xmax > 6 ? 5 : 2;
      for (var xv = -Math.floor(xmax / step) * step; xv <= xmax; xv += step) {
        var tx = svgEl('text', { x: sx(xv), y: H - m.b + 18, 'text-anchor': 'middle' }, ax);
        tx.textContent = xv;
      }
      var xt = svgEl('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', class: 'axis-title' }, svg);
      xt.textContent = 'log₂ fold change (treated / untreated)';
      var yt = svgEl('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', class: 'axis-title', transform: 'rotate(-90 12 ' + (m.t + H - m.b) / 2 + ')' }, svg);
      yt.textContent = '−log₁₀ adjusted p';

      svgEl('line', { x1: sx(-1), x2: sx(-1), y1: m.t, y2: H - m.b, class: 'thresh' }, svg);
      svgEl('line', { x1: sx(1), x2: sx(1), y1: m.t, y2: H - m.b, class: 'thresh' }, svg);
      svgEl('line', { x1: m.l, x2: W - m.r, y1: sy(1.3), y2: sy(1.3), class: 'thresh' }, svg);

      var g = svgEl('g', {}, svg);
      pts = [];
      var order = P.slice().sort(function (a, b) { return Math.abs(a[2]) - Math.abs(b[2]); });
      order.forEach(function (p) {
        var cx = sx(p[0]), cy = sy(p[1]);
        var fill = p[2] === 1 ? 'var(--v-up)' : p[2] === -1 ? 'var(--v-down)' : 'var(--v-ns)';
        var c = svgEl('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: p[2] ? 3.2 : 2.6, fill: fill, stroke: 'var(--surface)', 'stroke-width': 0.8, class: 'pt' }, g);
        if (!prm() && !revealed) {
          c.style.opacity = '0';
          c.style.transition = 'opacity .5s ease ' + (Math.min(1, Math.hypot(cx - W / 2, cy - H) / 520) * 0.9).toFixed(2) + 's';
        }
        pts.push({ x: cx, y: cy, p: p, el: c });
      });

      // Label the strongest hits, skipping any that would collide.
      var labels = svgEl('g', {}, svg);
      var placed = [];
      P.filter(function (p) { return p[2] !== 0 && !/^ENSG/.test(p[3]); })
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, 14)
        .forEach(function (p) {
          var x = sx(p[0]), y = sy(p[1]);
          var right = p[0] > 0;
          var lx = right ? x + 6 : x - 6, ly = y + 3.5;
          var wEst = p[3].length * 6.2;
          var box = { x0: right ? lx : lx - wEst, x1: right ? lx + wEst : lx, y0: ly - 9, y1: ly + 2 };
          if (box.x1 > W - m.r || box.x0 < m.l) return;
          var hit = placed.some(function (b) { return !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1); });
          if (hit || placed.length >= 7) return;
          placed.push(box);
          var t = svgEl('text', { x: lx, y: ly, 'text-anchor': right ? 'start' : 'end', class: 'pt-label' }, labels);
          t.textContent = p[3];
        });

      var upEl = $('[data-up]', fig), downEl = $('[data-down]', fig);
      if (upEl) upEl.textContent = data.up;
      if (downEl) downEl.textContent = data.down;
      built = true;
    };

    var reveal = function () {
      if (revealed) return;
      revealed = true;
      requestAnimationFrame(function () { pts.forEach(function (o) { o.el.style.opacity = ''; }); });
    };

    var hot = null;
    var toLocal = function (e) {
      var r = svg.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H, sx: r.width / W };
    };
    var fmtP = function (nlp) {
      var e = Math.floor(nlp);
      var mant = Math.pow(10, -(nlp - e));
      if (nlp < 3) return Math.pow(10, -nlp).toFixed(3);
      return mant.toFixed(1) + '×10⁻' + String(e + (mant < 1 ? 1 : 0)).split('').map(function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]; }).join('');
    };
    var clearHot = function () { if (hot) { hot.el.setAttribute('r', hot.p[2] ? 3.2 : 2.6); hot = null; } tip.hidden = true; };
    svg.addEventListener('pointermove', function (e) {
      var q = toLocal(e);
      var best = null, bd = 196;
      for (var i = 0; i < pts.length; i++) {
        var dx = pts[i].x - q.x, dy = pts[i].y - q.y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = pts[i]; }
      }
      if (!best) { clearHot(); return; }
      if (hot !== best) {
        clearHot();
        hot = best;
        best.el.setAttribute('r', 6);
        best.el.parentNode.appendChild(best.el);
      }
      var p = best.p;
      var dir = p[2] === 1 ? 'Up' : p[2] === -1 ? 'Down' : 'Not significant';
      var sw = p[2] === 1 ? 'sw--up' : p[2] === -1 ? 'sw--down' : 'sw--ns';
      tip.innerHTML = '<strong></strong>' +
        '<div class="row"><span><i class="sw ' + sw + '"></i>' + dir + '</span></div>' +
        '<div class="row"><span>log₂ FC</span><b>' + (p[0] > 0 ? '+' : '') + p[0].toFixed(2) + '</b></div>' +
        '<div class="row"><span>adj. p</span><b>' + fmtP(p[1]) + '</b></div>';
      tip.firstChild.textContent = p[3];
      var r = svg.getBoundingClientRect();
      placeTip(tip, plot, best.x / W * r.width, best.y / H * r.height);
    });
    svg.addEventListener('pointerleave', clearHot);
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (built && Math.round(plot.clientWidth) !== W) { clearHot(); build(); }
      }, 150);
    });

    whileVisible(fig, function () {
      if (!data) {
        fetch('assets/data/airway-volcano.json')
          .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
          .then(function (d) { data = d; build(); reveal(); })
          .catch(function () { var n = $('.viz__note', fig); if (n) n.textContent = 'Plot data could not be loaded. Open the site through a web server or GitHub Pages.'; });
      } else if (!built) { build(); reveal(); }
    }, { rootMargin: '300px 0px', threshold: 0 });
  });

  /* ---------------- SEIRD model (RK4 in the browser) ---------------- */
  safe('seird', function () {
    var fig = $('[data-seird]');
    if (!fig) return;
    var svg = $('svg', fig), tip = $('.viz__tip', fig), plot = $('.viz__plot', fig), legend = $('[data-legend]', fig);
    var W = 640, H = 300, m = { l: 46, r: 92, t: 12, b: 34 };

    // Same parameters as the notebook.
    var N = 1.1e7, gamma = 1 / 10, mu = 0.01, E0 = 1000, I0 = 574, DAYS = 180;
    var series = [
      { key: 'S', name: 'Susceptible', color: 'var(--s-susceptible)' },
      { key: 'I', name: 'Infectious', color: 'var(--s-infectious)' },
      { key: 'R', name: 'Recovered', color: 'var(--s-recovered)' },
      { key: 'E', name: 'Exposed', color: 'var(--s-exposed)' },
      { key: 'D', name: 'Deceased', color: 'var(--s-deceased)' }
    ];
    var idx = { S: 0, E: 1, I: 2, R: 3, D: 4 };
    var visible = { S: true, I: true, R: true, E: true, D: true };
    var r0In = $('[data-in="r0"]', fig), incIn = $('[data-in="inc"]', fig);
    var r0Out = $('[data-out="r0"]', fig), incOut = $('[data-out="inc"]', fig);
    var peakEl = $('[data-peak]', fig), deathEl = $('[data-deaths]', fig);
    var sol = [];

    var solve = function (R0, inc) {
      var beta = R0 * (gamma + mu), sigma = 1 / inc;
      var f = function (y) {
        var S = y[0], E = y[1], I = y[2];
        var inf = beta * S * I / N;
        return [-inf, inf - sigma * E, sigma * E - (gamma + mu) * I, gamma * I, mu * I];
      };
      var y = [N - E0 - I0, E0, I0, 0, 0];
      var out = [y.slice()];
      var h = 0.25;
      for (var d = 0; d < DAYS; d++) {
        for (var s = 0; s < 4; s++) {
          var k1 = f(y);
          var k2 = f(y.map(function (v, i) { return v + h / 2 * k1[i]; }));
          var k3 = f(y.map(function (v, i) { return v + h / 2 * k2[i]; }));
          var k4 = f(y.map(function (v, i) { return v + h * k3[i]; }));
          y = y.map(function (v, i) { return v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]); });
        }
        out.push(y.slice());
      }
      return out;
    };

    var sx = function (d) { return m.l + d / DAYS * (W - m.l - m.r); };
    var sy = function (v) { return H - m.b - v / N * (H - m.t - m.b); };
    var fmtN = function (v) {
      if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 1 : 2) + 'M';
      if (v >= 1e3) return (v / 1e3).toFixed(v >= 1e5 ? 0 : 1) + 'k';
      return Math.round(v).toString();
    };

    // Frame, sized to real pixels so text stays legible on phones. Rebuilt on resize.
    var lines = {}, labels = {}, ticks = {}, dots = {}, cross = null;
    var layout = function () {
      W = Math.max(300, Math.round(plot.clientWidth || 640));
      H = Math.round(Math.max(230, Math.min(320, W * 0.5)));
      m.r = 100;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      svg.textContent = '';
      var ax = svgEl('g', { class: 'axis' }, svg);
      [0, 2e6, 4e6, 6e6, 8e6, 10e6].forEach(function (v) {
        svgEl('line', { x1: m.l, x2: W - m.r, y1: sy(v), y2: sy(v), class: v === 0 ? 'baseline' : 'gridline' }, ax);
        var t = svgEl('text', { x: m.l - 8, y: sy(v) + 4, 'text-anchor': 'end' }, ax);
        t.textContent = v === 0 ? '0' : v / 1e6 + 'M';
      });
      (W < 480 ? [0, 60, 120, 180] : [0, 30, 60, 90, 120, 150, 180]).forEach(function (d) {
        var t = svgEl('text', { x: sx(d), y: H - m.b + 18, 'text-anchor': 'middle' }, ax);
        t.textContent = d;
      });
      var xt = svgEl('text', { x: (m.l + W - m.r) / 2, y: H - 2, 'text-anchor': 'middle', class: 'axis-title' }, svg);
      xt.textContent = 'Days';
      var gLines = svgEl('g', {}, svg);
      var gLabels = svgEl('g', {}, svg);
      series.forEach(function (s) {
        lines[s.key] = svgEl('path', { class: 'series', stroke: s.color }, gLines);
        ticks[s.key] = svgEl('line', { stroke: s.color, 'stroke-width': 3, 'stroke-linecap': 'round' }, gLabels);
        labels[s.key] = svgEl('text', { class: 'series-label' }, gLabels);
        labels[s.key].textContent = s.name;
      });
      cross = svgEl('line', { class: 'cross', y1: m.t, y2: H - m.b, visibility: 'hidden' }, svg);
      series.forEach(function (s) { dots[s.key] = svgEl('circle', { r: 4.5, fill: s.color, class: 'hover-dot', visibility: 'hidden' }, svg); });
    };
    layout();

    // Legend (toggles)
    series.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', 'true');
      b.innerHTML = '<i class="sw sw--line"></i>';
      b.firstChild.style.background = s.color;
      b.appendChild(document.createTextNode(s.name));
      b.addEventListener('click', function () {
        var on = Object.keys(visible).filter(function (k) { return visible[k]; }).length;
        if (visible[s.key] && on === 1) return;
        visible[s.key] = !visible[s.key];
        b.setAttribute('aria-pressed', String(visible[s.key]));
        draw(false);
      });
      legend.appendChild(b);
    });

    var pathFor = function (k) {
      var i = idx[k], d = '';
      for (var t = 0; t <= DAYS; t++) d += (t ? 'L' : 'M') + sx(t).toFixed(1) + ' ' + sy(sol[t][i]).toFixed(1);
      return d;
    };

    var draw = function (animate) {
      series.forEach(function (s) {
        var p = lines[s.key];
        p.setAttribute('d', pathFor(s.key));
        p.style.opacity = visible[s.key] ? 1 : 0;
        labels[s.key].style.opacity = ticks[s.key].style.opacity = visible[s.key] ? 1 : 0;
        if (animate) {
          var len = p.getTotalLength();
          p.style.transition = 'none';
          p.style.strokeDasharray = len;
          p.style.strokeDashoffset = len;
          p.getBoundingClientRect();
          p.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(0.65,0,0.35,1), opacity .25s';
          p.style.strokeDashoffset = 0;
        } else {
          p.style.strokeDasharray = '';
          p.style.strokeDashoffset = '';
        }
      });
      // End labels, nudged apart so they never overlap.
      var items = series.filter(function (s) { return visible[s.key]; }).map(function (s) {
        return { k: s.key, y: sy(sol[DAYS][idx[s.key]]) };
      }).sort(function (a, b) { return a.y - b.y; });
      var gap = 14, bottom = H - m.b;
      for (var i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < gap) items[i].y = items[i - 1].y + gap;
      if (items.length && items[items.length - 1].y > bottom) {
        items[items.length - 1].y = bottom;
        for (var j = items.length - 2; j >= 0; j--) if (items[j + 1].y - items[j].y < gap) items[j].y = items[j + 1].y - gap;
      }
      items.forEach(function (it) {
        var x = W - m.r + 8;
        ticks[it.k].setAttribute('x1', x); ticks[it.k].setAttribute('x2', x + 8);
        ticks[it.k].setAttribute('y1', it.y); ticks[it.k].setAttribute('y2', it.y);
        labels[it.k].setAttribute('x', x + 13);
        labels[it.k].setAttribute('y', it.y + 4);
      });
      // Readout
      var peak = 0, pd = 0;
      sol.forEach(function (row, d) { if (row[2] > peak) { peak = row[2]; pd = d; } });
      peakEl.textContent = pd >= DAYS ? 'not reached by day ' + DAYS : 'day ' + pd + ', ' + fmtN(peak) + ' infectious';
      deathEl.textContent = fmtN(sol[DAYS][4]);
    };

    var setFill = function (input) {
      var p = (input.value - input.min) / (input.max - input.min) * 100;
      input.style.setProperty('--fill', p + '%');
    };
    var recompute = function (animate) {
      var R0 = +r0In.value, inc = +incIn.value;
      r0Out.textContent = R0.toFixed(2);
      incOut.textContent = inc.toFixed(1) + ' days';
      setFill(r0In); setFill(incIn);
      sol = solve(R0, inc);
      draw(animate);
      if (lastHover !== null) hoverAt(lastHover);
    };
    var raf = 0;
    [r0In, incIn].forEach(function (inp) {
      inp.addEventListener('input', function () {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () { recompute(false); });
      });
    });

    var lastHover = null;
    var hoverAt = function (day) {
      lastHover = day;
      var x = sx(day);
      cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('visibility', 'visible');
      var rows = '';
      series.forEach(function (s) {
        var v = sol[day][idx[s.key]];
        var on = visible[s.key];
        dots[s.key].setAttribute('cx', x); dots[s.key].setAttribute('cy', sy(v));
        dots[s.key].setAttribute('visibility', on ? 'visible' : 'hidden');
        if (on) rows += '<div class="row"><span><i class="sw sw--line" style="background:' + s.color + '"></i>' + s.name + '</span><b>' + fmtN(v) + '</b></div>';
      });
      tip.innerHTML = '<strong>Day ' + day + '</strong>' + rows;
      var r = svg.getBoundingClientRect();
      var px = x / W * r.width;
      tip.hidden = false;
      var tw = tip.offsetWidth;
      var left = px + 14 + tw > r.width ? px - 14 - tw / 2 : px + 14 + tw / 2;
      tip.style.left = left + 'px';
      tip.style.top = (m.t / H * r.height + tip.offsetHeight + 4) + 'px';
    };
    var hide = function () {
      lastHover = null;
      tip.hidden = true;
      cross.setAttribute('visibility', 'hidden');
      series.forEach(function (s) { dots[s.key].setAttribute('visibility', 'hidden'); });
    };
    svg.addEventListener('pointermove', function (e) {
      var r = svg.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width * W;
      if (x < m.l - 6 || x > W - m.r + 6) { hide(); return; }
      var day = Math.round((x - m.l) / (W - m.l - m.r) * DAYS);
      hoverAt(Math.max(0, Math.min(DAYS, day)));
    });
    svg.addEventListener('pointerleave', hide);
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(function () {
        if (Math.round(plot.clientWidth) === W) return;
        hide(); layout(); draw(false);
      }, 150);
    });

    recompute(false);
    if (prm()) return;
    var shown = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !shown) { shown = true; draw(true); io.disconnect(); }
      });
    }, { threshold: 0.4 });
    // Hide lines until the chart scrolls into view, then draw them in.
    series.forEach(function (s) {
      var p = lines[s.key], len = p.getTotalLength();
      p.style.strokeDasharray = len; p.style.strokeDashoffset = len;
    });
    io.observe(fig);
  });
})();
