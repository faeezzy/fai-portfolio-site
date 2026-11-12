(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(pointer: fine)').matches;
  var G = !!(window.gsap && window.ScrollTrigger && window.MotionPathPlugin);
  if (G) gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  if (!G) root.classList.remove('js');

  var TAGS = [
    ['11111111','10011001','10110111','11100011','10011001','11010111','10101001','11111111'],
    ['11111111','11010011','10101101','10011011','11100101','10110011','11001011','11111111'],
    ['11111111','10110101','11001011','10100111','11011001','10101101','11100011','11111111'],
    ['11111111','11100101','10011011','11010011','10101101','11001001','10110111','11111111']
  ];

  /* ---------- grid parallax ---------- */
  var gridBg = document.querySelector('.grid-bg');
  if (!reduce) {
    addEventListener('scroll', function () {
      gridBg.style.transform = 'translate3d(0,' + (-(scrollY * 0.3) % 32) + 'px,0)';
    }, { passive: true });
  }

  /* ---------- the track ---------- */
  var track = document.getElementById('track');
  var rail = document.getElementById('rail');
  var base = document.getElementById('railBase');
  var line = document.getElementById('railLine');
  var robot = document.getElementById('robot');
  var railTweens = [];
  function buildRail() {
    if (!G) return;
    railTweens.forEach(function (t) { if (t.scrollTrigger) t.scrollTrigger.kill(); t.kill(); });
    railTweens = [];
    gsap.set(robot, { clearProps: 'transform,left,top' });
    robot.style.left = '0px'; robot.style.top = '0px';
    var w = rail.getBoundingClientRect().width || 56;
    var h = track.offsetHeight;
    rail.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    rail.style.height = h + 'px';
    var cx = w / 2, amp = w * 0.26, seg = w > 40 ? 440 : 360;
    var pts = [[cx, 0]], y = seg, s = 1;
    while (y < h - seg * 0.6) { pts.push([cx + s * amp, y]); s = -s; y += seg; }
    pts.push([cx, h]);
    var d = 'M ' + pts[0][0] + ' ' + pts[0][1];
    for (var i = 1; i < pts.length; i++) {
      var x0 = pts[i - 1][0], y0 = pts[i - 1][1], x1 = pts[i][0], y1 = pts[i][1], k = (y1 - y0) / 2;
      d += ' C ' + x0 + ' ' + (y0 + k) + ', ' + x1 + ' ' + (y1 - k) + ', ' + x1 + ' ' + y1;
    }
    base.setAttribute('d', d); line.setAttribute('d', d);
    var len = line.getTotalLength();
    line.style.strokeDasharray = len;
    var mp = { path: line, align: line, alignOrigin: [0.5, 0.5], autoRotate: true };
    if (reduce) {
      line.style.strokeDashoffset = 0;
      var still = gsap.to(robot, { motionPath: mp, paused: true, ease: 'none' });
      still.progress(0.015);
      railTweens.push(still);
      return;
    }
    line.style.strokeDashoffset = len;
    var st = { trigger: track, start: 'top 35%', end: 'bottom 75%', scrub: 0.7 };
    railTweens.push(gsap.to(line, { strokeDashoffset: 0, ease: 'none', scrollTrigger: st }));
    railTweens.push(gsap.to(robot, { motionPath: Object.assign({ start: 0.015, end: 1 }, mp), ease: 'none', scrollTrigger: Object.assign({}, st) }));
  }

  /* ---------- AprilTag cube (three.js) ---------- */
  var heroProg = 0;
  function initCube() {
    var host = document.getElementById('cube');
    if (!window.THREE) return;
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return; }
    if (!renderer || !renderer.getContext()) return;
    host.classList.add('webgl');
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    host.insertBefore(renderer.domElement, host.firstChild);
    var scene = new THREE.Scene();
    var cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    cam.position.set(0, 0, 8);
    function tagTex(rows) {
      var c = document.createElement('canvas'); c.width = c.height = 200;
      var g = c.getContext('2d');
      g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 200, 200);
      var cell = 200 / (rows.length + 2);
      g.fillStyle = '#121212';
      rows.forEach(function (r, i) { r.split('').forEach(function (b, j) { if (b === '1') g.fillRect((j + 1) * cell, (i + 1) * cell, cell + 0.5, cell + 0.5); }); });
      var t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; return t;
    }
    var side = new THREE.MeshLambertMaterial({ color: 0xD8D3C6 });
    var mats = [
      new THREE.MeshLambertMaterial({ map: tagTex(TAGS[1]) }),
      new THREE.MeshLambertMaterial({ map: tagTex(TAGS[2]) }),
      side, side,
      new THREE.MeshLambertMaterial({ map: tagTex(TAGS[0]) }),
      new THREE.MeshLambertMaterial({ map: tagTex(TAGS[3]) })
    ];
    var geo = new THREE.BoxGeometry(2, 2, 2);
    var cube = new THREE.Mesh(geo, mats);
    cube.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x121212 })));
    scene.add(cube);
    scene.add(new THREE.AmbientLight(0xffffff, 0.78));
    var dl = new THREE.DirectionalLight(0xffffff, 0.45); dl.position.set(3, 4, 5); scene.add(dl);
    cube.rotation.set(-0.38, 0.62, 0);

    function size() {
      var w = host.clientWidth, h = host.clientHeight;
      renderer.setSize(w, h, false);
      cam.aspect = w / h; cam.updateProjectionMatrix();
      renderer.render(scene, cam);
    }
    size();
    addEventListener('resize', size);
    if (reduce) return;

    var mx = 0, my = 0, spin = 0, visible = true;
    addEventListener('pointermove', function (e) { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);
    }
    (function frame() {
      if (visible) {
        spin += 0.004;
        var tx = -0.38 + my * 0.55 + heroProg * 0.9;
        var ty = 0.62 + spin + mx * 0.9 + heroProg * 1.8;
        cube.rotation.x += (tx - cube.rotation.x) * 0.06;
        cube.rotation.y += (ty - cube.rotation.y) * 0.06;
        var s = 1 - heroProg * 0.38;
        cube.scale.set(s, s, s);
        cube.position.y = -heroProg * 1.6;
        renderer.render(scene, cam);
      }
      requestAnimationFrame(frame);
    })();
  }

  /* ---------- detection cursor ---------- */
  function initCursor() {
    if (!fine || reduce || !G) return;
    var cur = document.getElementById('cursor'), lbl = cur.querySelector('.lbl');
    root.classList.add('has-cursor');
    var q = { x: gsap.quickTo(cur, 'x', { duration: 0.28, ease: 'power3' }), y: gsap.quickTo(cur, 'y', { duration: 0.28, ease: 'power3' }), w: gsap.quickTo(cur, 'width', { duration: 0.3, ease: 'power3' }), h: gsap.quickTo(cur, 'height', { duration: 0.3, ease: 'power3' }) };
    var mx = -100, my = -100, target = null;
    function update() {
      if (target) {
        var r = target.getBoundingClientRect(), p = 8;
        q.x(r.left - p); q.y(r.top - p); q.w(r.width + p * 2); q.h(r.height + p * 2);
      } else { q.x(mx - 18); q.y(my - 18); q.w(36); q.h(36); }
    }
    addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      var t = e.target && e.target.closest ? e.target.closest('[data-detect]') : null;
      if (t !== target) {
        target = t;
        if (t) { lbl.textContent = t.getAttribute('data-detect'); cur.classList.add('lock'); } else cur.classList.remove('lock');
      }
      update();
    }, { passive: true });
    addEventListener('scroll', update, { passive: true });
    document.addEventListener('pointerleave', function () { target = null; cur.classList.remove('lock'); mx = my = -100; update(); });
  }

  /* ---------- reveals, parallax, diagram ---------- */
  function initMotion() {
    if (!G || reduce) return;
    gsap.from('.hero .reveal', { y: 26, opacity: 0, duration: 0.8, stagger: 0.09, ease: 'power3.out', delay: 0.1 });
    ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom top', onUpdate: function (self) { heroProg = self.progress; } });

    document.querySelectorAll('[data-split]').forEach(function (h) {
      var words = h.textContent.trim().split(/\s+/);
      h.innerHTML = words.map(function (w) { return '<span class="w"><span class="wi">' + w.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</span></span>'; }).join(' ');
      gsap.from(h.querySelectorAll('.wi'), { yPercent: 70, opacity: 0.15, duration: 0.75, ease: 'power3.out', stagger: 0.06, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });

    document.querySelectorAll('.card, .route').forEach(function (c) {
      var idx = Array.prototype.indexOf.call(c.parentNode.children, c) % 4;
      var s = document.createElement('span'); s.className = 'scan'; s.setAttribute('aria-hidden', 'true'); c.appendChild(s);
      gsap.timeline({ delay: idx * 0.09, scrollTrigger: { trigger: c, start: 'top 88%', once: true } })
        .from(c, { y: 30, duration: 0.65, ease: 'power3.out' }, 0)
        .fromTo(s, { left: '0%', opacity: 1 }, { left: '100%', duration: 0.75, ease: 'power2.inOut' }, 0)
        .to(s, { opacity: 0, duration: 0.2 });
    });

    document.querySelectorAll('.row').forEach(function (r) {
      gsap.from(r, { x: -28, duration: 0.6, ease: 'power3.out', scrollTrigger: { trigger: r, start: 'top 90%', once: true } });
    });

    document.querySelectorAll('.media img').forEach(function (img) {
      gsap.fromTo(img, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.parentNode, start: 'top bottom', end: 'bottom 40%', scrub: true } });
    });
    document.querySelectorAll('.bignum').forEach(function (n) {
      gsap.to(n, { y: -90, ease: 'none', scrollTrigger: { trigger: n.parentNode, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    var nodes = document.querySelectorAll('#diagram .node');
    gsap.timeline({ repeat: -1, repeatDelay: 1.1, scrollTrigger: { trigger: '#diagram', start: 'top 80%', toggleActions: 'play pause resume pause' } })
      .to(nodes, { backgroundColor: '#FF4F1A', duration: 0.2, stagger: 0.32 })
      .to(nodes, { backgroundColor: '#FFFFFF', duration: 0.3, stagger: 0.32 }, 0.42)
      .set(nodes[nodes.length - 1], { backgroundColor: '#FF4F1A' });
  }

  /* ---------- lab feed (canvas) ---------- */
  function initFeed() {
    var cv = document.getElementById('feed'); if (!cv.getContext) return;
    var g = cv.getContext('2d'), w = 0, h = 0, visible = false, t0 = performance.now();
    var rows = TAGS[0];
    function size() {
      var r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function ease(x) { return x * x * (3 - 2 * x); }
    function draw(now) {
      var T = 6, t = reduce ? 4.6 : ((now - t0) / 1000) % T, p = t / T;
      g.fillStyle = '#1E1E1C'; g.fillRect(0, 0, w, h);
      var hz = h * 0.44;
      g.fillStyle = '#262624'; g.fillRect(0, 0, w, hz);
      g.strokeStyle = '#33332F'; g.lineWidth = 1;
      for (var i = -12; i <= 12; i++) { g.beginPath(); g.moveTo(w / 2 + i * w * 0.05, hz); g.lineTo(w / 2 + i * w * 0.5, h); g.stroke(); }
      var phase = (p * 5) % 1;
      for (var k = 0; k < 9; k++) { var yy = hz + (h - hz) * Math.pow((k + phase) / 9, 2.2); g.beginPath(); g.moveTo(0, yy); g.lineTo(w, yy); g.stroke(); }
      var e = ease(Math.min(p / 0.85, 1));
      var sz = h * (0.16 + 0.34 * e);
      var cx = w / 2 + Math.sin(p * Math.PI * 2.2) * w * 0.09 * (1 - e);
      var cy = hz - sz * 0.05;
      var m = sz * 0.12;
      g.fillStyle = '#F1EEE6'; g.fillRect(cx - sz / 2 - m, cy - sz / 2 - m, sz + 2 * m, sz + 2 * m);
      var cell = sz / 8; g.fillStyle = '#121212';
      rows.forEach(function (r, i) { r.split('').forEach(function (b, j) { if (b === '1') g.fillRect(cx - sz / 2 + j * cell, cy - sz / 2 + i * cell, cell + 0.6, cell + 0.6); }); });
      var pad = m + 10, L = Math.max(12, sz * 0.14), x0 = cx - sz / 2 - pad, y0 = cy - sz / 2 - pad, x1 = cx + sz / 2 + pad, y1 = cy + sz / 2 + pad;
      g.strokeStyle = '#FF4F1A'; g.lineWidth = 3; g.beginPath();
      g.moveTo(x0, y0 + L); g.lineTo(x0, y0); g.lineTo(x0 + L, y0);
      g.moveTo(x1 - L, y0); g.lineTo(x1, y0); g.lineTo(x1, y0 + L);
      g.moveTo(x0, y1 - L); g.lineTo(x0, y1); g.lineTo(x0 + L, y1);
      g.moveTo(x1 - L, y1); g.lineTo(x1, y1); g.lineTo(x1, y1 - L); g.stroke();
      g.strokeStyle = 'rgba(241,238,230,.55)'; g.lineWidth = 1; g.beginPath();
      g.moveTo(w / 2 - 14, h * 0.44); g.lineTo(w / 2 + 14, h * 0.44); g.moveTo(w / 2, h * 0.44 - 14); g.lineTo(w / 2, h * 0.44 + 14); g.stroke();
      g.strokeStyle = 'rgba(255,79,26,.7)'; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(w / 2, h * 0.44); g.lineTo(cx, cy); g.stroke(); g.setLineDash([]);
      if (p > 0.85) {
        g.font = '600 12px "JetBrains Mono", monospace'; var label = 'ALIGNED · DOCKING';
        var tw = g.measureText(label).width; g.fillStyle = '#FF4F1A'; g.fillRect(w / 2 - tw / 2 - 8, h - 70, tw + 16, 24);
        g.fillStyle = '#121212'; g.fillText(label, w / 2 - tw / 2, h - 53);
      }
    }
    function loop(now) { if (visible) draw(now); requestAnimationFrame(loop); }
    size(); draw(performance.now());
    addEventListener('resize', function () { size(); draw(performance.now()); });
    if (reduce) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    else visible = true;
    requestAnimationFrame(loop);
  }

  /* ---------- copy email ---------- */
  var copyBtn = document.getElementById('copy');
  copyBtn.addEventListener('click', function () {
    var text = document.getElementById('email').textContent.trim();
    function selectIt() { var r = document.createRange(); r.selectNodeContents(document.getElementById('email')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); copyBtn.textContent = 'Selected, press Ctrl+C'; }
    try {
      navigator.clipboard.writeText(text).then(function () { copyBtn.textContent = 'Copied'; setTimeout(function () { copyBtn.textContent = 'Copy email'; }, 1800); }, selectIt);
    } catch (e) { selectIt(); }
  });

  initCube();
  initFeed();
  initCursor();
  initMotion();
  buildRail();
  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { buildRail(); if (G) ScrollTrigger.refresh(); }, 250); });
  addEventListener('load', function () { buildRail(); if (G) ScrollTrigger.refresh(); });
})();
