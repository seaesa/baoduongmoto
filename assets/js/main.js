/* =========================================================
   main.js — E-Moto clone (vanilla JS, no dependencies except Leaflet)
   ========================================================= */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reflow = function (el) { return el.offsetHeight; };
  var scrollbarWidth = function () { return Math.abs(window.innerWidth - document.documentElement.clientWidth); };
  // assets/ folder URL, worked out from this script's own URL so it is right on every page depth
  var ASSETS = (document.currentScript ? document.currentScript.src : '').replace(/js\/main\.js(?:[?#].*)?$/, '');

  /* ---------------------------------------------------------
     Body scroll lock (shared by offcanvas + modal)
     --------------------------------------------------------- */
  var lockCount = 0;
  function lockScroll() {
    if (lockCount++ > 0) return;
    var w = scrollbarWidth();
    document.body.style.overflow = 'hidden';
    if (w > 0) {
      document.body.style.paddingRight = w + 'px';
      $$('.fixed-top').forEach(function (el) { el.style.paddingRight = w + 'px'; });
    }
  }
  function unlockScroll() {
    if (--lockCount > 0) return;
    lockCount = 0;
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    $$('.fixed-top').forEach(function (el) { el.style.paddingRight = ''; });
  }

  function makeBackdrop(cls, onClick) {
    var b = document.createElement('div');
    b.className = cls + ' fade';
    document.body.appendChild(b);
    reflow(b);
    b.classList.add('show');
    if (onClick) b.addEventListener('mousedown', onClick);
    return b;
  }
  function removeBackdrop(b) {
    if (!b) return;
    b.classList.remove('show');
    setTimeout(function () { b.remove(); }, 150);
  }

  /* ---------------------------------------------------------
     Offcanvas (side menu)
     --------------------------------------------------------- */
  function Offcanvas(el) {
    this.el = el;
    this.isShown = false;
    this.backdrop = null;
    var self = this;
    $$('[data-dismiss="offcanvas"]', el).forEach(function (d) {
      d.addEventListener('click', function () { self.hide(); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self.hide(); } });
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') self.hide(); });
  }
  Offcanvas.prototype.show = function (trigger) {
    if (this.isShown) return;
    var self = this;
    this.isShown = true;
    this.trigger = trigger;
    this.el.style.visibility = 'visible';
    this.backdrop = makeBackdrop('offcanvas-backdrop', function () { self.hide(); });
    lockScroll();
    this.el.removeAttribute('aria-hidden');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('role', 'dialog');
    reflow(this.el);
    this.el.classList.add('show');
    setTimeout(function () { self.el.focus(); }, 300);
  };
  Offcanvas.prototype.hide = function () {
    if (!this.isShown) return;
    var self = this;
    this.isShown = false;
    this.el.blur();
    this.el.classList.remove('show');
    removeBackdrop(this.backdrop);
    this.backdrop = null;
    setTimeout(function () {
      if (self.isShown) return;
      self.el.style.visibility = 'hidden';
      self.el.setAttribute('aria-hidden', 'true');
      self.el.removeAttribute('aria-modal');
      self.el.removeAttribute('role');
      unlockScroll();
    }, 300);
  };
  Offcanvas.prototype.toggle = function (t) { this.isShown ? this.hide() : this.show(t); };

  /* ---------------------------------------------------------
     Modal
     --------------------------------------------------------- */
  function Modal(el) {
    this.el = el;
    this.dialog = $('.modal-dialog', el);
    this.isShown = false;
    this.isTransitioning = false;
    var self = this;
    $$('[data-dismiss="modal"]', el).forEach(function (d) {
      d.addEventListener('click', function () { self.hide(); });
    });
    // click outside dialog (on the .modal layer) closes it
    var downOnBackdrop = false;
    el.addEventListener('mousedown', function (e) { downOnBackdrop = e.target === el; });
    el.addEventListener('click', function (e) {
      if (e.target === el && downOnBackdrop) self.hide();
    });
    el.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.preventDefault(); self.hide(); } });
  }
  Modal.prototype.show = function () {
    if (this.isShown || this.isTransitioning) return;
    var self = this;
    this.isShown = true;
    this.isTransitioning = true;
    lockScroll();
    this.backdrop = makeBackdrop('modal-backdrop');
    this.el.style.display = 'block';
    this.el.removeAttribute('aria-hidden');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('role', 'dialog');
    this.el.scrollTop = 0;
    reflow(this.el);
    this.el.classList.add('show');
    setTimeout(function () { self.isTransitioning = false; self.el.focus(); }, 300);
  };
  Modal.prototype.hide = function () {
    if (!this.isShown || this.isTransitioning) return;
    var self = this;
    this.isShown = false;
    this.isTransitioning = true;
    this.el.classList.remove('show');
    setTimeout(function () {
      self.el.style.display = 'none';
      self.el.setAttribute('aria-hidden', 'true');
      self.el.removeAttribute('aria-modal');
      self.el.removeAttribute('role');
      removeBackdrop(self.backdrop);
      setTimeout(function () { unlockScroll(); self.isTransitioning = false; }, 150);
    }, 300);
  };

  var offcanvas = new Offcanvas($('#offcanvasMenu'));
  var modalEl = $('#ModalReg');
  var modal = modalEl ? new Modal(modalEl) : null; // inner pages (articles, news, store) have no modal

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-toggle]');
    if (!t) return;
    var kind = t.getAttribute('data-toggle');
    if (kind === 'offcanvas') { e.preventDefault(); offcanvas.toggle(t); }
    else if (kind === 'modal' && modal) { e.preventDefault(); modal.show(); }
  });

  // The consultation popup opens by itself 10s after load — home page only (same as the original)
  if (modal && document.body.getAttribute('data-page') === 'home') {
    window.addEventListener('load', function () {
      setTimeout(function () { modal.show(); }, 10000);
    });
  }

  /* ---------------------------------------------------------
     Form validation (Bootstrap "needs-validation" pattern)
     --------------------------------------------------------- */
  $$('.needs-validation').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      if (!form.checkValidity()) {
        e.preventDefault();
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
      }
      // Static clone: there is no backend, so a valid form is not sent anywhere — just reset it
      e.preventDefault();
      form.reset();
      form.classList.remove('was-validated');
    }, false);
  });

  /* ---------------------------------------------------------
     Datepicker (look & behaviour of bootstrap-datepicker 1.9, vi locale)
     --------------------------------------------------------- */
  var VI = {
    daysMin: ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'],
    months: ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'],
    monthsShort: ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12']
  };
  function d0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmt(d) { return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear(); }
  function parse(str) {
    var m = /^\s*(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\s*$/.exec(str || '');
    if (!m) return null;
    var y = +m[3]; if (y < 100) y += 2000;
    var d = new Date(y, +m[2] - 1, +m[1]);
    if (d.getMonth() !== +m[2] - 1) d = new Date(y, +m[2] - 1 + 1, 0); // clamp overflow like the plugin
    return d;
  }

  function DatePicker(input, opts) {
    this.input = input;
    this.startDate = opts.startDate ? d0(opts.startDate) : null;
    this.date = null;
    this.viewDate = d0(new Date());
    this.focusDate = null;
    this.view = 0; // 0 days, 1 months, 2 years, 3 decades, 4 centuries
    this.shown = false;
    this.onChange = opts.onChange || function () {};
    this.todayBtn = !!opts.todayBtn;
    this.autoclose = !!opts.autoclose;
    this.build();
    this.bind();
  }
  DatePicker.prototype.build = function () {
    var p = document.createElement('div');
    p.className = 'datepicker datepicker-dropdown dropdown-menu';
    this.picker = p;
    var self = this;
    p.addEventListener('mousedown', function (e) { e.preventDefault(); }); // keep input focus
    p.addEventListener('click', function (e) { e.stopPropagation(); self.click(e); });
  };
  DatePicker.prototype.bind = function () {
    var self = this, inp = this.input;
    inp.addEventListener('focus', function () { self.show(); });
    inp.addEventListener('click', function () { self.show(); });
    inp.addEventListener('keyup', function (e) {
      if ([13, 27, 37, 38, 39, 40, 9].indexOf(e.keyCode) !== -1) return;
      var d = parse(inp.value);
      if (d && self.valid(d)) { self.date = d0(d); self.viewDate = d0(d); self.focusDate = null; self.fill(); }
    });
    inp.addEventListener('keydown', function (e) { self.keydown(e); });
    inp.addEventListener('blur', function () {
      // force-parse on blur (plugin default forceParse:true)
      if (inp.value === '') { if (self.date) { self.date = null; self.onChange(null); } return; }
      var d = parse(inp.value);
      if (d && self.valid(d)) {
        var changed = !self.date || +self.date !== +d0(d);
        self.date = d0(d); inp.value = fmt(self.date);
        if (changed) self.onChange(self.date);
      } else { inp.value = self.date ? fmt(self.date) : ''; }
    });
    document.addEventListener('mousedown', function (e) {
      if (!self.shown) return;
      if (e.target === inp || self.picker.contains(e.target)) return;
      self.hide();
    });
    window.addEventListener('resize', function () { if (self.shown) self.place(); });
  };
  DatePicker.prototype.valid = function (d) { return !this.startDate || d0(d) >= this.startDate; };
  DatePicker.prototype.setStartDate = function (d) {
    this.startDate = d ? d0(d) : null;
    if (this.date && !this.valid(this.date)) { this.date = null; }
    this.fill();
  };
  DatePicker.prototype.clear = function () {
    this.date = null; this.input.value = ''; this.fill();
  };
  DatePicker.prototype.show = function () {
    if (this.shown) return;
    this.shown = true;
    this.view = 0;
    this.viewDate = d0(this.date || (this.startDate && this.startDate > new Date() ? this.startDate : new Date()));
    this.focusDate = null;
    document.body.appendChild(this.picker);
    this.fill();
    this.place();
  };
  DatePicker.prototype.hide = function () {
    if (!this.shown) return;
    this.shown = false;
    this.focusDate = null;
    this.picker.remove();
  };
  DatePicker.prototype.place = function () {
    var p = this.picker, r = this.input.getBoundingClientRect();
    var sx = window.pageXOffset, sy = window.pageYOffset;
    var calW = p.offsetWidth, calH = p.offsetHeight;
    var winW = document.documentElement.clientWidth;
    var left = r.left + sx, top = r.top + sy;
    p.classList.remove('datepicker-orient-top', 'datepicker-orient-bottom', 'datepicker-orient-right', 'datepicker-orient-left');
    // horizontal: auto
    if (r.left < 0) { p.classList.add('datepicker-orient-left'); left = sx; }
    else if (r.left + calW > winW) { p.classList.add('datepicker-orient-right'); left = r.right + sx - calW; }
    else p.classList.add('datepicker-orient-left');
    // vertical: auto — prefers above the input when there is room
    if (r.top - calH < 0) { p.classList.add('datepicker-orient-bottom'); top += r.height; }
    else { p.classList.add('datepicker-orient-top'); top -= calH + 4; }
    p.style.top = top + 'px';
    p.style.left = left + 'px';
    // z-index = highest z-index among the input's ancestors + 10 (zIndexOffset), like bootstrap-datepicker;
    // with no positioned ancestor it falls back to the CSS value (10)
    var zs = [];
    for (var el = this.input.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      var z = getComputedStyle(el).zIndex;
      if (z !== 'auto' && Number(z) !== 0) zs.push(Number(z));
    }
    p.style.zIndex = zs.length ? String(Math.max.apply(Math, zs) + 10) : '';
  };
  DatePicker.prototype.head = function (title, prevOff, nextOff, cols) {
    return '<thead><tr>' +
      '<th class="prev' + (prevOff ? ' disabled' : '') + '">&laquo;</th>' +
      '<th colspan="' + cols + '" class="datepicker-switch">' + title + '</th>' +
      '<th class="next' + (nextOff ? ' disabled' : '') + '">&raquo;</th></tr>';
  };
  DatePicker.prototype.fill = function () {
    if (!this.shown) return;
    var v = this.viewDate, y = v.getFullYear(), m = v.getMonth(), s = this.startDate;
    var sel = this.date, html = '';
    if (this.view === 0) {
      var prevOff = s && (y < s.getFullYear() || (y === s.getFullYear() && m <= s.getMonth()));
      html += '<div class="datepicker-days"><table class="table-condensed">' + this.head(VI.months[m] + ' ' + y, prevOff, false, 5);
      html += '<tr>' + VI.daysMin.map(function (d) { return '<th class="dow">' + d + '</th>'; }).join('') + '</tr></thead><tbody>';
      var first = new Date(y, m, 1), start = new Date(y, m, 1 - first.getDay());
      for (var i = 0; i < 42; i++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        if (i % 7 === 0) html += '<tr>';
        var cls = ['day'];
        if (d.getFullYear() < y || (d.getFullYear() === y && d.getMonth() < m)) cls.push('old');
        else if (d.getFullYear() > y || (d.getFullYear() === y && d.getMonth() > m)) cls.push('new');
        if (this.focusDate && +d === +this.focusDate) cls.push('focused');
        if (!this.valid(d)) cls.push('disabled');
        if (sel && +d === +sel) cls.push('active');
        html += '<td class="' + cls.join(' ') + '" data-date="' + (+d) + '">' + d.getDate() + '</td>';
        if (i % 7 === 6) html += '</tr>';
      }
      html += '</tbody></table></div>';
    } else if (this.view === 1) {
      var pOff = s && y <= s.getFullYear();
      html += '<div class="datepicker-months"><table class="table-condensed">' + this.head(String(y), pOff, false, 5) + '</thead><tbody><tr><td colspan="7">';
      for (var k = 0; k < 12; k++) {
        var c = ['month'];
        if (s && (y < s.getFullYear() || (y === s.getFullYear() && k < s.getMonth()))) c.push('disabled');
        if (sel && sel.getFullYear() === y && sel.getMonth() === k) c.push('active');
        if (this.focusDate && this.focusDate.getFullYear() === y && this.focusDate.getMonth() === k) c.push('focused');
        html += '<span class="' + c.join(' ') + '" data-v="' + k + '">' + VI.monthsShort[k] + '</span>';
      }
      html += '</td></tr></tbody></table></div>';
    } else {
      // years (step 1), decades (step 10), centuries (step 100)
      var step = Math.pow(10, this.view - 2), span = step * 10;
      var base = Math.floor(y / span) * span;
      var cls2 = ['', '', 'year', 'decade', 'century'][this.view];
      var name = ['', '', 'datepicker-years', 'datepicker-decades', 'datepicker-centuries'][this.view];
      var sy2 = s ? Math.floor(s.getFullYear() / step) * step : null;
      html += '<div class="' + name + '"><table class="table-condensed">' + this.head(base + '-' + (base + span - step), s && base <= sy2, false, 5) + '</thead><tbody><tr><td colspan="7">';
      for (var j = -1; j < 11; j++) {
        var val = base + j * step, cc = [cls2];
        if (j === -1) cc.push('old'); else if (j === 10) cc.push('new');
        if (sy2 !== null && val < sy2) cc.push('disabled');
        if (sel && Math.floor(sel.getFullYear() / step) * step === val) cc.push('active');
        html += '<span class="' + cc.join(' ') + '" data-v="' + val + '">' + val + '</span>';
      }
      html += '</td></tr></tbody></table></div>';
    }
    if (this.todayBtn) {
      html = html.split('</tbody></table>').join('</tbody><tfoot><tr><th colspan="7" class="today" style="display: table-cell;">H\u00f4m nay' +
        '</th></tr><tr><th colspan="7" class="clear" style="display: none;">X\u00f3a</th></tr></tfoot></table>');
    }
    this.picker.innerHTML = html;
  };
  DatePicker.prototype.click = function (e) {
    var t = e.target, v = this.viewDate;
    if (t.classList.contains('disabled')) return;
    if (t.tagName === 'TH' && t.classList.contains('today')) {
      // todayBtn:true -> only moves the view to today's month (does not select)
      var now = new Date();
      this.view = 0; this.viewDate = new Date(now.getFullYear(), now.getMonth(), 1);
      this.fill(); this.place();
      return;
    }
    if (t.classList.contains('datepicker-switch')) {
      if (this.view < 4) { this.view++; this.fill(); this.place(); }
      return;
    }
    if (t.classList.contains('prev') || t.classList.contains('next')) {
      var dir = t.classList.contains('prev') ? -1 : 1;
      if (this.view === 0) this.viewDate = new Date(v.getFullYear(), v.getMonth() + dir, 1);
      else if (this.view === 1) this.viewDate = new Date(v.getFullYear() + dir, v.getMonth(), 1);
      else this.viewDate = new Date(v.getFullYear() + dir * Math.pow(10, this.view - 1), v.getMonth(), 1);
      this.fill(); this.place();
      return;
    }
    if (t.tagName === 'TD' && t.classList.contains('day')) {
      this.select(new Date(+t.getAttribute('data-date')));
      return;
    }
    if (t.tagName === 'SPAN' && t.hasAttribute('data-v')) {
      var n = +t.getAttribute('data-v');
      if (this.view === 1) this.viewDate = new Date(v.getFullYear(), n, 1);
      else this.viewDate = new Date(n, v.getMonth(), 1);
      this.view--; this.fill(); this.place();
    }
  };
  DatePicker.prototype.select = function (d) {
    d = d0(d);
    if (!this.valid(d)) return;
    this.date = d;
    this.viewDate = d0(d);
    this.focusDate = null;
    this.input.value = fmt(d);
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    this.fill(); this.place();
    this.onChange(d);
    if (this.autoclose) this.hide();
  };
  DatePicker.prototype.keydown = function (e) {
    if (!this.shown) { if (e.key === 'ArrowDown' || e.key === 'Escape') this.show(); return; }
    var f;
    switch (e.key) {
      case 'Escape': this.hide(); e.preventDefault(); return;
      case 'Tab': this.hide(); return;
      case 'Enter':
        if (this.focusDate) { e.preventDefault(); this.select(this.focusDate); }
        else this.hide();
        return;
      case 'ArrowLeft': case 'ArrowRight': case 'ArrowUp': case 'ArrowDown':
        if (this.view !== 0) return;
        e.preventDefault();
        f = this.focusDate || this.date || d0(new Date());
        var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
        f = new Date(f.getFullYear(), f.getMonth(), f.getDate() + step);
        if (!this.valid(f)) return;
        this.focusDate = f;
        this.viewDate = new Date(f.getFullYear(), f.getMonth(), 1);
        this.fill(); this.place();
    }
  };

  // Only the hero form gets pickers — on the original, the modal's date inputs are plain text
  var heroFrom = $('#validationCustomFrom'), heroTo = $('#validationCustomToday');
  if (heroFrom && heroTo) {
    var dpTo = new DatePicker(heroTo, { startDate: new Date() });
    // product pages: the booking modal's "from" field has todayBtn + autoclose (as on the original)
    var isProduct = document.body.getAttribute('data-page') === 'product';
    new DatePicker(heroFrom, {
      startDate: new Date(), todayBtn: isProduct, autoclose: isProduct,
      onChange: function (d) { dpTo.setStartDate(d || new Date()); dpTo.clear(); }
    });
  }

  /* ---------------------------------------------------------
     Product image slider (Bootstrap 5 "carousel slide" behaviour:
     interval 5s, pause on hover, .6s slide, indicators, swipe 40px)
     --------------------------------------------------------- */
  function Slider(root) {
    this.root = root;
    this.items = $$('.carousel-item', root);
    this.inds = $$('.carousel-indicators [data-bs-target]', root);
    this.interval = 5000;
    this.sliding = false;
    this.paused = false;
    this.timer = null;
    var self = this;
    this.inds.forEach(function (li, i) {
      li.addEventListener('click', function () { self.to(i); });
    });
    root.addEventListener('mouseenter', function () { self.pause(); });
    root.addEventListener('mouseleave', function () { self.cycle(); });
    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) <= 40) return;
      if (dx > 0) self.slide('prev'); else self.slide('next');
      // Bootstrap: after a touch, restart the timer 500ms + interval later
      self.pause();
      clearTimeout(self.touchT);
      self.touchT = setTimeout(function () { self.cycle(); }, 500 + self.interval);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) self.cycle(); });
    this.cycle();
  }
  Slider.prototype.index = function () {
    return this.items.findIndex(function (el) { return el.classList.contains('active'); });
  };
  Slider.prototype.cycle = function () {
    var self = this;
    this.paused = false;
    clearInterval(this.timer);
    this.timer = setInterval(function () { if (!document.hidden) self.slide('next'); }, this.interval);
  };
  Slider.prototype.pause = function () { this.paused = true; clearInterval(this.timer); };
  Slider.prototype.to = function (i) {
    var cur = this.index();
    if (i === cur || i < 0 || i >= this.items.length || this.sliding) return;
    this.slide(i > cur ? 'next' : 'prev', i);
  };
  Slider.prototype.slide = function (dir, target) {
    if (this.sliding || this.items.length < 2) return;
    var n = this.items.length, cur = this.index();
    var next = target !== undefined ? target : (dir === 'next' ? (cur + 1) % n : (cur - 1 + n) % n);
    var a = this.items[cur], b = this.items[next], self = this;
    var orderCls = dir === 'next' ? 'carousel-item-next' : 'carousel-item-prev';
    var dirCls = dir === 'next' ? 'carousel-item-start' : 'carousel-item-end';
    this.sliding = true;
    this.inds.forEach(function (li, i) {
      li.classList.toggle('active', i === next);
      if (i === next) li.setAttribute('aria-current', 'true'); else li.removeAttribute('aria-current');
    });
    b.classList.add(orderCls);
    void b.offsetHeight; // reflow
    a.classList.add(dirCls);
    b.classList.add(dirCls);
    var done = function () {
      b.classList.remove(dirCls, orderCls);
      b.classList.add('active');
      a.classList.remove('active', orderCls, dirCls);
      self.sliding = false;
    };
    var fired = false;
    var end = function (e) {
      if (e && e.target !== a) return;
      if (fired) return; fired = true;
      a.removeEventListener('transitionend', end);
      done();
    };
    a.addEventListener('transitionend', end);
    setTimeout(end, 650); // fallback (.6s transition + 5ms like Bootstrap's emulateTransitionEnd)
    if (!this.paused) this.cycle();
  };
  $$('.carousel.slide[data-ride="carousel"]').forEach(function (el) { new Slider(el); });

  /* ---------------------------------------------------------
     Partner carousel (loop, autoplay 3s, drag/swipe)
     --------------------------------------------------------- */
  function Carousel(root, o) {
    this.root = root;
    this.o = o;
    this.items = $$(':scope > .item', root);
    this.n = this.items.length;
    this.pos = 0;
    this.build();
    this.bindDrag();
    var self = this, rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(function () { self.layout(true); }, 200); });
    this.play();
  }
  Carousel.prototype.perView = function () {
    var w = window.innerWidth, bp = Object.keys(this.o.responsive).map(Number).sort(function (a, b) { return a - b; });
    var items = 1;
    bp.forEach(function (b) { if (w >= b) items = this.o.responsive[b]; }, this);
    return items;
  };
  Carousel.prototype.build = function () {
    var outer = document.createElement('div'), stage = document.createElement('div');
    outer.className = 'owl-stage-outer'; stage.className = 'owl-stage';
    outer.appendChild(stage);
    this.root.appendChild(outer);
    this.outer = outer; this.stage = stage;
    this.root.classList.add('owl-loaded', 'owl-drag');
    // owl theme controls: prev/next arrows + page dots
    var self = this;
    this.nav = document.createElement('div'); this.nav.className = 'owl-nav';
    this.nav.innerHTML = '<button type="button" role="presentation" class="owl-prev"><span aria-label="Previous">\u2039</span></button>' +
      '<button type="button" role="presentation" class="owl-next"><span aria-label="Next">\u203a</span></button>';
    this.dots = document.createElement('div'); this.dots.className = 'owl-dots';
    this.root.appendChild(this.nav); this.root.appendChild(this.dots);
    this.nav.firstChild.addEventListener('click', function () { self.moveBy(-1); });
    this.nav.lastChild.addEventListener('click', function () { self.moveBy(1); });
    this.dots.addEventListener('click', function (e) {
      var b = e.target.closest('.owl-dot'); if (!b) return;
      var start = self.pages[[].indexOf.call(self.dots.children, b)].start;
      var d = start - self.realIndex();
      if (Math.abs(d) > self.n / 2) d -= (d > 0 ? 1 : -1) * self.n;
      self.moveBy(d);
    });
    this.layout(false);
  };
  Carousel.prototype.drawControls = function () {
    var off = this.n <= this.pv, html = '';
    this.nav.classList.toggle('disabled', off);
    this.dots.classList.toggle('disabled', off);
    this.pages = [];
    for (var i = 0; i < this.n; i += this.pv) this.pages.push({ start: i, end: i + this.pv - 1 });
    this.pages.forEach(function () { html += '<button role="button" class="owl-dot"><span></span></button>'; });
    this.dots.innerHTML = html;
  };
  Carousel.prototype.updateDots = function () {
    if (!this.pages) return;
    var cur = this.realIndex(), idx = 0;
    this.pages.forEach(function (p, i) { if (p.start <= cur && p.end >= cur) idx = i; });
    [].forEach.call(this.dots.children, function (d, i) { d.classList.toggle('active', i === idx); });
  };
  Carousel.prototype.moveBy = function (d) {
    this.normalize();
    var t = this.pos + d;
    if (t < 0 || t + this.pv > this.slots.length) {
      var shift = t < 0 ? this.n : -this.n;
      this.pos += shift; this.setX(this.coord(this.pos), false); reflow(this.stage); t += shift;
    }
    this.goTo(t, true);
  };
  Carousel.prototype.layout = function (keep) {
    var self = this, pv = this.perView();
    var cur = keep ? this.realIndex() : 0;
    this.pv = pv;
    // clones: owl uses max(items*2, 4) clones split before/after
    var cloneCount = Math.max(pv * 2, 4), half = cloneCount / 2;
    var cloneSets = Math.ceil(half / this.n) + 1;
    this.stage.innerHTML = '';
    var wrap = function (el, clone) {
      var w = document.createElement('div');
      w.className = 'owl-item' + (clone ? ' cloned' : '');
      w.appendChild(clone ? el.cloneNode(true) : el);
      return w;
    };
    var before = [], after = [];
    for (var i = 0; i < half; i++) {
      before.unshift(this.items[(this.n - 1 - (i % this.n) + this.n * cloneSets) % this.n]);
      after.push(this.items[i % this.n]);
    }
    before.forEach(function (el) { self.stage.appendChild(wrap(el, true)); });
    this.items.forEach(function (el) { self.stage.appendChild(wrap(el, false)); });
    after.forEach(function (el) { self.stage.appendChild(wrap(el, true)); });
    this.offset = half;
    this.slots = $$('.owl-item', this.stage);
    var W = this.outer.clientWidth, m = this.o.margin;
    this.itemW = +((W + m) / pv).toFixed(3) - m;
    this.slots.forEach(function (s) { s.style.width = self.itemW + 'px'; s.style.marginRight = m + 'px'; });
    this.stage.style.width = (this.itemW + m) * this.slots.length + 'px';
    if (this.nav) this.drawControls();
    this.goTo(this.offset + cur, false);
  };
  Carousel.prototype.realIndex = function () { return ((this.pos - this.offset) % this.n + this.n) % this.n; };
  Carousel.prototype.coord = function (pos) { return -pos * (this.itemW + this.o.margin); };
  Carousel.prototype.setX = function (x, anim) {
    this.stage.style.transition = anim ? 'all ' + this.o.speed + 'ms ease 0s' : 'all 0s ease 0s';
    this.stage.style.transform = 'translate3d(' + x + 'px,0px,0px)';
    this.x = x;
  };
  Carousel.prototype.normalize = function () {
    // jump silently back into the real range so the loop is seamless
    var min = this.offset, max = this.offset + this.n - 1;
    if (this.pos < min || this.pos > max) {
      this.pos = this.offset + this.realIndex();
      this.setX(this.coord(this.pos), false);
      reflow(this.stage);
    }
  };
  Carousel.prototype.goTo = function (pos, anim) {
    this.pos = pos;
    this.setX(this.coord(pos), anim);
    var self = this;
    this.slots.forEach(function (s, i) { s.classList.toggle('active', i >= pos && i < pos + self.pv); });

    this.updateDots();
  };
  Carousel.prototype.next = function () { this.moveBy(1); };
  Carousel.prototype.play = function () {
    var self = this;
    this.stop();
    this.timer = setInterval(function () { if (!document.hidden && !self.dragging) self.next(); }, this.o.autoplayTimeout);
  };
  Carousel.prototype.stop = function () { clearInterval(this.timer); };
  Carousel.prototype.bindDrag = function () {
    var self = this, sx = 0, sy = 0, startX = 0, moved = false, axis = null, t0 = 0;
    function pt(e) { return e.touches ? e.touches[0] : e; }
    function down(e) {
      if (e.type === 'mousedown' && e.button !== 0) return;
      var p = pt(e);
      self.normalize();
      sx = p.clientX; sy = p.clientY; startX = self.x; moved = false; axis = null; t0 = Date.now();
      self.dragging = true;
      self.stop();
      self.root.classList.add('owl-grab');
      document.addEventListener(e.type === 'mousedown' ? 'mousemove' : 'touchmove', move, { passive: false });
      document.addEventListener(e.type === 'mousedown' ? 'mouseup' : 'touchend', up);
    }
    function move(e) {
      var p = pt(e), dx = p.clientX - sx, dy = p.clientY - sy;
      if (!axis) { if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return; axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'; }
      if (axis === 'y') return;
      e.preventDefault();
      moved = true;
      self.root.classList.add('owl-grabbing');
      self.setX(startX + dx, false);
    }
    function up(e) {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('touchmove', move);
      document.removeEventListener('mouseup', up);
      document.removeEventListener('touchend', up);
      self.root.classList.remove('owl-grab', 'owl-grabbing');
      self.dragging = false;
      if (moved) {
        var dx = self.x - startX, unit = self.itemW + self.o.margin;
        var steps = Math.round(-dx / unit);
        // a short flick still advances one item (owl's dragEndSpeed behaviour)
        if (steps === 0 && Math.abs(dx) > 30) steps = dx < 0 ? 1 : -1;
        if (Date.now() - t0 < 300 && Math.abs(dx) > 30 && Math.abs(steps) < 1) steps = dx < 0 ? 1 : -1;
        self.goTo(self.pos + steps, true);
        // swallow the click that follows a drag
        var block = function (ev) { ev.preventDefault(); ev.stopPropagation(); self.root.removeEventListener('click', block, true); };
        self.root.addEventListener('click', block, true);
        setTimeout(function () { self.root.removeEventListener('click', block, true); }, 0);
      }
      self.play();
    }
    this.root.addEventListener('mousedown', down);
    this.root.addEventListener('touchstart', down, { passive: true });
    this.root.addEventListener('dragstart', function (e) { e.preventDefault(); });
  };
  var partners = $('#partners');
  if (partners) new Carousel(partners, { margin: 100, autoplayTimeout: 3000, speed: 250, responsive: { 0: 2, 600: 3, 1000: 6 } });

  /* ---------------------------------------------------------
     Lightbox gallery (Fancybox-style: counter, toolbar, thumbs, hash)
     --------------------------------------------------------- */
  var ICONS = {
    zoom: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="7"/><path d="M15 15l6 6M7 10h6M10 7v6"/></svg>',
    unzoom: '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="7"/><path d="M15 15l6 6M7 10h6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M6.5 5.4v13.2l11-6.6z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8.33 5.75h2.2v12.5h-2.2V5.75zm5.15 0h2.2v12.5h-2.2V5.75z"/></svg>',
    fs: '<svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3"/></svg>',
    exitfs: '<svg viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3"/></svg>',
    thumbs: '<svg viewBox="0 0 24 24"><circle cx="4" cy="4" r="1"/><circle cx="12" cy="4" r="1"/><circle cx="20" cy="4" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="20" cy="12" r="1"/><circle cx="4" cy="20" r="1"/><circle cx="12" cy="20" r="1"/><circle cx="20" cy="20" r="1"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M20 20L4 4m16 0L4 20"/></svg>',
    prev: '<svg viewBox="0 0 24 24"><path d="M15 3l-9 9 9 9"/></svg>',
    next: '<svg viewBox="0 0 24 24"><path d="M9 3l9 9-9 9"/></svg>'
  };

  function Lightbox(group, links) {
    this.group = group;
    this.links = links;
    this.items = links.map(function (a) { return { src: a.getAttribute('href'), caption: a.getAttribute('data-caption') || '', thumb: a.querySelector('img') }; });
    this.isOpen = false;
    var self = this;
    links.forEach(function (a, i) {
      a.addEventListener('click', function (e) { e.preventDefault(); self.open(i, true); });
    });
    window.addEventListener('popstate', function () { self.syncHash(); });
    window.addEventListener('hashchange', function () { self.syncHash(); });
  }
  Lightbox.prototype.hashIndex = function () {
    var m = new RegExp('^#' + this.group + '-(\\d+)$').exec(location.hash);
    if (!m) return -1;
    var i = +m[1] - 1;
    return i >= 0 && i < this.items.length ? i : -1;
  };
  Lightbox.prototype.syncHash = function () {
    var i = this.hashIndex();
    if (i === -1 && this.isOpen) { this.pushed = false; this.close(); }
    else if (i !== -1 && !this.isOpen) this.open(i, false);
    else if (i !== -1 && this.isOpen && i !== this.index) this.go(i);
  };
  Lightbox.prototype.render = function () {
    var self = this, n = this.items.length;
    var el = document.createElement('div');
    el.className = 'lb is-opening';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.tabIndex = -1;
    var slides = this.items.map(function (it, i) {
      return '<div class="lb-slide" data-i="' + i + '"><div class="lb-media"><img alt="' + it.caption + '" draggable="false" data-src="' + it.src + '"></div>' +
        (it.caption ? '<div class="lb-caption">' + it.caption + '</div>' : '') + '</div>';
    }).join('');
    var thumbs = this.items.map(function (it, i) {
      return '<div class="lb-thumb" data-i="' + i + '"><button type="button" tabindex="0" aria-label="Đi tới ảnh ' + (i + 1) + '"><img src="' + it.thumb.getAttribute('src') + '" alt=""></button></div>';
    }).join('');
    el.innerHTML =
      '<div class="lb-backdrop"></div>' +
      '<div class="lb-toolbar"><div class="lb-counter"><span class="lb-cur">1</span>&nbsp;/&nbsp;<span>' + n + '</span></div>' +
      '<div class="lb-tools">' +
      '<button class="lb-btn" data-act="zoom" title="Toggle zoom">' + ICONS.zoom + '</button>' +
      '<button class="lb-btn" data-act="slideshow" title="Toggle slideshow">' + ICONS.play + '</button>' +
      '<button class="lb-btn" data-act="fullscreen" title="Toggle fullscreen">' + ICONS.fs + '</button>' +
      '<button class="lb-btn" data-act="thumbs" title="Toggle thumbnails">' + ICONS.thumbs + '</button>' +
      '<button class="lb-btn" data-act="close" title="Close">' + ICONS.close + '</button>' +
      '</div></div>' +
      '<div class="lb-progress"></div>' +
      '<div class="lb-stage">' + slides +
      '<button class="lb-btn lb-nav lb-prev" data-act="prev" title="Previous">' + ICONS.prev + '</button>' +
      '<button class="lb-btn lb-nav lb-next" data-act="next" title="Next">' + ICONS.next + '</button>' +
      '</div>' +
      '<div class="lb-thumbs"><div class="lb-thumbs-track">' + thumbs + '</div></div>';
    document.body.appendChild(el);
    this.el = el;
    this.stage = $('.lb-stage', el);
    this.slides = $$('.lb-slide', el);
    this.slides.forEach(function (s) { s.style.position = 'absolute'; s.style.inset = '0'; });
    this.thumbEls = $$('.lb-thumb', el);
    this.cur = $('.lb-cur', el);
    this.progress = $('.lb-progress', el);

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b) { self.action(b.getAttribute('data-act'), b); return; }
      var th = e.target.closest('.lb-thumb');
      if (th) { self.go(+th.getAttribute('data-i')); return; }
      if (e.target.tagName === 'IMG' && e.target.closest('.lb-media')) { if (!self.dragMoved) self.toggleZoom(); return; }
      // click on empty area closes (Fancybox default for click on backdrop / slide)
      if (!self.dragMoved && (e.target.classList.contains('lb-slide') || e.target.classList.contains('lb-backdrop') || e.target.classList.contains('lb-media'))) self.close();
    });
    this.keyHandler = function (e) {
      if (!self.isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); self.close(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); self.go(self.index - 1); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); self.go(self.index + 1); }
    };
    document.addEventListener('keydown', this.keyHandler);
    this.fsHandler = function () {
      var b = $('[data-act="fullscreen"]', el);
      if (b) b.innerHTML = document.fullscreenElement ? ICONS.exitfs : ICONS.fs;
    };
    document.addEventListener('fullscreenchange', this.fsHandler);
    this.wheelHandler = function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now - (self.lastWheel || 0) < 250) return;
      self.lastWheel = now;
      if (e.deltaY < 0 && !self.zoomed && self.canZoom()) self.toggleZoom();
      else if (e.deltaY > 0 && self.zoomed) self.toggleZoom();
    };
    el.addEventListener('wheel', this.wheelHandler, { passive: false });
    this.bindDrag();
    setTimeout(function () { el.classList.remove('is-opening'); }, 150);
  };
  Lightbox.prototype.load = function (i) {
    var img = $('img', this.slides[i]);
    if (img && !img.getAttribute('src')) img.src = img.getAttribute('data-src');
  };
  Lightbox.prototype.layoutSlides = function (prevIndex, anim) {
    var n = this.items.length, self = this;
    this.slides.forEach(function (s, i) {
      var rel = i - self.index;
      if (rel > n / 2) rel -= n; if (rel < -n / 2) rel += n;
      var old = s._rel === undefined ? rel : s._rel;
      // only slides moving between neighbouring positions animate (seamless infinite loop)
      var animate = anim && Math.abs(old) <= 1 && Math.abs(rel) <= 1;
      s.style.transition = animate ? 'transform .35s cubic-bezier(.25,.8,.25,1)' : 'none';
      s.style.transform = 'translate3d(' + (rel * 100) + '%,0,0)';
      s.style.visibility = Math.abs(rel) <= 1 || Math.abs(old) <= 1 ? 'visible' : 'hidden';
      s.classList.toggle('is-current', rel === 0);
      s._rel = rel;
    });
  };
  Lightbox.prototype.update = function () {
    var self = this, n = this.items.length;
    this.cur.textContent = this.index + 1;
    this.thumbEls.forEach(function (t, i) { t.classList.toggle('is-selected', i === self.index); });
    [this.index, (this.index + 1) % n, (this.index - 1 + n) % n].forEach(function (i) { self.load(i); });
    var cur = $('img', this.slides[this.index]);
    var zb = $('[data-act="zoom"]', this.el);
    var refresh = function () { zb.disabled = !self.canZoom(); };
    if (cur.complete && cur.naturalWidth) refresh(); else cur.onload = refresh;
    // centre active thumbnail when the strip overflows
    var track = $('.lb-thumbs-track', this.el), tw = 96, total = tw * n + 6, vw = this.el.clientWidth;
    if (total > vw) {
      track.style.justifyContent = 'flex-start';
      var x = Math.min(0, Math.max(vw - total, vw / 2 - (this.index + 0.5) * tw - 3));
      track.style.transform = 'translateX(' + x + 'px)';
    } else { track.style.justifyContent = 'center'; track.style.transform = 'none'; }
    if (this.pushed) history.replaceState(history.state, '', '#' + this.group + '-' + (this.index + 1));
  };
  Lightbox.prototype.open = function (i, push) {
    if (this.isOpen) return;
    this.isOpen = true;
    this.index = i;
    this.zoomed = false;
    this.render();
    document.body.classList.add('lb-open');
    lockScroll();
    this.layoutSlides(null, false);
    this.update();
    this.zoomIn(i);
    if (push) {
      history.pushState({ lb: 1 }, '', '#' + this.group + '-' + (i + 1));
      this.pushed = true;
    } else this.pushed = false;
    this.el.focus();
  };
  Lightbox.prototype.zoomIn = function (i) {
    // animate from the thumbnail to the fitted image (FLIP)
    var img = $('img', this.slides[i]), thumb = this.items[i].thumb;
    var run = function () {
      var tr = thumb.getBoundingClientRect(), ir = img.getBoundingClientRect();
      if (!ir.width || tr.bottom < 0 || tr.top > window.innerHeight) return;
      var sx = tr.width / ir.width, sy = tr.height / ir.height;
      var dx = tr.left + tr.width / 2 - (ir.left + ir.width / 2), dy = tr.top + tr.height / 2 - (ir.top + ir.height / 2);
      img.style.transition = 'none';
      img.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
      reflow(img);
      img.style.transition = 'transform .3s cubic-bezier(.25,.8,.25,1)';
      img.style.transform = '';
      setTimeout(function () { img.style.transition = ''; }, 320);
    };
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
  };
  Lightbox.prototype.go = function (i) {
    var n = this.items.length;
    i = (i % n + n) % n;
    if (i === this.index) return;
    if (this.zoomed) this.toggleZoom(true);
    this.index = i;
    this.layoutSlides(null, true);
    this.update();
    if (this.slideshow) this.restartProgress();
  };
  Lightbox.prototype.canZoom = function () {
    var img = $('img', this.slides[this.index]);
    return !!(img && img.naturalWidth && img.naturalWidth > img.clientWidth + 1);
  };
  Lightbox.prototype.toggleZoom = function (instant) {
    var img = $('img', this.slides[this.index]), b = $('[data-act="zoom"]', this.el);
    if (!this.zoomed) {
      if (!this.canZoom()) return;
      this.zoomed = true;
      this.scale = img.naturalWidth / img.clientWidth;
      this.pan = { x: 0, y: 0 };
      img.style.transform = 'translate(0px,0px) scale(' + this.scale + ')';
      this.el.classList.add('is-zoomed');
      b.innerHTML = ICONS.unzoom;
    } else {
      this.zoomed = false;
      if (instant) img.style.transition = 'none';
      img.style.transform = '';
      if (instant) { reflow(img); img.style.transition = ''; }
      this.el.classList.remove('is-zoomed');
      b.innerHTML = ICONS.zoom;
    }
  };
  Lightbox.prototype.clampPan = function (img) {
    var w = img.clientWidth * this.scale, h = img.clientHeight * this.scale;
    var maxX = Math.max(0, (w - window.innerWidth) / 2), maxY = Math.max(0, (h - window.innerHeight) / 2);
    this.pan.x = Math.max(-maxX, Math.min(maxX, this.pan.x));
    this.pan.y = Math.max(-maxY, Math.min(maxY, this.pan.y));
  };
  Lightbox.prototype.bindDrag = function () {
    var self = this, sx, sy, axis, dx, dy, active = false, t0, panStart;
    function pt(e) { return e.touches ? e.touches[0] : e; }
    function down(e) {
      if (e.target.closest('.lb-toolbar, .lb-thumbs, .lb-nav')) return;
      if (e.type === 'mousedown' && e.button !== 0) return;
      var p = pt(e);
      sx = p.clientX; sy = p.clientY; dx = dy = 0; axis = null; active = true; t0 = Date.now();
      self.dragMoved = false;
      if (self.zoomed) panStart = { x: self.pan.x, y: self.pan.y };
      if (e.type === 'mousedown') e.preventDefault();
    }
    function move(e) {
      if (!active) return;
      var p = pt(e);
      dx = p.clientX - sx; dy = p.clientY - sy;
      if (!axis) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        axis = self.zoomed ? 'pan' : (Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y');
      }
      self.dragMoved = true;
      if (e.cancelable) e.preventDefault();
      var curSlide = self.slides[self.index];
      if (axis === 'pan') {
        var img = $('img', curSlide);
        self.pan = { x: panStart.x + dx, y: panStart.y + dy };
        self.clampPan(img);
        img.style.transition = 'none';
        img.style.transform = 'translate(' + self.pan.x / self.scale + 'px,' + self.pan.y / self.scale + 'px) scale(' + self.scale + ')';
      } else if (axis === 'x') {
        self.slides.forEach(function (s) {
          if (Math.abs(s._rel) > 1) return;
          s.style.transition = 'none';
          s.style.transform = 'translate3d(calc(' + (s._rel * 100) + '% + ' + dx + 'px),0,0)';
        });
      } else {
        curSlide.style.transition = 'none';
        curSlide.style.transform = 'translate3d(0,' + dy + 'px,0)';
        $('.lb-backdrop', self.el).style.opacity = Math.max(0.2, 1 - Math.abs(dy) / window.innerHeight * 1.5);
      }
    }
    function up() {
      if (!active) return;
      active = false;
      if (axis === 'pan') { var im = $('img', self.slides[self.index]); im.style.transition = ''; }
      else if (axis === 'x') {
        var fast = Date.now() - t0 < 250 && Math.abs(dx) > 20;
        if (dx < -window.innerWidth * 0.15 || (fast && dx < 0)) self.go(self.index + 1);
        else if (dx > window.innerWidth * 0.15 || (fast && dx > 0)) self.go(self.index - 1);
        else self.layoutSlides(null, true);
      } else if (axis === 'y') {
        var bd = $('.lb-backdrop', self.el);
        if (Math.abs(dy) > window.innerHeight * 0.15) { self.close(); }
        else { bd.style.opacity = ''; self.layoutSlides(null, true); }
      }
      setTimeout(function () { self.dragMoved = false; }, 0);
    }
    this.stage.addEventListener('mousedown', down);
    this.stage.addEventListener('touchstart', down, { passive: true });
    this.moveHandler = move; this.upHandler = up;
    document.addEventListener('mousemove', move);
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('mouseup', up);
    document.addEventListener('touchend', up);
  };
  Lightbox.prototype.restartProgress = function () {
    var p = this.progress, self = this;
    clearTimeout(this.ssTimer);
    p.style.transition = 'none'; p.style.transform = 'scaleX(0)';
    reflow(p);
    p.style.transition = 'transform 3s linear'; p.style.transform = 'scaleX(1)';
    this.ssTimer = setTimeout(function () { self.go(self.index + 1); }, 3000);
  };
  Lightbox.prototype.action = function (act, btn) {
    if (act === 'close') this.close();
    else if (act === 'prev') this.go(this.index - 1);
    else if (act === 'next') this.go(this.index + 1);
    else if (act === 'zoom') this.toggleZoom();
    else if (act === 'thumbs') this.el.classList.toggle('thumbs-hidden');
    else if (act === 'fullscreen') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (this.el.requestFullscreen) this.el.requestFullscreen();
    } else if (act === 'slideshow') {
      this.slideshow = !this.slideshow;
      btn.innerHTML = this.slideshow ? ICONS.pause : ICONS.play;
      if (this.slideshow) this.restartProgress();
      else { clearTimeout(this.ssTimer); this.progress.style.transition = 'none'; this.progress.style.transform = 'scaleX(0)'; }
    }
  };
  Lightbox.prototype.close = function () {
    if (!this.isOpen || this.closing) return;
    var self = this, el = this.el;
    this.closing = true;
    clearTimeout(this.ssTimer);
    this.slideshow = false;
    if (document.fullscreenElement) document.exitFullscreen();
    document.removeEventListener('keydown', this.keyHandler);
    document.removeEventListener('fullscreenchange', this.fsHandler);
    document.removeEventListener('mousemove', this.moveHandler);
    document.removeEventListener('touchmove', this.moveHandler);
    document.removeEventListener('mouseup', this.upHandler);
    document.removeEventListener('touchend', this.upHandler);
    el.classList.add('is-closing');
    if (this.pushed) { this.pushed = false; this.isOpen = false; history.back(); }
    else if (new RegExp('^#' + this.group + '-\\d+$').test(location.hash)) history.replaceState(history.state, '', location.pathname + location.search);
    setTimeout(function () {
      el.remove();
      self.isOpen = false;
      self.closing = false;
      document.body.classList.remove('lb-open');
      unlockScroll();
      var link = self.links[self.index];
      if (link) link.focus({ preventScroll: true });
    }, 150);
  };

  var groups = {};
  $$('[data-fancybox]').forEach(function (a) {
    var g = a.getAttribute('data-fancybox');
    (groups[g] = groups[g] || []).push(a);
  });
  Object.keys(groups).forEach(function (g) {
    var lb = new Lightbox(g, groups[g]);
    if (lb.hashIndex() !== -1) lb.open(lb.hashIndex(), false); // deep link (#group-N) opens on load
  });

  /* ---------------------------------------------------------
     Store map (Leaflet)
     --------------------------------------------------------- */
  var mapEl = $('#map');
  if (mapEl && window.L) {
    var stores = [
      { name: 'Bảo Dương moto 1', address: '307/2A Phan Châu Trinh, phường Hải Châu, Đà Nẵng', lat: 16.058949327953595, lng: 108.21931193870738, phone: '0911003600', openingHours: 'Time open: 8:00 - 20:00' },
      { name: 'Bảo Dương moto 2', address: '14 Mai Dị, phường Hoà Cường, Đà Nẵng', lat: 16.045098555613848, lng: 108.21815760516326, phone: '0914002002', openingHours: 'Time open: 8:00 - 22:00' },
      { name: 'Bảo Dương moto 3', address: '111 Lê Thanh Nghị, phường Hoà Cường, Đà Nẵng', lat: 16.039702870723545, lng: 108.21812938917952, phone: '0914002002', openingHours: 'Time open: 8:00 - 22:00' },
      { name: 'Bảo Dương moto 4', address: '122 Phan Trọng Tuệ, phường Hoà Cường, Đà Nẵng', lat: 16.032874848697404, lng: 108.21909583570616, phone: '0914353353', openingHours: 'Time open: 8:00 - 20:00' },
      { name: 'Bảo Dương moto 5', address: '74 Đỗ Pháp Thuận, phường Hòa Cường, Đà Nẵng, Việt Nam', lat: 16.0360788828839, lng: 108.2329926730184, phone: '0911002327', openingHours: 'Time open: 8:00 - 22:00' },
      { name: 'Bảo Dương moto 6', address: '17 Hà Văn Tính, phường Hoà Khánh, Đà Nẵng, Việt Nam', lat: 16.068436438721506, lng: 108.15412137116448, phone: '0988429777', openingHours: 'Time open: 8:00 - 22:00' }
    ];
    var map = L.map('map').setView([16.077043934064385, 108.22278964587527], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

    var mkIcon = function (url) {
      return L.icon({ iconUrl: url, iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
    };
    var storeIcon = mkIcon(ASSETS + 'images/marker-icon.png');
    var userIcon = mkIcon(ASSETS + 'images/marker-icon-red.png');
    var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    var dirUrl = function (s) {
      return isMobile ? 'https://maps.google.com/maps?daddr=' + s.lat + ',' + s.lng + '&amp;ll='
                      : 'https://www.google.com/maps/dir/?api=1&destination=' + s.lat + ',' + s.lng;
    };
    var popupHtml = function (s, dist, nearest) {
      return '<div class="store-info">' +
        (nearest ? '<div class="nearest-badge fw-bold text-danger">CỬA HÀNG GẦN NHẤT</div>' : '') +
        '<h3>' + s.name + '</h3>' +
        '<p><i class="fas fa-map-marker-alt"></i> ' + s.address + '</p>' +
        '<p><i class="fas fa-phone"></i> ' + s.phone + '</p>' +
        (dist != null ? '<p><i class="fas fa-route"></i> Cách bạn: ' + dist + ' km</p>' : '') +
        '<p><i class="far fa-clock"></i> ' + s.openingHours + '</p>' +
        '<a href="' + dirUrl(s) + '" target="_blank" class="directions-btn"><i class="fas fa-directions"></i> Chỉ đường</a>' +
        '</div>';
    };

    var markers = [], bounds = [];
    stores.forEach(function (s) {
      var mk = L.marker([s.lat, s.lng], { icon: storeIcon, title: s.name, riseOnHover: true }).addTo(map);
      mk.bindPopup(popupHtml(s), { maxWidth: 220 });
      markers.push(mk);
      bounds.push([s.lat, s.lng]);
      var label = L.marker([s.lat, s.lng], {
        icon: L.divIcon({ html: '<div class="store-label-container">' + s.name + '</div>', className: 'store-label-wrapper', iconSize: [0, 0], iconAnchor: [0, 0] }),
        zIndexOffset: 1000, keyboard: false
      }).addTo(map);
      label.on('click', function () { mk.openPopup(); });
    });
    var fit = function () {
      var h = mapEl.clientHeight, w = mapEl.clientWidth;
      map.fitBounds(bounds, { padding: [Math.min(75, h * 0.1), Math.min(75, w * 0.1)], maxZoom: 15 });
    };
    fit();

    // "Find my location" control (easy-button style, two states)
    var userMarker = null, accCircle = null;
    var clearLocationLayers = function () {
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (accCircle) { map.removeLayer(accCircle); accCircle = null; }
      markers.forEach(function (mk, i) { mk.setPopupContent(popupHtml(stores[i])); });
    };
    var LocateControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd: function () {
        var bar = L.DomUtil.create('div', 'leaflet-bar easy-button-container leaflet-control');
        var btn = L.DomUtil.create('button', 'easy-button-button leaflet-bar-part leaflet-interactive locate-state', bar);
        btn.type = 'button';
        var setState = function (st) {
          btn.className = 'easy-button-button leaflet-bar-part leaflet-interactive ' + st + '-state';
          btn.title = st === 'locate' ? 'Tìm vị trí của tôi' : 'Hủy tìm kiếm';
          btn.innerHTML = '<span class="button-state state-' + st + ' ' + st + '-active"><span class="fa ' + (st === 'locate' ? 'fa-crosshairs' : 'fa-times') + '"></span></span>';
          btn._state = st;
        };
        setState('locate');
        L.DomEvent.disableClickPropagation(bar);
        L.DomEvent.on(btn, 'click', function () {
          if (btn._state === 'locate') { locateUser(); setState('cancel'); }
          else { map.stopLocate(); clearLocationLayers(); setState('locate'); }
        });
        return bar;
      }
    });
    map.addControl(new LocateControl());

    function locateUser() {
      if (!navigator.geolocation) { alert('Trình duyệt của bạn không hỗ trợ định vị'); return; }
      map.locate({ setView: true, maxZoom: 15, enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    }
    map.on('locationfound', function (e) {
      clearLocationLayers();
      userMarker = L.marker(e.latlng, { icon: userIcon }).addTo(map).bindPopup('Vị trí của bạn', { autoClose: false });
      accCircle = L.circle(e.latlng, { radius: e.accuracy / 2, color: '#3388ff', fillColor: '#3388ff', fillOpacity: 0.2, weight: 1, opacity: 0.5 }).addTo(map);
      var best = -1, bestD = Infinity;
      stores.forEach(function (s, i) {
        var d = map.distance(e.latlng, [s.lat, s.lng]);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best > -1) {
        var km = (bestD / 1000).toFixed(2), mk = markers[best];
        mk.unbindPopup();
        mk.bindPopup(popupHtml(stores[best], km, true), { maxWidth: 220, autoClose: false });
        map.setView([stores[best].lat, stores[best].lng], 15, { animate: true });
        setTimeout(function () { userMarker && userMarker.openPopup(); }, 500);
        setTimeout(function () { mk.openPopup(); }, 100);
      }
    });
    map.on('locationerror', function (e) { alert('Không thể lấy vị trí: ' + e.message); });
  }
})();
