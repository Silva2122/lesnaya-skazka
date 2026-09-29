/* ЖК «Лесная сказка» — интерактив.
   Портирован с dc-рантайма (React) на чистый JS: те же состояния и те же цвета. */
(function () {
  'use strict';

  var D = '#223020', L = '#F7EFE4', W = '#EEE4D3';

  var state = { view: 'genplan', house: 1, gallery: 'photo', chron: 'sep', sent: false };

  // таблетки-табы: светлые секции красятся bg/fg, тёмные — bgDark/fgDark
  var DARK_TABS = { view: true };
  var PIN_IDLE = { photo: 'rgba(34,48,32,.6)', house: 'rgba(34,48,32,.65)' };

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
          bg: st === 'free' ? L : st === 'hold' ? 'rgba(238,228,211,.45)' : 'rgba(238,228,211,.12)',
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
    var cb = e.target.closest('[data-callback]');
    if (cb) {
      docOpen('tpl-callback', true);
      // контекст кнопки: у каждого блока свой заголовок и мотивация в форме
      var h = doc.querySelector('.cb-head h3'), p = doc.querySelector('.cb-head .note');
      if (h) h.textContent = cb.dataset.ctaTitle || 'Обратный звонок';
      if (p) p.textContent = cb.dataset.ctaNote || 'Наш менеджер свяжется с вами в ближайшее время.';
    }
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

  /* ------------------------------------------------------------ акции: белка */
  // Белка в ролике обходит взглядом периметр по часовой: влево → вверх → вправо
  // → вниз → влево, а в начале и в конце смотрит в камеру. Ролик нарезан на все
  // 240 кадров (images/promo/NNN.webp), для каждого размечено, куда она смотрит
  // (yaw: −1 влево … +1 вправо, pitch: −1 вниз … +1 вверх). Курсор задаёт только
  // НАПРАВЛЕНИЕ от глаз белки — дальность не важна: на любом расстоянии в одну
  // сторону она смотрит одинаково, в крайнее положение. Направление — это угол,
  // а угол по таймлайну растёт монотонно, поэтому вслед за курсором голова едет
  // по кадрам без объездов. Единственный шов — «влево» (там кольцо угла
  // замыкается между кадрами ~36 и ~188): его проходим коротким перекрытием.
  function promoSquirrel() {
    var stage = document.querySelector('[data-promo]');
    if (!stage) return;
    var cv = stage.querySelector('.promo-look');
    var ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    if (!ctx) return;
    var media = stage.querySelector('.promo-media');
    var mq = window.matchMedia;
    var reduced = mq && mq('(prefers-reduced-motion: reduce)').matches;
    var coarse = mq && mq('(pointer: coarse)').matches;

    var N = 240;
    var HOME = 216;                         // анфас — стартовый кадр
    var EYE_X = 0.58, EYE_Y = 0.32;         // где на кадре глаза белки
    var DEAD = 28;                          // ближе этого к глазам направление не читаем

    var KEYS = [
      [0,.25,-.05],[4,.15,0],[8,0,0],[12,-.05,0],[14,-.1,0],[16,-.2,0],[18,-.3,0],[20,-.45,-.05],
      [22,-.6,-.1],[24,-.7,-.1],[26,-.75,-.08],[28,-.8,-.05],[30,-.85,0],[34,-.9,.05],[36,-.9,.1],
      [38,-.9,.15],[40,-.9,.2],[42,-.85,.3],[44,-.75,.45],[46,-.6,.6],[48,-.45,.7],[50,-.35,.8],
      [52,-.25,.88],[54,-.15,.95],[56,-.05,1],[60,.05,1],[64,.1,1],[68,.2,.95],[72,.2,.95],
      [76,.1,.9],[80,-.1,.9],[84,-.15,.85],[86,-.1,.85],[88,.25,.75],[90,.55,.6],[92,.8,.45],
      [94,.9,.35],[96,1,.3],[98,1,.2],[100,1,.15],[102,1,.1],[104,1,.05],[106,1,0],[108,1,0],
      [110,1,-.05],[112,.95,-.05],[114,.95,-.08],[116,.9,-.1],[118,.85,-.1],[120,.8,-.12],
      [122,.75,-.15],[124,.7,-.18],[126,.65,-.2],[128,.55,-.22],[130,.45,-.25],[132,.4,-.28],
      [134,.3,-.3],[136,.25,-.32],[138,.2,-.35],[140,.12,-.38],[142,.08,-.4],[144,.03,-.4],
      [146,-.03,-.4],[152,-.15,-.4],[156,-.3,-.35],[160,-.45,-.35],[164,-.55,-.35],[168,-.65,-.3],
      [172,-.75,-.25],[176,-.8,-.2],[180,-.85,-.1],[184,-.85,-.05],[188,-.85,0],[190,-.85,-.02],
      [192,-.8,0],[194,-.75,0],[196,-.65,0],[198,-.55,0],[200,-.45,0],[202,-.3,0],[204,-.18,0],
      [206,-.08,0],[208,0,0],[220,0,0],[224,.05,.05],[236,.05,.05],[239,.05,0]
    ];
    var YAW = [], PITCH = [];
    for (var k = 0; k < KEYS.length - 1; k++) {
      var a = KEYS[k], b = KEYS[k + 1];
      for (var f = a[0]; f < b[0]; f++) {
        var t = (f - a[0]) / (b[0] - a[0]);
        YAW[f] = a[1] + (b[1] - a[1]) * t;
        PITCH[f] = a[2] + (b[2] - a[2]) * t;
      }
    }
    YAW[N - 1] = KEYS[KEYS.length - 1][1]; PITCH[N - 1] = KEYS[KEYS.length - 1][2];
    // периметр — дуга кадров 32…190: угол взгляда по ней растёт монотонно на все
    // 360°. Концы дуги (32 и 190) — оба «влево», подобраны так, чтобы на шве
    // совпадало направление взгляда, а перекрытие прятало смещение головы
    var A0 = 32, A1 = 190, SEAM = 60;
    // Шов проходим не перекрытием двух разных поз, а через камеру: с обеих
    // сторон шва ролик возвращается в анфас (32→8 и 190→232), а кадры 8 и 232 —
    // почти одинаковые анфасы, их подмена не видна. Получается короткий взгляд
    // в камеру — настоящее движение, а не склейка.
    var HUB_LO = 8, HUB_HI = 232, MID = 110;
    var ARC = [], ANG = [];
    for (var i = A0; i <= A1; i++) { ARC.push(i); ANG[i] = Math.atan2(PITCH[i], YAW[i]); }
    var via = null;                         // план перехода через камеру: {hub, other, side}

    var imgs = [], have = 0;
    var mx = null, my = null;
    var sx = 0, sy = 0;                     // сглаженное направление на курсор (вектор)
    var cur = HOME, goal = HOME, drawn = -1, lastT = 0;
    var px = 0, py = 0;                     // лёгкий доворот кадра вслед за курсором
    var armed = false, live = false, raf = 0;
    var fade = null;                        // перекрытие: {a, b, t0, dur}

    function near(pad) {
      var r = stage.getBoundingClientRect();
      if (!r.width) return false;
      var vh = window.innerHeight || 800;
      return r.bottom > -pad && r.top < vh + pad;
    }

    // кадры тянем только когда блок близко к экрану (7,4 МБ): сначала анфас,
    // потом чётные по удалённости от него (белка оживает рано и уже крутится),
    // нечётные докачиваются следом и сглаживают ход
    function arm() {
      if (armed || reduced || !near(1200)) return;
      armed = true;
      var order = [];
      for (var i = 0; i < N; i++) order.push(i);
      order.sort(function (p, q) {
        if (p % 2 !== q % 2) return p % 2 - q % 2;
        return Math.abs(p - HOME) - Math.abs(q - HOME);
      });
      var next = 0, busy = 0;
      function pump() {
        while (busy < 4 && next < order.length) {
          (function (slot) {
            busy++;
            var im = new Image();
            im.decoding = 'async';
            var done = function (ok) {
              busy--;
              if (ok) {
                imgs[slot] = im; have++;
                if (have === 1) start(); else if (live && slot === drawn) drawn = -1;
              }
              pump();
            };
            im.onload = function () {
              if (im.decode) im.decode().then(function () { done(true); }, function () { done(true); });
              else done(true);
            };
            im.onerror = function () { done(false); };
            im.src = 'images/promo/' + ('00' + slot).slice(-3) + '.webp';
          })(order[next++]);
        }
      }
      pump();
    }

    function slotFor(frame) {
      var i = Math.round(frame);
      if (i < 0) i = 0; else if (i > N - 1) i = N - 1;
      if (imgs[i]) return i;
      for (var d = 1; d < N; d++) {
        if (i + d < N && imgs[i + d]) return i + d;
        if (i - d >= 0 && imgs[i - d]) return i - d;
      }
      return -1;
    }

    function paint(slot, force) {
      if (slot < 0 || (slot === drawn && !force)) return;
      drawn = slot;
      try { ctx.globalAlpha = 1; ctx.drawImage(imgs[slot], 0, 0, cv.width, cv.height); } catch (e) {}
    }

    function start() {
      paint(slotFor(HOME));
      stage.classList.add('is-live');
      wake();
    }

    function angDiff(a, b) {
      var d = a - b;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      return Math.abs(d);
    }

    // кадр периметра, чей угол взгляда ближе всего к углу на курсор;
    // цель не меняем ради пары градусов — иначе дрожит между соседями,
    // а через шов (другой конец дуги) уходим только при явном выигрыше —
    // иначе у «влево» белку мотало бы через шов туда-сюда
    function pick(theta) {
      var best = goal, bd = 1e9, cost = 1e9;
      for (var k = 0; k < ARC.length; k++) {
        var i = ARC[k];
        if (!imgs[i]) continue;
        var d = angDiff(ANG[i], theta) + Math.abs(i - cur) * 0.0004;   // чуть предпочитаем соседей
        if (i === goal) cost = d;
        if (d < bd) { bd = d; best = i; }
      }
      var margin = Math.abs(best - cur) > SEAM ? 0.14 : 0.035;
      return bd < cost - margin ? best : goal;
    }

    function crossfade(now) {
      var t = (now - fade.t0) / fade.dur;
      if (t >= 1) { paint(fade.b, true); fade = null; return; }
      if (!imgs[fade.a] || !imgs[fade.b]) { fade = null; return; }
      try {
        ctx.globalAlpha = 1; ctx.drawImage(imgs[fade.a], 0, 0, cv.width, cv.height);
        ctx.globalAlpha = t * t * (3 - 2 * t); ctx.drawImage(imgs[fade.b], 0, 0, cv.width, cv.height);
        ctx.globalAlpha = 1;
      } catch (e) {}
      drawn = -1;
    }

    function frame(now) {
      raf = 0;
      if (!near(300)) { live = false; return; }
      var dt = lastT ? Math.min(3, (now - lastT) / 16.7) : 1;   // в «тиках» по 60 Гц
      lastT = now;
      var ux, uy, ok = true;
      if (mx === null || coarse) {
        // курсора ещё не было (или тач): белка неспешно оглядывается сама
        var t = now / 1000 * 0.35;
        ux = Math.cos(t); uy = Math.sin(t) * 0.7;
      } else {
        // только направление от глаз белки на курсор; дальность не важна
        var r = stage.getBoundingClientRect();
        var ex = r.left + r.width * EYE_X, ey = r.top + r.height * EYE_Y;
        var dx = mx - ex, dy = ey - my;                       // вверх — положительно
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < DEAD) ok = false; else { ux = dx / len; uy = dy / len; }
      }
      if (ok) {
        sx += (ux - sx) * Math.min(1, 0.3 * dt);
        sy += (uy - sy) * Math.min(1, 0.3 * dt);
      }

      if (fade) {
        crossfade(now);
      } else {
        if (sx * sx + sy * sy > 0.01) goal = pick(Math.atan2(sy, sx));
        var ci = Math.round(cur);
        if (via && (goal < MID) === (via.side < MID)) via = null;   // курсор вернулся — отбой
        if (!via && Math.abs(goal - cur) > SEAM && ANG[ci] !== undefined
            && angDiff(ANG[ci], ANG[goal]) < Math.PI / 2) {
          // цель по углу рядом, а по дуге на другом конце — это шов
          via = ci < MID ? { hub: HUB_LO, other: HUB_HI, side: ci } : { hub: HUB_HI, other: HUB_LO, side: ci };
        }
        if (via && Math.abs(cur - via.hub) < 0.5) {
          fade = { a: slotFor(via.hub), b: slotFor(via.other), t0: now, dur: 140 };
          cur = via.other; via = null;
        } else {
          var target = via ? via.hub : goal, cap = via ? 3.5 : 4;
          var d = target - cur;
          var speed = Math.abs(d) * 0.2;
          if (speed > cap) speed = cap; else if (speed < 0.6) speed = Math.min(0.6, Math.abs(d));
          cur += (d < 0 ? -speed : speed) * dt;
          if (Math.abs(target - cur) < 0.5 || (d < 0) !== (target - cur < 0)) cur = target;
          paint(slotFor(cur));
        }
      }
      if (media) {
        px += (sx * 6 - px) * Math.min(1, 0.08 * dt);
        py += (-sy * 6 - py) * Math.min(1, 0.08 * dt);
        media.style.transform = 'scale(1.035) translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0)';
      }
      if (live) raf = requestAnimationFrame(frame);
    }

    function wake() {
      arm();
      if (!have || live || !near(300)) return;
      live = true; lastT = 0;
      if (!raf) raf = requestAnimationFrame(frame);
    }

    document.addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; wake(); }, { passive: true });
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    arm();
    setTimeout(arm, 1200);
  }
  promoSquirrel();

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
