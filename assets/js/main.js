/* Tati Portela — interações do site (sem dependências) */
(function () {
  'use strict';

  var WHATSAPP = '5541997786117';
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (e) { return null; }
  }
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }
  function waUrl(text) {
    return 'https://wa.me/' + WHATSAPP + (text ? '?text=' + encodeURIComponent(text) : '');
  }

  /* ---------- Remove o service worker do antigo app (descontinuado) ---------- */
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
    if (window.caches && caches.keys) {
      caches.keys().then(function (keys) {
        keys.filter(function (k) { return k.indexOf('tati-fitness') === 0; })
          .forEach(function (k) { caches.delete(k); });
      }).catch(function () {});
    }
  }

  /* ---------- Links de WhatsApp com mensagem pronta ---------- */
  $all('a[data-wa]').forEach(function (a) {
    a.href = waUrl(a.getAttribute('data-wa'));
    a.addEventListener('click', function () {
      track('generate_lead', { method: 'whatsapp', cta: a.getAttribute('data-cta') || 'link' });
    });
  });

  /* ---------- Tema claro/escuro ---------- */
  var themeBtn = $('[data-theme-toggle]');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var current = root.getAttribute('data-theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = current === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      store('tp-theme', next);
    });
  }

  /* ---------- Cabeçalho e botão flutuante conforme a rolagem ---------- */
  var header = $('[data-header]');
  var fab = $('[data-fab]');
  var ticking = false;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header && !header.classList.contains('site-header--solid')) {
      header.classList.toggle('is-scrolled', y > 24);
    }
    if (fab) fab.classList.toggle('is-visible', y > window.innerHeight * 0.7);
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { window.requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Menu mobile ---------- */
  var menuBtn = $('[data-menu-toggle]');
  var menu = $('#menu');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    // Com o menu aberto, o restante da página fica inerte (foco e leitores de tela presos ao menu)
    $all('body > main, body > footer, body > .wa-fab, body > .skip-link').forEach(function (el) {
      el.inert = open;
    });
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    if (open) {
      var first = $('a', menu);
      if (first) first.focus();
    }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    $all('a', menu).forEach(function (a) {
      a.addEventListener('click', function () { setMenu(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenu(false);
        menuBtn.focus();
      }
    });
    window.matchMedia('(min-width: 1081px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Link ativo no menu (scroll-spy) ---------- */
  var navLinks = $all('.main-nav a[href^="#"]');
  if ('IntersectionObserver' in window && navLinks.length) {
    var byId = {};
    navLinks.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove('is-active'); });
        var link = byId[entry.target.id];
        if (link) link.classList.add('is-active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $all('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Animações de entrada ---------- */
  // Revela tudo o que já chegou à área visível OU ficou acima dela — assim nada fica oculto
  // em rolagens rápidas, saltos por âncora (#contato) ou impressão.
  var pending = $all('.reveal');
  function revealCheck() {
    if (!pending.length) return;
    var limit = window.innerHeight * 0.92;
    pending = pending.filter(function (el) {
      if (el.getBoundingClientRect().top < limit) {
        el.classList.add('is-visible');
        return false;
      }
      return true;
    });
  }
  if (reduceMotion) {
    pending.forEach(function (el) { el.classList.add('is-visible'); });
    pending = [];
  } else {
    var revealTick = false;
    var onRevealScroll = function () {
      if (revealTick) return;
      revealTick = true;
      window.requestAnimationFrame(function () { revealTick = false; revealCheck(); });
    };
    window.addEventListener('scroll', onRevealScroll, { passive: true });
    window.addEventListener('resize', onRevealScroll);
    window.addEventListener('hashchange', revealCheck);
    window.addEventListener('beforeprint', function () {
      pending.forEach(function (el) { el.classList.add('is-visible'); });
      pending = [];
    });
    revealCheck();
  }

  /* ---------- Contadores ---------- */
  var counters = $all('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion && counters.length) {
    var countIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count'), 10);
        var start = null;
        var duration = 1600;
        countIO.unobserve(el);
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / duration, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = String(Math.round(target * eased));
          if (p < 1) window.requestAnimationFrame(step);
        }
        el.textContent = '0';
        window.requestAnimationFrame(step);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { countIO.observe(el); });
  }

  /* ---------- Carrossel de depoimentos ---------- */
  var track_ = $('#lista-depoimentos');
  var prev = $('[data-carousel-prev]');
  var next = $('[data-carousel-next]');
  if (track_ && prev && next) {
    var stepSize = function () {
      var item = track_.querySelector('li');
      return item ? item.getBoundingClientRect().width + 20 : track_.clientWidth;
    };
    var update = function () {
      var max = track_.scrollWidth - track_.clientWidth - 2;
      prev.disabled = track_.scrollLeft <= 2;
      next.disabled = track_.scrollLeft >= max;
    };
    prev.addEventListener('click', function () {
      track_.scrollBy({ left: -stepSize(), behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    next.addEventListener('click', function () {
      track_.scrollBy({ left: stepSize(), behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    track_.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- Mapa sob demanda (privacidade + performance) ---------- */
  $all('[data-map-src]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var iframe = document.createElement('iframe');
      iframe.src = btn.getAttribute('data-map-src');
      iframe.title = 'Mapa: Studio Corpo e Mente em Sintonia, Av. República Argentina, 2403, Curitiba';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.setAttribute('allowfullscreen', '');
      btn.replaceWith(iframe);
      track('map_open');
    });
  });

  /* ---------- Formulário → WhatsApp ---------- */
  var form = $('#form-contato');
  if (form) {
    var phone = form.elements.telefone;
    var status = $('.form-status', form);

    phone.addEventListener('input', function () {
      if (phone.selectionStart !== phone.value.length) return;
      var raw = phone.value.trim();
      var d = raw.replace(/\D/g, '');
      if (raw.charAt(0) === '+' || d.length > 11) return;
      var out = d;
      if (d.length > 2) out = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      if (d.length > 6) out = '(' + d.slice(0, 2) + ') ' + d.slice(2, d.length - 4) + '-' + d.slice(-4);
      phone.value = out;
    });

    var setError = function (field, msg) {
      var err = document.getElementById(field.getAttribute('aria-describedby'));
      field.setAttribute('aria-invalid', msg ? 'true' : 'false');
      if (err) err.textContent = msg || '';
      return !msg;
    };
    var checks = {
      nome: function (f) { return f.value.trim().length >= 2 ? '' : 'Informe seu nome.'; },
      telefone: function (f) { return f.value.replace(/\D/g, '').length >= 10 ? '' : 'Informe um WhatsApp válido, com DDD.'; },
      interesse: function (f) { return f.value ? '' : 'Selecione um interesse.'; }
    };
    Object.keys(checks).forEach(function (name) {
      var f = form.elements[name];
      f.addEventListener('blur', function () { if (f.value) setError(f, checks[name](f)); });
      f.addEventListener('input', function () {
        if (f.getAttribute('aria-invalid') === 'true') setError(f, checks[name](f));
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstInvalid = null;
      Object.keys(checks).forEach(function (name) {
        var f = form.elements[name];
        if (!setError(f, checks[name](f)) && !firstInvalid) firstInvalid = f;
      });
      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      var data = new FormData(form);
      var lines = [
        'Olá, Tati! Vim pelo site e quero agendar minha avaliação.',
        '',
        '*Nome:* ' + data.get('nome').trim(),
        '*WhatsApp:* ' + data.get('telefone').trim(),
        '*Interesse:* ' + data.get('interesse'),
        '*Formato:* ' + data.get('formato')
      ];
      var msg = (data.get('mensagem') || '').trim();
      if (msg) lines.push('*Mensagem:* ' + msg);

      var url = waUrl(lines.join('\n'));
      var win = window.open(url, '_blank');
      if (win) win.opener = null;
      else window.location.href = url;

      track('generate_lead', { method: 'whatsapp', cta: 'formulario', interesse: data.get('interesse') });
      status.textContent = 'Tudo certo! Abrimos o WhatsApp com sua mensagem — é só tocar em enviar.';
      form.reset();
    });
  }

  /* ---------- Consentimento de cookies (LGPD) ---------- */
  var banner = $('[data-consent]');
  function showBanner() { if (banner) banner.hidden = false; }
  if (banner) {
    // Aparece só depois das fontes carregarem: evita "pulo" de layout (CLS) dentro do aviso
    if (!store('tp-consent')) {
      var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
      fontsReady.then(function () { setTimeout(showBanner, 400); });
    }
    $all('[data-consent-choice]', banner).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var choice = btn.getAttribute('data-consent-choice');
        store('tp-consent', choice);
        if (typeof window.gtag === 'function') window.gtag('consent', 'update', { analytics_storage: choice });
        banner.hidden = true;
      });
    });
  }
  $all('[data-consent-reset]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      store('tp-consent', null);
      showBanner();
      var first = banner && $('button', banner);
      if (first) first.focus();
    });
  });

  /* ---------- Ano atual no rodapé ---------- */
  $all('[data-year]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
})();
