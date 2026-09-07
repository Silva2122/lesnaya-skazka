/* ЖК «Лесная сказка» — интерактив.
   Портирован с dc-рантайма (React) на чистый JS: те же состояния и те же цвета. */
(function () {
  'use strict';

  var D = '#103C1F', L = '#8ED968', W = '#F5F6F2';

  var state = { view: 'genplan', house: 1, gallery: 'photo', chron: 'sep', sent: false };

  // таблетки-табы: светлые секции красятся bg/fg, тёмные — bgDark/fgDark
  var DARK_TABS = { view: true };
  var PIN_IDLE = { photo: 'rgba(16,60,31,.6)', house: 'rgba(16,60,31,.65)' };

  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------ шахматка */
  function seed(a, b, house) {
    return (Math.sin(a * 12.9898 + b * 78.233 + house * 3.7) * 43758.5453) % 1;
  }

  function chessRows(house) {
    return [6, 5, 4, 3, 2, 1].map(function (floor) {
      var cells = [];
      for (var i = 0; i < 8; i++) {
        var v = Math.abs(seed(floor, i, house));
        var st = v < 0.45 ? 'free' : v < 0.6 ? 'hold' : 'sold';
        cells.push({
          label: st === 'free' ? (1 + Math.floor(v * 7) % 3) + 'к' : '',
          title: st === 'free' ? 'Свободна' : st === 'hold' ? 'Бронь' : 'Продана',
          bg: st === 'free' ? L : st === 'hold' ? '#C6E9AF' : 'rgba(245,246,242,.12)',
          cursor: st === 'free' ? 'pointer' : 'default'
        });
      }
      return { floor: floor, cells: cells };
    });
  }

  var chessPane = document.querySelector('[data-pane="chess"]');
  // структура пане: [0] таблетки домов, [1] сетка этажей, [2] легенда
  var chessGrid = chessPane ? chessPane.children[1] : null;

  function renderChess(rows) {
    if (!chessGrid) return;
    chessGrid.innerHTML = rows.map(function (row) {
      return '<div style="display:grid;grid-template-columns:44px repeat(8,minmax(0,1fr));gap:4px;align-items:center">'
        + '<div style="font-size:12px;opacity:.6">' + row.floor + ' эт.</div>'
        + row.cells.map(function (c) {
          return '<div title="' + c.title + '" style="height:44px;background:' + c.bg
            + ';color:' + D + ';display:flex;align-items:center;justify-content:center;font-size:12px;cursor:'
            + c.cursor + '">' + c.label + '</div>';
        }).join('')
        + '</div>';
    }).join('');
  }

  /* ------------------------------------------------------------ отрисовка */
  function paintTabs() {
    $$('[data-select]').forEach(function (el) {
      var parts = el.getAttribute('data-select').split(':');
      var group = parts[0], value = parts[1];
      if (group === 'house') return;
      var on = state[group] === value;
      if (DARK_TABS[group]) {
        el.style.background = on ? L : 'transparent';
        el.style.color = on ? D : W;
      } else {
        el.style.background = on ? D : 'transparent';
        el.style.color = on ? L : D;
      }
    });
  }

  function paintPins() {
    $$('[data-pin]').forEach(function (el) {
      var on = String(state.house) === el.getAttribute('data-select').split(':')[1];
      // ёлки — и в аллее, и метками на фото — красятся классом
      if (el.classList.contains('pine') || el.classList.contains('pin-tree')) {
        el.classList.toggle('on', on);
        return;
      }
      el.style.background = on ? L : PIN_IDLE[el.getAttribute('data-pin')];
      el.style.color = on ? D : W;
    });
  }

  function paintPanes() {
    $$('[data-pane]').forEach(function (el) {
      var name = el.getAttribute('data-pane');
      var group = (name === 'genplan' || name === 'chess') ? 'view' : 'gallery';
      el.hidden = state[group] !== name;
    });
    $$('[data-chron]').forEach(function (el) {
      el.hidden = state.chron !== el.getAttribute('data-chron');
    });
  }

  function paintHouseInfo(rows) {
    var free = rows.reduce(function (a, r) {
      return a + r.cells.filter(function (c) { return c.label; }).length;
    }, 0);
    var status = state.house <= 3 ? 'Сдан' : state.house <= 6 ? 'Строится' : 'Планируется';
    $$('[data-bind="activeHouse"]').forEach(function (el) { el.textContent = state.house; });
    $$('[data-bind="activeHouseFree"]').forEach(function (el) { el.textContent = free; });
    $$('[data-bind="activeHouseStatus"]').forEach(function (el) { el.textContent = status; });
  }

  function render() {
    var rows = chessRows(state.house);
    renderChess(rows);
    paintTabs();
    paintPins();
    paintPanes();
    paintHouseInfo(rows);
    setupReveal();
  }

  /* ------------------------------------------------------------ события */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-select]');
    if (!btn) return;
    var parts = btn.getAttribute('data-select').split(':');
    state[parts[0]] = parts[0] === 'house' ? parseInt(parts[1], 10) : parts[1];
    render();
  });

  $$('[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      state.sent = true;
      $$('[data-bind="formLabel"]').forEach(function (el) { el.textContent = 'Заявка отправлена'; });
    });
  });

  /* ------------------------------------------------------------ появление блоков */
  // Блок показываем сразу, как только попал в кадр — ждать картинку нельзя:
  // до показа он срезан clip-path, и вместо «загружается» видна пустота.
  // Сама картинка проявляется отдельно, когда придёт.
  function reveal(el) {
    el.style.willChange = el.classList.contains('rv-img') ? 'clip-path' : 'opacity, transform';
    el.classList.add('in');
    // will-change держим только на время перехода — иначе висят лишние слои
    setTimeout(function () { el.style.willChange = ''; }, 1400);
    fadeIn(el.tagName === 'IMG' ? el : el.querySelector('img'));
  }

  // Мягкое проявление самой фотографии поверх плашки-заглушки.
  // Класс вешаем из JS: без скрипта картинка просто видна сразу.
  function fadeIn(img) {
    if (!img || img.dataset.ld) return;
    img.dataset.ld = '1';
    if (img.complete && img.naturalWidth) return;
    img.classList.add('ld');
    var on = function () { img.classList.add('ld-on'); };
    img.addEventListener('load', on, { once: true });
    img.addEventListener('error', on, { once: true });
    setTimeout(on, 3000);
  }

  // Разметка блоков под анимацию. Класс .rv/.rv-img прячет элемент, поэтому
  // ставим его только если скрипт жив — без JS страница видна как есть.
  function tagBlocks() {
    $$('[data-screen-label]').forEach(function (sec) {
      Array.prototype.slice.call(sec.children).forEach(function (child, i) {
        if (child.classList.contains('orn') || child.classList.contains('orn-layer')) return;
        if (child.tagName === 'IMG' || child.tagName === 'VIDEO' || child.tagName === 'NAV'
            || child.tagName === 'PICTURE') return;
        // формы и блок поверх видео не проявляем: панель со стеклом при смене
        // прозрачности заметно «доезжает» и выглядит как дефект
        if (child.classList.contains('band-grid')) return;
        // вуали и слои поверх видео/фото: их проявление читается как дефект —
        // затемнение «догоняет» кадр через секунду после показа
        if (getComputedStyle(child).position === 'absolute') return;
        if (!child.classList.contains('rv')) {
          child.classList.add('rv');
          child.style.transitionDelay = (i * 90) + 'ms';
        }
      });
      $$('.zoom', sec).forEach(function (z, i) {
        if (!z.classList.contains('rv-img')) {
          z.classList.add('rv-img');
          z.style.transitionDelay = ((i % 6) * 110) + 'ms';
        }
      });
    });
  }

  // Показываем всё, что уже в кадре или выше него.
  // Намеренно без IntersectionObserver: он молчит в фоновой вкладке и на
  // скрытых панелях, из-за чего блоки могли остаться невидимыми навсегда.
  function revealVisible() {
    if (document.documentElement.classList.contains('is-loading')) return; // ждём прелоадер
    var vh = window.innerHeight || 800;
    $$('.rv:not(.in),.rv-img:not(.in)').forEach(function (t) {
      var r = t.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return;      // элемент в скрытой вкладке
      if (r.top < vh * 1.15) reveal(t);
    });
  }

  var pending = false;
  function scheduleReveal() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; revealVisible(); }, 80);
  }

  function setupReveal() {
    tagBlocks();
    revealVisible();
  }

  window.addEventListener('scroll', scheduleReveal, { passive: true });
  window.addEventListener('resize', scheduleReveal);
  window.addEventListener('load', setupReveal);
  window.addEventListener('pageshow', setupReveal);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) setupReveal();
  });


  /* ------------------------------------------------------------ карусели фото */
  function step(track) {
    var card = track.querySelector('.gal-card');
    if (!card) return track.clientWidth;
    var gap = parseFloat(getComputedStyle(track).gap) || 20;
    return card.getBoundingClientRect().width + gap;
  }

  function syncNav(gal) {
    var track = gal.querySelector('.gal-track');
    var max = track.scrollWidth - track.clientWidth - 2;
    gal.querySelector('.gal-prev').disabled = track.scrollLeft <= 2;
    gal.querySelector('.gal-next').disabled = track.scrollLeft >= max;
  }

  $$('.gal').forEach(function (gal) {
    var track = gal.querySelector('.gal-track');
    gal.querySelector('.gal-prev').addEventListener('click', function () {
      track.scrollBy({ left: -step(track), behavior: 'smooth' });
    });
    gal.querySelector('.gal-next').addEventListener('click', function () {
      track.scrollBy({ left: step(track), behavior: 'smooth' });
    });
    track.addEventListener('scroll', function () { syncNav(gal); }, { passive: true });
    window.addEventListener('resize', function () { syncNav(gal); });
    syncNav(gal);
  });

  /* ------------------------------------------------------------ просмотр фото */
  var lb = null, lbList = [], lbAt = 0;

  function lbBuild() {
    lb = document.createElement('div');
    lb.className = 'lb';
    lb.hidden = true;
    lb.innerHTML =
      '<div class="lb-count"></div><img alt=""><div class="lb-cap"></div>' +
      '<button class="lb-btn lb-close" aria-label="Закрыть">&#10005;</button>' +
      '<button class="lb-btn lb-prev" aria-label="Предыдущее фото">&#8592;</button>' +
      '<button class="lb-btn lb-next" aria-label="Следующее фото">&#8594;</button>';
    document.body.appendChild(lb);
    lb.querySelector('.lb-close').addEventListener('click', lbClose);
    lb.querySelector('.lb-prev').addEventListener('click', function () { lbGo(-1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { lbGo(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) lbClose(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') lbClose();
      if (e.key === 'ArrowLeft') lbGo(-1);
      if (e.key === 'ArrowRight') lbGo(1);
    });
  }

  function lbShow() {
    var card = lbList[lbAt];
    lb.querySelector('img').src = card.dataset.full;
    lb.querySelector('img').alt = card.dataset.cap || '';
    lb.querySelector('.lb-cap').textContent = card.dataset.cap || '';
    lb.querySelector('.lb-count').textContent = (lbAt + 1) + ' / ' + lbList.length;
    var one = lbList.length < 2;
    lb.querySelector('.lb-prev').hidden = one;
    lb.querySelector('.lb-next').hidden = one;
  }

  function lbGo(d) {
    lbAt = (lbAt + d + lbList.length) % lbList.length;
    lbShow();
  }

  function lbOpen(card) {
    if (!lb) lbBuild();
    // листаем в пределах той карусели, из которой открыли
    lbList = $$('.gal-card', card.closest('.gal'));
    lbAt = lbList.indexOf(card);
    lbShow();
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    void lb.offsetWidth;                 // форсируем пересчёт — переход сработает без rAF
    lb.classList.add('on');
    lb.querySelector('.lb-close').focus();
  }

  function lbClose() {
    lb.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(function () { lb.hidden = true; lb.querySelector('img').removeAttribute('src'); }, 250);
  }

  document.addEventListener('click', function (e) {
    var card = e.target.closest('.gal-card');
    if (card) lbOpen(card);
  });


  /* ------------------------------------------------------------ документы */
  var doc = null;

  function docOpen(id, bare) {
    var tpl = document.getElementById(id);
    if (!tpl) return;
    if (!doc) {
      doc = document.createElement('div');
      doc.className = 'doc';
      doc.hidden = true;
      doc.innerHTML = '<div class="doc-box" role="dialog" aria-modal="true">'
        + '<button class="doc-x" aria-label="Закрыть">&#10005;</button>'
        + '<div class="doc-head"><h3></h3></div>'
        + '<div class="doc-body"></div></div>';
      document.body.appendChild(doc);
      doc.querySelector('.doc-x').addEventListener('click', docClose);
      doc.addEventListener('click', function (e) { if (e.target === doc) docClose(); });
      document.addEventListener('keydown', function (e) {
        if (!doc.hidden && e.key === 'Escape') docClose();
      });
    }
    var head = doc.querySelector('.doc-head');
    head.hidden = !!bare;                               // у формы свой заголовок
    doc.querySelector('.doc-box').classList.toggle('cb', !!bare);
    if (!bare) doc.querySelector('h3').textContent = tpl.dataset.title || 'Документ';
    var body = doc.querySelector('.doc-body');
    body.style.padding = bare ? '0' : '';
    body.innerHTML = '';
    body.appendChild(tpl.content.cloneNode(true));
    body.scrollTop = 0;
    doc.hidden = false;
    document.body.style.overflow = 'hidden';
    void doc.offsetWidth;
    doc.classList.add('on');
    doc.querySelector('.doc-x').focus();
  }

  function docClose() {
    doc.classList.remove('on');
    // подбор квартиры мог открыть форму поверх себя — скролл страницы держим закрытым
    document.body.style.overflow = (fp && !fp.hidden) ? 'hidden' : '';
    setTimeout(function () { doc.hidden = true; }, 250);
  }

  document.addEventListener('click', function (e) {
    var link = e.target.closest('[data-doc]');
    if (link) { e.preventDefault(); docOpen(link.getAttribute('data-doc')); return; }
    if (e.target.closest('[data-callback]')) docOpen('tpl-callback', true);
  });

  // форма внутри попапа отправляется так же, как формы на странице
  document.addEventListener('submit', function (e) {
    var f = e.target.closest('.cb-form');
    if (!f) return;
    e.preventDefault();
    $$('[data-bind="formLabel"]', f).forEach(function (el) { el.textContent = 'Заявка отправлена'; });
  });


  /* ------------------------------------------------------------ телефон */
  // Маска +7 (999) 123-45-67. Хранит только цифры, курсор всегда в конце —
  // для короткой формы заявки этого достаточно и не мешает вставке из буфера.
  function formatPhone(digits) {
    var d = digits.replace(/\D/g, '');
    if (d[0] === '8') d = '7' + d.slice(1);
    if (d[0] !== '7') d = '7' + d;
    d = d.slice(0, 11);
    var p = d.slice(1);
    var out = '+7';
    if (p.length) out += ' (' + p.slice(0, 3);
    if (p.length >= 3) out += ')';
    if (p.length > 3) out += ' ' + p.slice(3, 6);
    if (p.length > 6) out += '-' + p.slice(6, 8);
    if (p.length > 8) out += '-' + p.slice(8, 10);
    return out;
  }

  $$('[data-phone]').forEach(function (inp) {
    inp.addEventListener('input', function () {
      inp.value = inp.value.replace(/\D/g, '') ? formatPhone(inp.value) : '';
    });
    inp.addEventListener('focus', function () {
      if (!inp.value) inp.value = '+7 ';
    });
    inp.addEventListener('blur', function () {
      if (inp.value.replace(/\D/g, '').length < 2) inp.value = '';
    });
  });

  /* ------------------------------------------------------------ счётчики */
  // 60000 -> «60 000»: неразрывный пробел, чтобы число не рвалось по строкам
  function group(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  }

  function runCounter(el) {
    if (el.dataset.done) return;
    el.dataset.done = '1';
    var target = parseInt(el.dataset.count, 10) || 0;
    var start = performance.now(), dur = 1100;
    (function step(now) {
      var t = Math.min(1, (now - start) / dur);
      var e = 1 - Math.pow(1 - t, 3);            // плавное торможение
      el.textContent = group(Math.round(target * e));
      if (t < 1) requestAnimationFrame(step);
      else el.textContent = group(target);
    })(start);
  }

  function checkCounters() {
    $$('[data-count]:not([data-done])').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < (window.innerHeight || 800) * 0.92 && r.bottom > 0) runCounter(el);
    });
  }
  window.addEventListener('scroll', checkCounters, { passive: true });
  window.addEventListener('load', checkCounters);
  setTimeout(checkCounters, 600);

  /* ------------------------------------------------------------ фоновое видео */
  function kickVideo() {
    ['band-video', 'atmo-video'].forEach(kick1);
  }

  function kick1(id) {
    var v = document.getElementById(id);
    if (!v) return;
    v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  /* ------------------------------------------------------ планировки и цены */
  // Данные реальные: выгружены с жклеснаясказка.рф (9 домов, 187 свободных
  // квартир). Грузим один раз при первом открытии, дальше работаем локально.
  var fp = null, fpData = null, fpLoading = false;
  var fpQ = { rooms: 0, house: 0, floor: 0, tag: '', sort: 'p' };
  var FP_PAGE = 24, fpShown = FP_PAGE;

  var SPRIG = '<svg class="sprig" viewBox="0 0 14 18" aria-hidden="true">'
    + '<path d="M7 18V2.4M7 13.6 2 10.6M7 13.6l5-3M7 9.5 2.6 6.8M7 9.5l4.4-2.7'
    + 'M7 5.6 3.6 3.4M7 5.6l3.4-2.2"/></svg>';

  function num(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function area(a) { return String(a).replace('.', ','); }
  function roomWord(r) { return r + '-комнатная'; }

  function fpBuild() {
    fp = document.createElement('div');
    fp.className = 'fp';
    fp.hidden = true;
    fp.innerHTML =
      '<div class="fp-box" role="dialog" aria-modal="true" aria-label="Планировки и цены">'
      + '<button class="doc-x fp-x" aria-label="Закрыть">&#10005;</button>'
      + '<div class="fp-head">'
      + '<div class="lbl">' + SPRIG + 'Квартиры</div>'
      + '<h3>Планировки и цены</h3>'
      + '<p class="note fp-sub"></p>'
      + '</div>'
      + '<div class="fp-filters"></div>'
      + '<div class="fp-scroll"><div class="fp-count"></div><div class="fp-list"></div>'
      + '<div class="fp-more"></div></div>'
      + '<div class="fp-detail" hidden></div>'
      + '</div>';
    document.body.appendChild(fp);
    fp.querySelector('.fp-x').addEventListener('click', fpClose);
    fp.addEventListener('click', function (e) { if (e.target === fp) fpClose(); });
    document.addEventListener('keydown', function (e) {
      if (fp && !fp.hidden && e.key === 'Escape') {
        if (!fp.querySelector('.fp-detail').hidden) fpDetailClose(); else fpClose();
      }
    });
    fp.addEventListener('click', fpClick);
  }

  function fpChips(name, items, cur) {
    return '<div class="fp-frow"><span class="fp-flabel">' + name + '</span><div class="fp-chips">'
      + items.map(function (it) {
        return '<button class="fp-chip' + (String(it.v) === String(cur) ? ' on' : '')
          + '" data-f="' + it.k + '" data-v="' + it.v + '">' + it.t
          + (it.n != null ? '<i>' + it.n + '</i>' : '') + '</button>';
      }).join('') + '</div></div>';
  }

  function fpMatch(x, skip) {
    if (fpQ.rooms && skip !== 'rooms' && x.r !== fpQ.rooms) return false;
    if (fpQ.house && skip !== 'house' && x.h !== fpQ.house) return false;
    if (fpQ.floor && skip !== 'floor' && x.f !== fpQ.floor) return false;
    if (fpQ.tag && skip !== 'tag' && x.t.indexOf(fpQ.tag) < 0) return false;
    return true;
  }

  function fpCount(skip, key, val) {
    return fpData.flats.filter(function (x) {
      return fpMatch(x, skip) && (val === 0 || val === '' || x[key] === val
        || (key === 't' && x.t.indexOf(val) >= 0));
    }).length;
  }

  function fpRenderFilters() {
    var f = fp.querySelector('.fp-filters');
    var rooms = [{ k: 'rooms', v: 0, t: 'Все' }].concat([1, 2, 3].map(function (r) {
      return { k: 'rooms', v: r, t: r, n: fpCount('rooms', 'r', r) };
    }));
    var houses = [{ k: 'house', v: 0, t: 'Все' }].concat(fpData.houses.filter(function (h) {
      return h.free;
    }).map(function (h) {
      return { k: 'house', v: h.h, t: 'Дом ' + h.m, n: fpCount('house', 'h', h.h) };
    }));
    var floors = [{ k: 'floor', v: 0, t: 'Любой' }].concat([1, 2, 3, 4, 5, 6, 7].map(function (n) {
      return { k: 'floor', v: n, t: n, n: fpCount('floor', 'f', n) };
    }));
    var tags = [{ k: 'tag', v: '', t: 'Все' }].concat(
      ['С видом на лес', 'Двухуровневые', 'С ремонтом'].map(function (t) {
        return { k: 'tag', v: t, t: t, n: fpCount('tag', 't', t) };
      }));
    f.innerHTML = fpChips('Комнат', rooms, fpQ.rooms)
      + fpChips('Дом', houses, fpQ.house)
      + fpChips('Этаж', floors, fpQ.floor)
      + fpChips('Особенности', tags, fpQ.tag)
      + '<div class="fp-frow"><span class="fp-flabel">Сортировка</span><div class="fp-chips">'
      + [{ v: 'p', t: 'По цене' }, { v: 'a', t: 'По площади' }, { v: 'f', t: 'По этажу' }]
        .map(function (o) {
          return '<button class="fp-chip' + (fpQ.sort === o.v ? ' on' : '')
            + '" data-f="sort" data-v="' + o.v + '">' + o.t + '</button>';
        }).join('')
      + '</div></div>';
  }

  function fpList() {
    var out = fpData.flats.filter(function (x) { return fpMatch(x); });
    var k = fpQ.sort;
    out.sort(function (a, b) { return a[k] - b[k] || a.p - b.p; });
    return out;
  }

  function fpCard(x) {
    var h = fpData.houses[x.h - 1];
    return '<button class="fp-card" data-id="' + x.id + '">'
      + '<span class="fp-card-r">' + roomWord(x.r) + '</span>'
      + '<span class="fp-card-a">' + area(x.a) + ' м²</span>'
      + '<span class="fp-card-p">' + num(x.p) + ' ₽</span>'
      + '<span class="fp-card-m">Дом ' + h.m + ' · ' + x.f + ' этаж из ' + x.fmax
      + (h.sections.length > 1 ? ' · ' + x.s + ' секция' : '') + '</span>'
      + (x.t.length ? '<span class="fp-card-t">' + x.t.map(function (t) {
        return '<i>' + t + '</i>';
      }).join('') + '</span>' : '')
      + '</button>';
  }

  function fpRender() {
    fpRenderFilters();
    var rows = fpList();
    var min = rows.length ? Math.min.apply(null, rows.map(function (x) { return x.p; })) : 0;
    fp.querySelector('.fp-count').innerHTML = rows.length
      ? '<b>' + rows.length + '</b> ' + plural(rows.length, ['квартира', 'квартиры', 'квартир'])
        + ' · от ' + num(min) + ' ₽'
      : 'По этим параметрам ничего не нашлось — попробуйте снять фильтры.';
    fp.querySelector('.fp-list').innerHTML = rows.slice(0, fpShown).map(fpCard).join('');
    fp.querySelector('.fp-more').innerHTML = rows.length > fpShown
      ? '<button class="fp-morebtn" data-more="1">Показать ещё '
        + Math.min(FP_PAGE, rows.length - fpShown) + '</button>' : '';
  }

  function plural(n, f) {
    var m = n % 100, k = n % 10;
    if (m > 10 && m < 20) return f[2];
    if (k === 1) return f[0];
    if (k > 1 && k < 5) return f[1];
    return f[2];
  }

  function fpDetail(id) {
    var x = null, i;
    for (i = 0; i < fpData.flats.length; i++) if (fpData.flats[i].id === id) x = fpData.flats[i];
    if (!x) return;
    var h = fpData.houses[x.h - 1];
    var rows = [
      ['Площадь', area(x.a) + ' м²'],
      ['Комнат', x.r],
      ['Этаж', x.f + ' из ' + x.fmax],
      ['Дом', h.m + (h.sections.length > 1 ? ', секция ' + x.s : '')],
      ['Адрес', h.addr || 'Присваивается после ввода'],
      ['Готовность', h.ready],
      ['Балкон', x.b === 'Балкон' ? 'Есть' : (x.b === 'Больше 2' ? 'Два и более' : x.b)],
      ['Санузел', x.bath === 'Более 2' ? 'Два и более' : x.bath],
      ['Отделка', x.fin || 'Без отделки'],
      ['Цена за м²', num(Math.round(x.p / x.a)) + ' ₽']
    ];
    var d = fp.querySelector('.fp-detail');
    d.innerHTML = '<button class="fp-back" data-back="1">← Ко всем квартирам</button>'
      + '<div class="fp-dgrid">'
      + '<figure class="fp-plan"><img loading="lazy" decoding="async" src="images/floor/'
      + x.fp + '.webp" alt="План этажа дома ' + h.m + '">'
      + '<figcaption class="note">'
      + (x.fpf === x.f ? 'План ' + x.f + ' этажа' : 'План типового ' + x.fpf + ' этажа')
      + ' · дом ' + h.m
      + (h.sections.length > 1 ? ', секция ' + x.s : '')
      + '. Ваша квартира на плане — ' + area(x.a) + ' м².</figcaption></figure>'
      + '<div class="fp-dinfo">'
      + '<div class="lbl">' + SPRIG + 'Квартира</div>'
      + '<h4>' + roomWord(x.r) + ' ' + area(x.a) + ' м²</h4>'
      + '<div class="fp-dprice">' + num(x.p) + ' ₽</div>'
      + '<dl class="fp-specs">' + rows.map(function (r) {
        return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>';
      }).join('') + '</dl>'
      + '<button class="cb-submit fp-req" data-callback>'
      + '<span>Забронировать просмотр</span><i class="cb-arrow">→</i></button>'
      + '<p class="note">Менеджер пришлёт поэтажный план этой квартиры и актуальную цену.</p>'
      + '</div></div>';
    d.hidden = false;
    fp.querySelector('.fp-scroll').hidden = true;
    fp.querySelector('.fp-filters').hidden = true;
    d.scrollTop = 0;
  }

  function fpDetailClose() {
    fp.querySelector('.fp-detail').hidden = true;
    fp.querySelector('.fp-scroll').hidden = false;
    fp.querySelector('.fp-filters').hidden = false;
  }

  function fpClick(e) {
    var chip = e.target.closest('.fp-chip');
    if (chip) {
      var k = chip.dataset.f, v = chip.dataset.v;
      fpQ[k] = (k === 'tag' || k === 'sort') ? v : +v;
      fpShown = FP_PAGE;
      fpRender();
      return;
    }
    if (e.target.closest('[data-more]')) { fpShown += FP_PAGE; fpRender(); return; }
    if (e.target.closest('[data-back]')) { fpDetailClose(); return; }
    var card = e.target.closest('.fp-card');
    if (card) fpDetail(+card.dataset.id);
  }

  function fpOpen(tag) {
    if (!fp) fpBuild();
    fpQ = { rooms: 0, house: 0, floor: 0, tag: tag || '', sort: 'p' };
    fpShown = FP_PAGE;
    fp.hidden = false;
    document.body.style.overflow = 'hidden';
    void fp.offsetWidth;
    fp.classList.add('on');
    fpDetailClose();
    if (fpData) { fpRender(); fp.querySelector('.fp-x').focus(); return; }
    fp.querySelector('.fp-count').textContent = 'Загружаем каталог…';
    if (fpLoading) return;
    fpLoading = true;
    fetch('assets/data/flats.json').then(function (r) { return r.json(); }).then(function (j) {
      fpData = j;
      fp.querySelector('.fp-sub').textContent = j.flats.length
        + ' свободных квартир в ' + j.houses.filter(function (h) { return h.free; }).length
        + ' домах. Актуально на ' + j.updated.split('-').reverse().join('.') + '.';
      fpRender();
    })['catch'](function () {
      fp.querySelector('.fp-count').textContent =
        'Не удалось загрузить каталог. Позвоните нам — подберём вручную.';
    });
  }

  function fpClose() {
    fp.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(function () { fp.hidden = true; }, 250);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-flats]');
    if (!b) return;
    e.preventDefault();
    fpOpen(b.getAttribute('data-flats'));
  });

  /* --------------------------------------------- прогулка по окрестностям */
  // Три кадра с высоты. Метки стоят там, где объект реально виден в кадре;
  // расстояния посчитаны по прямой от координат комплекса (54.9276, 20.1418).
  // веточка в плашке и ёлка-указатель — та же графика, что на генплане
  var SPRIG_PIN = '<svg class="walk-sprig" viewBox="0 0 14 18" aria-hidden="true">'
    + '<path d="M7 18V2.4M7 13.6 2 10.6M7 13.6l5-3M7 9.5 2.6 6.8M7 9.5l4.4-2.7'
    + 'M7 5.6 3.6 3.4M7 5.6l3.4-2.2"/></svg>';
  var FIR_PIN = '<svg class="walk-fir" viewBox="0 0 128 224" aria-hidden="true">'
    + '<path d="M13.6 214 L64 154.5 L114.4 214 M23.4 179 L64 119.5 L104.6 179'
    + ' M33.3 144 L64 84.5 L94.7 144 M43.1 109 L64 49.5 L84.9 109 M64 214 L64 194.4"/></svg>';

  var WALK = [
    {
      img: 'images/g12-lg.webp',
      alt: 'Вид с высоты: комплекс, Светлогорск и Балтийское море на горизонте',
      cap: 'С верхних этажей видно Светлогорск и полосу Балтики — между ними только сосновый бор.',
      pins: [
        { x: 24, y: 6, dir: 'down', t: 'Балтийское море', d: '2,0 км' },
        { x: 42, y: 11, dir: 'down', t: 'Центр Светлогорска', d: '1,8 км' },
        { x: 52, y: 44, dir: 'up', t: 'ЖК «Лесная сказка»', d: '' }
      ]
    },
    {
      img: 'images/g08-lg.webp',
      alt: 'Тихое озеро в сосновом лесу рядом с комплексом, съёмка с высоты',
      cap: 'Тихое озеро — ближайшая к домам вода: лес подходит прямо к берегу.',
      pins: [
        { x: 52, y: 31, dir: 'down', t: 'Тихое озеро', d: '1,4 км' },
        { x: 20, y: 64, dir: 'up', t: 'Сосновый бор', d: 'вокруг домов' }
      ]
    },
    {
      img: 'images/g10-lg.webp',
      alt: 'Пешеходная дорожка через сосновый лес рядом с комплексом',
      cap: 'Пешеходные дорожки проложены прямо через бор — от домов вглубь леса.',
      pins: [
        { x: 40, y: 60, dir: 'up', t: 'Дорожки через лес', d: '' }
      ]
    }
  ];

  function walkPaint(i) {
    var root = document.querySelector('.walk');
    if (!root) return;
    var d = WALK[i];
    var img = root.querySelector('.walk-img');
    var pins = root.querySelector('.walk-pins');
    var cap = root.querySelector('.walk-cap');

    root.querySelectorAll('.walk-tab').forEach(function (b) {
      b.classList.toggle('on', +b.dataset.walk === i);
      b.setAttribute('aria-selected', +b.dataset.walk === i ? 'true' : 'false');
    });

    // кадр гасим, меняем и проявляем — метки появляются вместе с ним
    root.classList.add('swap');
    pins.innerHTML = '';
    setTimeout(function () {
      img.src = d.img;
      img.alt = d.alt;
      cap.textContent = d.cap;
      var lg = root.querySelector('.walk-legend');
      if (lg) lg.innerHTML = d.pins.map(function (p) {
        return '<div><span>' + SPRIG_PIN + p.t + '</span><span>'
          + (p.d || 'в кадре') + '</span></div>';
      }).join('');
      pins.innerHTML = d.pins.map(function (p) {
        return '<span class="walk-pin ' + (p.dir === 'down' ? 'dn' : 'up')
          + '" style="left:' + p.x + '%;top:' + p.y + '%">'
          + '<span class="walk-box">' + SPRIG_PIN + '<b>' + p.t + '</b>'
          + (p.d ? '<i>' + p.d + '</i>' : '') + '</span>'
          + FIR_PIN + '</span>';
      }).join('');
      root.classList.remove('swap');
    }, 220);
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('.walk-tab');
    if (b) walkPaint(+b.dataset.walk);
  });

  if (document.querySelector('.walk')) {
    walkPaint(0);
    // подгружаем остальные кадры заранее — переключение вкладок без провала
    setTimeout(function () {
      WALK.slice(1).forEach(function (d) { new Image().src = d.img; });
    }, 1500);
  }

  /* ------------------------------------------------------------ прелоадер */
  // Показываем минимум 1.4 с (чтобы ёлка успела прорисоваться), максимум 2.8 с —
  // дальше уходим, даже если картинки ещё грузятся: контент важнее заставки.
  var pre = document.getElementById('pre');
  if (pre) {
    document.documentElement.classList.add('is-loading');
    var preStart = performance.now(), preGone = false;
    var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var MIN = reduced ? 300 : 1400, MAX = 2800;
    function preHide() {
      if (preGone) return;
      preGone = true;
      pre.classList.add('out');
      document.documentElement.classList.remove('is-loading');
      setTimeout(revealVisible, 220);            // блоки проявляются вслед за шторкой
      setTimeout(function () {
        pre.remove();
        setupReveal(); revealVisible(); checkCounters(); kickVideo();
      }, reduced ? 320 : 1000);
    }
    function preTry() {
      var left = MIN - (performance.now() - preStart);
      if (left > 0) setTimeout(preHide, left); else preHide();
    }
    window.addEventListener('load', preTry);
    setTimeout(preHide, MAX);
  }

  /* ------------------------------------------------------------ старт */
  render();
  kickVideo();
  [300, 1200].forEach(function (t) { setTimeout(kickVideo, t); });
  [120, 700, 1600, 3200].forEach(function (t) { setTimeout(setupReveal, t); });
})();
