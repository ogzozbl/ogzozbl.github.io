/* duvar — serbest yerleşim, sahibi için yazma / taşıma / silme, giriş.
   Ziyaretçiler sadece duvarı görür; anahtar sadece senin tarayıcında durur. */
(function () {
  var C = window.DUVAR || {};
  var API = 'https://api.github.com/repos/' + C.repo + '/contents/';
  var $ = function (id) { return document.getElementById(id); };
  var SERBEST_MIN = 760;          // bundan dar ekranda notlar alt alta dizilir
  var BEKLEME = 15 * 60e3;        // yayına çıkması beklenen değişiklikler bu süre sonra unutulur

  function oku(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function yaz(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function okuJSON(k, bos) { try { return JSON.parse(oku(k)) || bos; } catch (e) { return bos; } }

  var token = oku('duvar-anahtar');

  // ---------- GitHub ----------
  function istek(yontem, yol, govde, t) {
    return fetch(yol.indexOf('https://') === 0 ? yol : API + yol, {
      method: yontem,
      cache: 'no-store',
      headers: { 'Authorization': 'Bearer ' + (t || token), 'Accept': 'application/vnd.github+json' },
      body: govde ? JSON.stringify(govde) : undefined
    }).then(function (r) {
      if (r.ok) return r.status === 204 ? {} : r.json();
      return r.json().catch(function () { return {}; }).then(function (j) {
        var e = new Error(j.message || ('HTTP ' + r.status)); e.status = r.status; throw e;
      });
    });
  }
  // Yazma işlemleri sırayla gider (aynı anda iki kayıt GitHub'da çakışabilir)
  var kuyruk = Promise.resolve();
  function sirala(fn) { var p = kuyruk.then(fn); kuyruk = p.catch(function () {}); return p; }

  function hataMetni(e) {
    if (e.status === 401) return 'Giriş kodunun süresi dolmuş. Çıkış yapıp tekrar giriş yap.';
    if (e.status === 403 || e.status === 404) return 'Giriş kodunun bu siteye yazma izni yok. Giriş sayfasındaki adımları tekrar dene.';
    if (e.status === 409 || e.status === 422) return 'GitHub şu an meşgul, birkaç saniye sonra tekrar dene.';
    return 'Bağlantı kurulamadı. Tekrar dene.';
  }

  function b64(str) {
    var bytes = new TextEncoder().encode(str), s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64coz(s) {
    var bin = atob(s.replace(/\s/g, '')), u = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(u);
  }
  function kacis(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function paragraf(metin) {
    return metin.split(/\n\s*\n/).map(function (p) { return '<p>' + kacis(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }
  function simdi() {
    var p = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  var aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  // ---------- Her sayfada ----------
  if (token) document.documentElement.classList.add('sahip');
  var cikis = $('cikisLink');
  if (cikis) cikis.addEventListener('click', function (e) {
    e.preventDefault();
    if (!confirm('Bu cihazda çıkış yapılsın mı? Tekrar yazmak için giriş kodunu yeniden yapıştırman gerekir.')) return;
    yaz('duvar-anahtar', null); location.href = C.ana;
  });

  // ---------- Giriş sayfası ----------
  var girisBtn = $('girisBtn');
  if (girisBtn) {
    if (token) { $('girisYapildi').hidden = false; $('girisForm').hidden = true; }
    girisBtn.addEventListener('click', function () {
      var t = $('anahtar').value.trim(), d = $('girisDurum');
      if (!t) { d.textContent = 'Önce kodu yapıştır.'; return; }
      d.textContent = 'kontrol ediliyor…'; girisBtn.disabled = true;
      istek('GET', 'https://api.github.com/repos/' + C.repo, null, t).then(function () {
        yaz('duvar-anahtar', t); location.href = C.ana;
      }).catch(function (e) {
        girisBtn.disabled = false;
        d.textContent = e.status === 401
          ? 'Bu kod çalışmadı. Tamamını kopyaladığından emin ol (github_pat_ ile başlar).'
          : 'Kod bu siteye erişemiyor. Oluştururken "Only select repositories" altında ' + C.repo.split('/')[1] + ' seçtiğinden emin ol.';
      });
    });
  }

  // =====================================================================
  // DUVAR
  // =====================================================================
  var duvar = $('duvar');
  if (!duvar) return;

  var sahip = !!token;
  var bekleyen = okuJSON('duvar-bekleyen', []);   // yazılmış, yayına çıkmamış notlar
  var silinen = okuJSON('duvar-silinen', []);     // silinmiş, yayından kalkmamış notlar
  var tasinan = okuJSON('duvar-tasinan', {});     // taşınmış, yeni yeri yayına çıkmamış notlar
  var sayfadaki = {};
  duvar.querySelectorAll('[data-yol]').forEach(function (a) { sayfadaki[a.dataset.yol] = a; });

  if (sahip) {
    var t0 = Date.now();
    bekleyen = bekleyen.filter(function (b) { return !sayfadaki[b.yol] && t0 - b.zaman < BEKLEME; });
    silinen = silinen.filter(function (s) { return sayfadaki[s.yol] && t0 - s.zaman < BEKLEME; });
    Object.keys(tasinan).forEach(function (y) {
      var a = sayfadaki[y], k = tasinan[y];
      var yayinda = a && +a.dataset.x === k.x && +a.dataset.y === k.y;
      if (!a || yayinda || t0 - k.zaman > BEKLEME) delete tasinan[y];
    });
    kaydet();
    silinen.forEach(function (s) { sayfadaki[s.yol].remove(); delete sayfadaki[s.yol]; });
    Object.keys(tasinan).forEach(function (y) { sayfadaki[y].dataset.x = tasinan[y].x; sayfadaki[y].dataset.y = tasinan[y].y; });
    var bos = duvar.querySelector('.empty'); if (bos) bos.remove();
  }
  function kaydet() {
    yaz('duvar-bekleyen', JSON.stringify(bekleyen));
    yaz('duvar-silinen', JSON.stringify(silinen));
    yaz('duvar-tasinan', JSON.stringify(tasinan));
  }

  // ---------- Yerleşim ----------
  function serbestMi() { return window.innerWidth >= SERBEST_MIN; }
  function notlar() { return Array.prototype.filter.call(duvar.children, function (n) { return n.classList.contains('note'); }); }

  // Notun kendi tarihinden türeyen küçük bir kayma: otomatik yerleşenler ızgara gibi durmasın
  function tohum(n) { var s = n.dataset.yol || ''; var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997; return h; }

  function yerlestir() {
    var hepsi = notlar();
    if (!serbestMi()) {
      duvar.classList.remove('serbest'); duvar.style.height = '';
      hepsi.forEach(function (n) { n.style.left = n.style.top = n.style.zIndex = ''; });
      return;
    }
    duvar.classList.add('serbest');
    var W = duvar.clientWidth, dolu = [];
    function cakisir(r) {
      return dolu.some(function (d) { return r.x < d.x + d.w + 26 && r.x + r.w + 26 > d.x && r.y < d.y + d.h + 30 && r.y + r.h + 30 > d.y; });
    }
    function koy(n, x, y) {
      x = Math.max(0, Math.min(x, W - n.offsetWidth)); y = Math.max(0, y);
      n.style.left = x + 'px'; n.style.top = y + 'px';
      if (n.classList.contains('yazici')) return; // yazma kutusu diğer notları itmesin
      dolu.push({ x: x, y: y, w: n.offsetWidth, h: n.offsetHeight });
    }
    var serbestler = [], konumlular = [];
    hepsi.forEach(function (n) { (n.dataset.x != null && n.dataset.x !== '' ? konumlular : serbestler).push(n); });
    konumlular.forEach(function (n) { koy(n, +n.dataset.x / 100 * W, +n.dataset.y); });
    // Konumu olmayanlar (GitHub'dan yazılanlar, eski notlar): ilk boş yere
    serbestler.forEach(function (n) {
      var w = n.offsetWidth, h = n.offsetHeight, s = tohum(n), yer = null;
      for (var y = 0; !yer && y < 20000; y += 24) {
        for (var x = 0; x + w <= W; x += 24) {
          var r = { x: x + (s % 4) * 7, y: y + (s % 3) * 9, w: w, h: h };
          if (r.x + w <= W && !cakisir(r)) { yer = r; break; }
        }
      }
      yer = yer || { x: 0, y: 0 };
      koy(n, yer.x, yer.y);
    });
    // Yeni notlar eskilerin üstünde dursun
    hepsi.slice().reverse().forEach(function (n, i) { if (!n.classList.contains('yazici')) n.style.zIndex = i + 1; });
    var alt = dolu.reduce(function (m, d) { return Math.max(m, d.y + d.h); }, 0);
    hepsi.forEach(function (n) { if (n.classList.contains('yazici')) alt = Math.max(alt, n.offsetTop + n.offsetHeight); });
    duvar.style.height = Math.max(alt + (sahip ? 380 : 60), sahip ? 620 : 0) + 'px';
  }

  var yenileZaman;
  window.addEventListener('resize', function () { clearTimeout(yenileZaman); yenileZaman = setTimeout(yerlestir, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(yerlestir);
  // Fotoğraflar yüklenince notun boyu değişir: yeniden yerleştir
  duvar.querySelectorAll('img').forEach(function (im) {
    im.loading = 'eager';
    if (!im.complete) im.addEventListener('load', function () { clearTimeout(yenileZaman); yenileZaman = setTimeout(yerlestir, 50); });
  });

  if (!sahip) { yerlestir(); return; }

  // =====================================================================
  // SAHİP ARAÇLARI
  // =====================================================================
  var ipucu = $('ipucu');

  // ---------- Bekleyen notlar ----------
  function bekleyenCiz(b) {
    var a = document.createElement('article');
    a.className = 'note w2 bekliyor ' + (b.foto != null ? 'has-img' : 'c-' + b.renk) + ' r' + (b.zaman % 9);
    a.dataset.yol = b.yol;
    if (b.x != null) { a.dataset.x = b.x; a.dataset.y = b.y; }
    a.innerHTML = (b.foto ? '<img class="foto" alt="" src="' + b.foto + '">' : '') + paragraf(b.metin) +
      '<div class="meta">yayınlanıyor… <span class="kucuk-not">(1-2 dk)</span></div>';
    var ilkNot = duvar.querySelector('.note:not(.yazici)');
    duvar.insertBefore(a, ilkNot);
    return a;
  }
  bekleyen.slice().reverse().forEach(bekleyenCiz);

  // ---------- Yazma kutusu ----------
  var yazici = null;

  function yaziciAc(x, y) {
    if (yazici && yazici.querySelector('textarea').value.trim()) {
      if (x == null) return;
      yazici.dataset.x = x; yazici.dataset.y = y; yaziciKonumla(); return;
    }
    if (yazici) yazici.remove();
    var bp = simdi(), renk = 'sari', foto = null;
    var n = document.createElement('article');
    n.className = 'note yazici w2 c-sari';
    if (x != null) { n.dataset.x = x; n.dataset.y = y; }
    n.innerHTML =
      '<button type="button" class="vazgec" aria-label="vazgeç" title="vazgeç">×</button>' +
      '<img class="foto" alt="" hidden>' +
      '<textarea rows="4" placeholder="aklından ne geçiyor?" aria-label="Yeni not"></textarea>' +
      '<div class="yazici-alt">' +
        '<div class="renkler" role="radiogroup" aria-label="Renk">' +
          ['sari', 'pembe', 'mavi', 'yesil', 'kayisi', 'eflatun'].map(function (r, i) {
            return '<button type="button" class="renk c-' + r + (i === 0 ? ' secili' : '') + '" data-renk="' + r + '" role="radio" aria-checked="' + (i === 0) + '" aria-label="' + r + '"></button>';
          }).join('') +
        '</div>' +
        '<label class="foto-sec" title="fotoğraf ekle"><input type="file" accept="image/*" hidden><span>+ foto</span></label>' +
      '</div>' +
      '<button type="button" class="btn-yapistir" disabled>yapıştır</button>' +
      '<p class="yazici-durum" role="status" aria-live="polite"></p>' +
      '<div class="meta">' + (+bp.day) + ' ' + aylar[+bp.month - 1] + '</div>';
    duvar.insertBefore(n, duvar.firstChild);
    yazici = n;

    var ta = n.querySelector('textarea'), btn = n.querySelector('.btn-yapistir'), durum = n.querySelector('.yazici-durum');
    var onizleme = n.querySelector('.foto'), fotoInput = n.querySelector('input[type=file]'), fotoEtiket = n.querySelector('.foto-sec span');
    var RENKLER = ['c-sari', 'c-pembe', 'c-mavi', 'c-yesil', 'c-kayisi', 'c-eflatun'];

    ta.value = oku('duvar-taslak') || '';
    function guncelle() { btn.disabled = !ta.value.trim() && !foto; yaz('duvar-taslak', ta.value || null); }
    ta.addEventListener('input', guncelle);
    function boya() {
      RENKLER.forEach(function (c) { n.classList.remove(c); });
      n.classList.toggle('has-img', !!foto);
      if (!foto) n.classList.add('c-' + renk);
    }
    n.querySelectorAll('.renk').forEach(function (b) {
      b.addEventListener('click', function () {
        n.querySelectorAll('.renk').forEach(function (q) { q.classList.remove('secili'); q.setAttribute('aria-checked', 'false'); });
        b.classList.add('secili'); b.setAttribute('aria-checked', 'true');
        renk = b.dataset.renk; boya(); ta.focus();
      });
    });
    n.querySelector('.vazgec').addEventListener('click', function () {
      if (ta.value.trim() && !confirm('Yazdığın silinsin mi?')) return;
      yaz('duvar-taslak', null); n.remove(); yazici = null;
      if (!serbestMi()) yaziciAc(); else yerlestir();
    });
    fotoInput.addEventListener('change', function () {
      var f = this.files && this.files[0];
      if (!f) return;
      fotoEtiket.textContent = '…';
      var url = URL.createObjectURL(f), img = new Image();
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        foto = c.toDataURL('image/jpeg', 0.82);
        URL.revokeObjectURL(url);
        onizleme.src = foto; onizleme.hidden = false;
        fotoEtiket.textContent = '× foto';
        boya(); guncelle(); yaziciKonumla();
      };
      img.onerror = function () { fotoEtiket.textContent = '+ foto'; durum.textContent = 'Bu fotoğraf açılamadı.'; };
      img.src = url;
    });
    fotoEtiket.addEventListener('click', function (e) {
      if (!foto) return;
      e.preventDefault();
      foto = null; fotoInput.value = ''; onizleme.hidden = true; onizleme.removeAttribute('src');
      fotoEtiket.textContent = '+ foto'; boya(); guncelle(); yaziciKonumla();
    });

    btn.addEventListener('click', function () {
      var metin = ta.value.trim();
      if (!metin && !foto) return;
      var p = simdi(), gun = p.year + '-' + p.month + '-' + p.day;
      var ad = gun + '-' + p.hour + p.minute + p.second;
      var yol = '_posts/' + ad + '.md', fotoYol = 'assets/img/' + ad + '.jpg';
      var kx = n.dataset.x != null ? +n.dataset.x : null, ky = n.dataset.y != null ? +n.dataset.y : null;

      var bas = ['---', 'date: ' + gun + ' ' + p.hour + ':' + p.minute + ':' + p.second + ' +0300'];
      if (foto) bas.push('image: /' + fotoYol, 'image_alt: ""'); else bas.push('renk: ' + renk);
      if (kx != null) bas.push('x: ' + kx, 'y: ' + ky);
      bas.push('---');
      var govde = metin;
      if (/\{\{|\{%/.test(govde) && govde.indexOf('endraw') < 0) govde = '{' + '% raw %' + '}' + govde + '{' + '% endraw %' + '}';
      var icerik = bas.join('\n') + '\n' + govde + '\n';

      btn.disabled = true; btn.textContent = 'yapıştırılıyor…'; durum.textContent = '';
      var f = foto;
      sirala(function () {
        return (f ? istek('PUT', fotoYol, { message: 'fotoğraf: ' + ad, content: f.split(',')[1] }) : Promise.resolve())
          .then(function () { return istek('PUT', yol, { message: 'not: ' + ad, content: b64(icerik) }); });
      }).then(function () {
        var b = { yol: yol, metin: metin, renk: renk, zaman: Date.now(), x: kx, y: ky };
        if (f) b.foto = f.length < 400000 ? f : '';
        bekleyen.push(b); kaydet();
        yaz('duvar-taslak', null);
        n.remove(); yazici = null;
        bekleyenCiz(b);
        if (!serbestMi()) yaziciAc();
        yerlestir();
      }).catch(function (e) {
        btn.textContent = 'yapıştır'; btn.disabled = false;
        durum.textContent = hataMetni(e);
      });
    });

    boya(); guncelle(); yerlestir();
    if (x != null) ta.focus();
    return n;
  }
  function yaziciKonumla() { if (yazici) yerlestir(); }

  // Boş bir yere tıklayınca not orada açılır
  duvar.addEventListener('click', function (e) {
    if (e.target !== duvar || !serbestMi() || suruklendi) return;
    var r = duvar.getBoundingClientRect(), W = duvar.clientWidth;
    var x = e.clientX - r.left - 140, y = e.clientY - r.top - 40;
    x = Math.max(0, Math.min(x, W - 280));
    yaziciAc(Math.round(x / W * 1000) / 10, Math.max(0, Math.round(y)));
  });

  // ---------- Sürükleyip taşıma ----------
  var suruklendi = false;
  duvar.addEventListener('pointerdown', function (e) {
    if (!serbestMi() || e.button !== 0) return;
    var n = e.target.closest('.note');
    if (!n || n.classList.contains('bekliyor') || n.classList.contains('siliniyor')) return;
    if (e.target.closest('textarea, button, input, label')) return;
    var basX = e.clientX, basY = e.clientY;
    var solBas = parseFloat(n.style.left) || 0, ustBas = parseFloat(n.style.top) || 0;
    var hareket = false, W = duvar.clientWidth;

    function ilerle(ev) {
      var dx = ev.clientX - basX, dy = ev.clientY - basY;
      if (!hareket && Math.abs(dx) + Math.abs(dy) < 6) return;
      if (!hareket) { hareket = true; n.classList.add('tutuluyor'); n.style.zIndex = 9999; try { n.setPointerCapture(e.pointerId); } catch (x) {} }
      ev.preventDefault();
      var sol = Math.max(0, Math.min(solBas + dx, W - n.offsetWidth)), ust = Math.max(0, ustBas + dy);
      n.style.left = sol + 'px'; n.style.top = ust + 'px';
      var alt = ust + n.offsetHeight + 380;
      if (alt > duvar.offsetHeight) duvar.style.height = alt + 'px';
    }
    function birak() {
      document.removeEventListener('pointermove', ilerle);
      document.removeEventListener('pointerup', birak);
      document.removeEventListener('pointercancel', birak);
      if (!hareket) return;
      n.classList.remove('tutuluyor');
      suruklendi = true; setTimeout(function () { suruklendi = false; }, 0);
      var x = Math.round(parseFloat(n.style.left) / W * 1000) / 10, y = Math.round(parseFloat(n.style.top));
      var eskiX = n.dataset.x, eskiY = n.dataset.y;
      n.dataset.x = x; n.dataset.y = y;
      if (n.classList.contains('yazici')) { yerlestir(); return; }
      konumKaydet(n, x, y, eskiX, eskiY);
      yerlestir();
    }
    document.addEventListener('pointermove', ilerle);
    document.addEventListener('pointerup', birak);
    document.addEventListener('pointercancel', birak);
  });
  // Sürükleme bitince tıklama (bağlantı açma) olmasın
  duvar.addEventListener('click', function (e) { if (suruklendi) { e.preventDefault(); e.stopPropagation(); } }, true);

  function konumKaydet(n, x, y, eskiX, eskiY) {
    var yol = n.dataset.yol;
    n.classList.add('kaydediliyor');
    sirala(function () {
      return istek('GET', yol + '?ref=main').then(function (j) {
        var metin = b64coz(j.content);
        var m = metin.match(/^---\r?\n([\s\S]*?)\r?\n?---/);
        var satirlar = m ? m[1].split(/\r?\n/).filter(function (l) { return l.trim() && !/^(x|y)\s*:/.test(l); }) : [];
        satirlar.push('x: ' + x, 'y: ' + y);
        var yeni = '---\n' + satirlar.join('\n') + '\n---' + (m ? metin.slice(m[0].length) : '\n' + metin);
        return istek('PUT', yol, { message: 'taşı: ' + yol, content: b64(yeni), sha: j.sha });
      });
    }).then(function () {
      n.classList.remove('kaydediliyor');
      tasinan[yol] = { x: x, y: y, zaman: Date.now() }; kaydet();
    }).catch(function (e) {
      n.classList.remove('kaydediliyor');
      if (eskiX == null) { delete n.dataset.x; delete n.dataset.y; } else { n.dataset.x = eskiX; n.dataset.y = eskiY; }
      yerlestir();
      alert('Yeni yeri kaydedilemedi. ' + hataMetni(e));
    });
  }

  // ---------- Silme ----------
  Object.keys(sayfadaki).forEach(function (yol) {
    var a = sayfadaki[yol];
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'sil'; x.title = 'bu notu sil'; x.setAttribute('aria-label', 'bu notu sil');
    x.textContent = '×';
    a.appendChild(x);
    x.addEventListener('click', function () {
      if (!confirm('Bu not silinsin mi? Geri alınamaz.')) return;
      a.classList.add('siliniyor');
      var dosyalar = [yol];
      if (a.dataset.foto && a.dataset.foto.indexOf('/assets/img/') === 0) dosyalar.push(a.dataset.foto.slice(1));
      sirala(function () {
        return dosyalar.reduce(function (pr, d) {
          return pr.then(function () {
            return istek('GET', d + '?ref=main').then(function (j) {
              return istek('DELETE', d, { message: 'sil: ' + d, sha: j.sha });
            }).catch(function (e) { if (e.status === 404 && d !== yol) return; throw e; });
          });
        }, Promise.resolve());
      }).then(function () {
        silinen.push({ yol: yol, zaman: Date.now() }); kaydet();
        a.remove(); yerlestir();
      }).catch(function (e) {
        a.classList.remove('siliniyor');
        alert(hataMetni(e));
      });
    });
  });

  // ---------- Başlangıç ----------
  function moduAyarla() {
    if (ipucu) ipucu.hidden = !serbestMi();
    // Dar ekranda yazma kutusu her zaman en üstte hazır durur
    if (!serbestMi() && !yazici) yaziciAc();
  }
  window.addEventListener('resize', moduAyarla);
  moduAyarla();
  // Yarım kalmış bir taslak varsa masaüstünde de kutuyu aç
  if (serbestMi() && oku('duvar-taslak') && !yazici) yaziciAc(null, null);
  yerlestir();
})();
