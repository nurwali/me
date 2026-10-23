(function () {
    'use strict';

    var dialog = null;
    var previousFocus = null;
    var lastOverflow = '';

    function parseVideo(raw) {
        if (!raw) return null;
        var url;
        try { url = new URL(raw, window.location.href); } catch (e) { return null; }
        if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
        var host = url.hostname.toLowerCase().replace(/^www\./, '');
        var id = '';
        if (host === 'youtu.be') {
            id = url.pathname.split('/').filter(Boolean)[0] || '';
        } else if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
            if (url.pathname === '/watch') id = url.searchParams.get('v') || '';
            else if (/^\/(shorts|embed)\//.test(url.pathname)) id = url.pathname.split('/')[2] || '';
        }
        if (/^[A-Za-z0-9_-]{11}$/.test(id)) return { type: 'embed', src: 'https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0' };
        if (host === 'vimeo.com' || host === 'player.vimeo.com') {
            var parts = url.pathname.split('/').filter(Boolean);
            var number = parts.find(function (part) { return /^\d+$/.test(part); });
            if (number) {
                var hash = url.searchParams.get('h') || '';
                var index = parts.indexOf(number);
                if (!hash && parts[index + 1] && /^[A-Za-z0-9]+$/.test(parts[index + 1])) hash = parts[index + 1];
                return { type: 'embed', src: 'https://player.vimeo.com/video/' + number + '?autoplay=1&dnt=1' + (hash ? '&h=' + encodeURIComponent(hash) : '') };
            }
        }
        if (/\.(mp4|webm)$/i.test(url.pathname)) return { type: 'video', src: url.href };
        return null;
    }

    function closeDialog() {
        if (!dialog) return;
        var old = dialog;
        dialog = null;
        old.remove();
        document.documentElement.style.overflow = lastOverflow;
        document.removeEventListener('keydown', dialogKeyboard);
        if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    }

    function dialogKeyboard(event) {
        if (!dialog) return;
        if (event.key === 'Escape') { event.preventDefault(); closeDialog(); return; }
        if (event.key !== 'Tab') return;
        var focusable = Array.prototype.slice.call(dialog.querySelectorAll('button, a[href], video[controls], iframe, [tabindex="0"]')).filter(function (element) { return !element.disabled; });
        if (!focusable.length) { event.preventDefault(); return; }
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }

    function openVideo(button) {
        if (dialog) closeDialog();
        previousFocus = button;
        var title = button.getAttribute('data-title') || 'Project video';
        var video = parseVideo(button.getAttribute('data-video'));
        var wrap = document.createElement('div');
        wrap.className = 'gd-video-dialog';
        wrap.setAttribute('role', 'dialog');
        wrap.setAttribute('aria-modal', 'true');
        wrap.setAttribute('aria-labelledby', 'nmk-video-title');
        var panel = document.createElement('div');
        panel.className = 'gd-video-panel';
        var top = document.createElement('div');
        top.className = 'gd-video-top';
        var heading = document.createElement('h2');
        heading.id = 'nmk-video-title';
        heading.textContent = title;
        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'gd-video-close';
        close.setAttribute('aria-label', 'Close video');
        close.textContent = '×';
        close.addEventListener('click', closeDialog);
        top.append(heading, close);
        var media = document.createElement('div');
        media.className = 'gd-video-media';
        if (video && video.type === 'embed') {
            var frame = document.createElement('iframe');
            frame.title = title;
            frame.src = video.src;
            frame.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
            frame.allowFullscreen = true;
            frame.referrerPolicy = 'strict-origin-when-cross-origin';
            media.appendChild(frame);
        } else if (video) {
            var player = document.createElement('video');
            player.controls = true;
            player.autoplay = true;
            player.playsInline = true;
            player.src = video.src;
            player.setAttribute('aria-label', title);
            media.appendChild(player);
        } else if (button.getAttribute('data-concept') !== 'true' && button.getAttribute('data-image')) {
            media.classList.add('gd-video-image');
            var image = document.createElement('img');
            image.src = button.getAttribute('data-image');
            image.alt = title;
            media.appendChild(image);
        } else {
            media.classList.add('gd-video-placeholder');
            var message = document.createElement('p');
            message.textContent = 'This project is being updated. Email me to learn more.';
            media.appendChild(message);
        }
        panel.append(top, media);
        var project = button.getAttribute('data-project');
        if (project) {
            try {
                var projectUrl = new URL(project, window.location.href);
                if (projectUrl.protocol === 'https:' || projectUrl.protocol === 'http:') {
                    var link = document.createElement('a');
                    link.className = 'gd-video-project';
                    link.href = projectUrl.href;
                    link.textContent = 'View project ↗';
                    panel.appendChild(link);
                }
            } catch (e) { /* Invalid links are omitted. */ }
        }
        wrap.appendChild(panel);
        wrap.addEventListener('click', function (event) { if (event.target === wrap) closeDialog(); });
        dialog = wrap;
        lastOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        document.body.appendChild(wrap);
        document.addEventListener('keydown', dialogKeyboard);
        close.focus();
    }

    function initNav(nav) {
        if (nav.dataset.nmkReady) return;
        nav.dataset.nmkReady = 'true';
        var toggle = nav.querySelector('.gd-menu-toggle');
        var links = nav.querySelector('.gd-nav-links');
        if (!toggle || !links) return;
        function setOpen(open) {
            nav.classList.toggle('is-open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        }
        toggle.addEventListener('click', function () { setOpen(toggle.getAttribute('aria-expanded') !== 'true'); });
        links.addEventListener('click', function (event) { if (event.target.closest('a')) setOpen(false); });
        nav.addEventListener('keydown', function (event) { if (event.key === 'Escape') { setOpen(false); toggle.focus(); } });
        document.addEventListener('click', function (event) { if (!nav.contains(event.target)) setOpen(false); });
    }

    function initReel(reel) {
        if (reel.dataset.nmkReady) return;
        reel.dataset.nmkReady = 'true';
        var cards = Array.prototype.slice.call(reel.querySelectorAll('.gd-reel-card'));
        if (!cards.length) return;
        var active = 0;
        var counter = reel.querySelector('.gd-reel-counter');
        function setActive(index) {
            active = (index + cards.length) % cards.length;
            cards.forEach(function (card, i) {
                var offset = (i - active + cards.length) % cards.length;
                if (offset > Math.floor(cards.length / 2)) offset -= cards.length;
                card.dataset.offset = String(offset);
                card.classList.toggle('is-active', offset === 0);
                card.tabIndex = Math.abs(offset) <= 2 ? 0 : -1;
                card.setAttribute('aria-hidden', String(Math.abs(offset) > 2));
                card.setAttribute('aria-label', (offset === 0 ? 'Play ' : 'Select ') + (card.dataset.title || 'project'));
            });
            if (counter) counter.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
        }
        cards.forEach(function (card, index) {
            card.addEventListener('click', function () { if (index === active) openVideo(card); else setActive(index); });
        });
        var previous = reel.querySelector('[data-reel-prev]');
        var next = reel.querySelector('[data-reel-next]');
        if (previous) previous.addEventListener('click', function () { setActive(active - 1); });
        if (next) next.addEventListener('click', function () { setActive(active + 1); });
        reel.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowLeft') { event.preventDefault(); setActive(active - 1); }
            if (event.key === 'ArrowRight') { event.preventDefault(); setActive(active + 1); }
        });
        var startX = null;
        var startY = null;
        var swiped = false;
        reel.addEventListener('touchstart', function (event) { if (event.touches.length === 1) { startX = event.touches[0].clientX; startY = event.touches[0].clientY; swiped = false; } }, { passive: true });
        reel.addEventListener('touchend', function (event) {
            if (startX === null || !event.changedTouches.length) return;
            var dx = event.changedTouches[0].clientX - startX;
            var dy = event.changedTouches[0].clientY - startY;
            if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) { setActive(active + (dx < 0 ? 1 : -1)); swiped = true; }
            startX = null;
        }, { passive: true });
        reel.addEventListener('click', function (event) { if (swiped) { event.preventDefault(); event.stopPropagation(); swiped = false; } }, true);
        setActive(0);
    }

    function initPortfolio(portfolio) {
        if (portfolio.dataset.nmkReady) return;
        portfolio.dataset.nmkReady = 'true';
        var cards = Array.prototype.slice.call(portfolio.querySelectorAll('.gd-project-card'));
        var filters = Array.prototype.slice.call(portfolio.querySelectorAll('[data-filter]'));
        var status = portfolio.querySelector('.gd-filter-status');
        filters.forEach(function (filter) {
            filter.addEventListener('click', function () {
                var value = filter.dataset.filter;
                var count = 0;
                cards.forEach(function (card) { var show = value === 'all' || card.dataset.category === value; card.hidden = !show; if (show) count++; });
                filters.forEach(function (button) { var active = button === filter; button.classList.toggle('is-active', active); button.setAttribute('aria-pressed', String(active)); });
                if (status) status.textContent = count ? count + (count === 1 ? ' project' : ' projects') + ' shown' : (value === 'founder' ? 'Founder led motion projects will be added here.' : 'Projects in this service will be added here.');
            });
        });
        portfolio.querySelectorAll('.gd-project-media').forEach(function (button) { button.addEventListener('click', function () { openVideo(button); }); });
    }

    function init(scope) {
        var root = scope && scope.querySelectorAll ? scope : document;
        root.querySelectorAll('[data-nmk-poster]').forEach(function (img) {
            if (img.dataset.nmkImageReady) return;
            img.dataset.nmkImageReady = 'true';
            function fallback() {
                var url = img.dataset.fallback;
                if (!url || img.dataset.nmkFellBack) return;
                img.dataset.nmkFellBack = 'true';
                img.removeAttribute('srcset');
                img.src = url;
                var card = img.closest('.gd-project-media, .gd-reel-card');
                if (card) { card.dataset.image = url; card.dataset.concept = img.dataset.fallbackConcept || 'false'; }
                if (img.dataset.fallbackConcept === 'true' && !img.parentElement.querySelector('.gd-concept-badge')) {
                    var badge = document.createElement('span');
                    badge.className = 'gd-concept-badge';
                    badge.textContent = 'Concept preview';
                    img.parentElement.appendChild(badge);
                }
            }
            img.addEventListener('error', fallback);
            if (img.complete && !img.naturalWidth) fallback();
        });
        root.querySelectorAll('[data-nmk-nav]').forEach(initNav);
        root.querySelectorAll('[data-nmk-reel]').forEach(initReel);
        root.querySelectorAll('[data-nmk-portfolio]').forEach(initPortfolio);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { init(document); });
    else init(document);
    window.NMKPortfolio = { init: init, parseVideo: parseVideo, closeDialog: closeDialog };
}());

(function () {
  'use strict';
  function make(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function schedulingUrl(raw) {
    try {
      var url = new URL(raw);
      if (url.protocol !== 'https:' || url.username || url.password) return null;
      return url;
    } catch (error) { return null; }
  }
  function applyConfig(scope) {
    var root = scope || document;
    var config = window.PORTFOLIO_CONFIG || {};
    var email = typeof config.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email) ? config.email : 'khanwali.graphic@gmail.com';
    var phone = typeof config.phone === 'string' ? config.phone : '+880 1620 405196';
    root.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
      if (link.textContent.indexOf('@') !== -1) link.textContent = email;
      link.href = 'mailto:' + email;
    });
    root.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      link.textContent = phone;
      link.href = 'tel:' + phone.replace(/[^+0-9]/g, '');
    });
    root.querySelectorAll('[data-price-key]').forEach(function (plan) {
      var rate = (config.pricing || {})[plan.dataset.priceKey] || {};
      var amount = plan.querySelector('.gd-price .elementor-heading-title');
      var billing = plan.querySelector('[data-price-billing]');
      if (amount) amount.textContent = rate.amount || 'Let’s discuss';
      if (billing) billing.textContent = rate.billing || 'Quoted to match your project';
    });
    root.querySelectorAll('.gd-testimonials').forEach(function (section) {
      var reviews = Array.isArray(config.testimonials) ? config.testimonials.filter(function (review) { return review && typeof review.quote === 'string' && review.quote.trim() && typeof review.name === 'string' && review.name.trim(); }) : [];
      section.hidden = reviews.length === 0;
      var grid = section.querySelector('.gd-quotes');
      if (!grid) return;
      grid.replaceChildren();
      reviews.forEach(function (review) {
        var card = make('article', 'e-con gd-quote-card');
        card.appendChild(make('p', 'gd-eyebrow', 'CLIENT PERSPECTIVE'));
        var mark = make('span', 'gd-static-quote-mark', '“');
        mark.setAttribute('aria-hidden', 'true');
        card.appendChild(mark);
        card.appendChild(make('p', 'gd-quote', review.quote));
        var credit = make('p', 'gd-quote-person');
        credit.appendChild(make('strong', '', review.name));
        if (review.role) { credit.appendChild(document.createElement('br')); credit.appendChild(make('span', '', review.role)); }
        card.appendChild(credit);
        grid.appendChild(card);
      });
    });
    root.querySelectorAll('.gd-booking-calendar').forEach(function (calendar) {
      var scheduling = schedulingUrl(config.bookingUrl);
      calendar.replaceChildren();
      if (scheduling && ['calendly.com', 'www.calendly.com'].includes(scheduling.hostname.toLowerCase()) && scheduling.pathname !== '/') {
        var embed = new URL(scheduling.href);
        embed.searchParams.set('embed_domain', location.hostname || 'portfolio.local');
        embed.searchParams.set('embed_type', 'Inline');
        embed.searchParams.set('hide_event_type_details', '1');
        embed.searchParams.set('hide_landing_page_details', '1');
        embed.searchParams.set('background_color', 'f5f5f5');
        embed.searchParams.set('text_color', '0f0f10');
        embed.searchParams.set('primary_color', '069494');
        var frame = make('iframe');
        frame.src = embed.href;
        frame.title = 'Schedule a call with Nur Mohammad Khan';
        frame.loading = 'lazy';
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        calendar.appendChild(frame);
        var external = make('a', 'gd-booking-external', 'Open scheduling page ↗');
        external.href = scheduling.href; external.target = '_blank'; external.rel = 'noopener noreferrer';
        calendar.appendChild(external);
      } else {
        var panel = make('div', 'gd-calendar-placeholder gd-contact-fallback');
        panel.appendChild(make('span', 'gd-calendar-eyebrow', 'LET’S CONNECT'));
        panel.appendChild(make('h4', '', 'Let’s find a time.'));
        panel.appendChild(make('p', '', 'Send me a little about your project, and we can arrange a call.'));
        var action = make('a', 'gd-booking-external', scheduling ? 'Open booking calendar ↗' : 'Email me about your project ↗');
        action.href = scheduling ? scheduling.href : 'mailto:' + email;
        if (scheduling) { action.target = '_blank'; action.rel = 'noopener noreferrer'; }
        panel.appendChild(action);
        calendar.appendChild(panel);
      }
    });
  }
  window.PortfolioSite = { applyConfig: applyConfig };
  function ready() { applyConfig(document); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready);
  else ready();
}());
