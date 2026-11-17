/* duvar — sahibi için yazma, silme ve giriş.
   Ziyaretçiler hiçbir şey görmez; anahtar sadece senin tarayıcında durur. */
(function () {
  var C = window.DUVAR || {};
  var API = 'https://api.github.com/repos/' + C.repo + '/contents/';
  var $ = function (id) { return document.getElementById(id); };

  function oku(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function yaz(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function okuJSON(k) { try { return JSON.parse(oku(k)) || []; } catch (e) { return []; } }

  var token = oku('duvar-anahtar');

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

  function hataMetni(e) {
    if (e.status === 401) return 'Anahtarın süresi dolmuş ya da geçersiz. Çıkış yapıp tekrar giriş yap.';
    if (e.status === 403 || e.status === 404) return 'Anahtarın bu siteye yazma izni yok. Giriş sayfasındaki adımları tekrar dene.';
    if (e.status === 409 || e.status === 422) return 'GitHub şu an meşgul, birkaç saniye sonra tekrar dene.';
    return 'Bağlantı kurulamadı. Yazdığın kaybolmadı, tekrar dene.';
  }

  function b64(str) {
    var bytes = new TextEncoder().encode(str), s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function kacis(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function paragraf(metin) {
    return metin.split(/\n\s*\n/).map(function (p) { return '<p>' + kacis(p).replace(/\n/g, '<br>') + '</p>'; }).join('');
  }

  // İstanbul saati
  function simdi() {
    var p = {};
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p;
  }
  var aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  // ---------- Her sayfada: giriş durumu ----------
  if (token) document.documentElement.classList.add('sahip');
  var cikis = $('cikisLink');
  if (cikis) cikis.addEventListener('click', function (e) {
    e.preventDefault();
    if (!confirm('Bu cihazda çıkış yapılsın mı? Tekrar yazmak için anahtarı yeniden yapıştırman gerekir.')) return;
    yaz('duvar-anahtar', null); location.href = C.ana;
  });

  // ---------- Giriş sayfası ----------
  var girisBtn = $('girisBtn');
  if (girisBtn) {
    if (token) { $('girisYapildi').hidden = false; $('girisForm').hidden = true; }
    girisBtn.addEventListener('click', function () {
      var t = $('anahtar').value.trim();
      var d = $('girisDurum');
      if (!t) { d.textContent = 'Önce anahtarı yapıştır.'; return; }
      d.textContent = 'kontrol ediliyor…'; girisBtn.disabled = true;
      istek('GET', 'https://api.github.com/repos/' + C.repo, null, t).then(function () {
        yaz('duvar-anahtar', t);
        location.href = C.ana;
      }).catch(function (e) {
        girisBtn.disabled = false;
        d.textContent = e.status === 401
          ? 'Bu anahtar çalışmadı. Tamamını kopyaladığından emin ol (github_pat_ ile başlar).'
          : 'Anahtar bu siteye erişemiyor. Oluştururken "Only select repositories" altında ' + C.repo.split('/')[1] + ' seçtiğinden emin ol.';
      });
    });
  }

  // ---------- Duvar ----------
  var duvar = $('duvar');
  if (!duvar || !token) return;

  var bekleyen = okuJSON('duvar-bekleyen');   // yeni yazılıp henüz yayınlanmamış notlar
  var silinen = okuJSON('duvar-silinen');     // silinip henüz yayından kalkmamış notlar
  var sayfadaki = {};
  duvar.querySelectorAll('[data-yol]').forEach(function (a) { sayfadaki[a.dataset.yol] = a; });

  // 15 dakikadan eski ya da artık yayında olan bekleyenleri temizle
  var simdiMs = Date.now();
  bekleyen = bekleyen.filter(function (b) { return !sayfadaki[b.yol] && simdiMs - b.zaman < 15 * 60e3; });
  silinen = silinen.filter(function (s) { return sayfadaki[s.yol] && simdiMs - s.zaman < 15 * 60e3; });
  yaz('duvar-bekleyen', JSON.stringify(bekleyen));
  yaz('duvar-silinen', JSON.stringify(silinen));
  silinen.forEach(function (s) { sayfadaki[s.yol].remove(); });

  var bos = duvar.querySelector('.empty'); if (bos) bos.remove();

  // --- Yazma kutusu: duvarın ilk notu ---
  var bp = simdi();
  var yazici = document.createElement('article');
  yazici.className = 'note yazici w3 c-sari';
  yazici.innerHTML =
    '<img class="foto" alt="" hidden>' +
    '<textarea rows="5" placeholder="aklından ne geçiyor?" aria-label="Yeni not"></textarea>' +
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
  duvar.insertBefore(yazici, duvar.firstChild);

  var ta = yazici.querySelector('textarea');
  var btn = yazici.querySelector('.btn-yapistir');
  var durum = yazici.querySelector('.yazici-durum');
  var onizleme = yazici.querySelector('.foto');
  var fotoInput = yazici.querySelector('input[type=file]');
  var fotoEtiket = yazici.querySelector('.foto-sec span');
  var renk = 'sari', foto = null;
  var RENKLER = ['c-sari', 'c-pembe', 'c-mavi', 'c-yesil', 'c-kayisi', 'c-eflatun'];

  ta.value = oku('duvar-taslak') || '';
  function guncelle() {
    btn.disabled = !ta.value.trim() && !foto;
    yaz('duvar-taslak', ta.value || null);
  }
  ta.addEventListener('input', guncelle);
  function boya() {
    RENKLER.forEach(function (c) { yazici.classList.remove(c); });
    yazici.classList.toggle('has-img', !!foto);
    if (!foto) yazici.classList.add('c-' + renk);
  }
  yazici.querySelectorAll('.renk').forEach(function (b) {
    b.addEventListener('click', function () {
      yazici.querySelectorAll('.renk').forEach(function (x) { x.classList.remove('secili'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('secili'); b.setAttribute('aria-checked', 'true');
      renk = b.dataset.renk; boya(); ta.focus();
    });
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
      var data = c.toDataURL('image/jpeg', 0.82);
      URL.revokeObjectURL(url);
      foto = { veri: data };
      onizleme.src = data; onizleme.hidden = false;
      fotoEtiket.textContent = '× foto';
      boya(); guncelle();
    };
    img.onerror = function () { fotoEtiket.textContent = '+ foto'; durum.textContent = 'Bu fotoğraf açılamadı.'; };
    img.src = url;
  });
  fotoEtiket.addEventListener('click', function (e) {
    if (!foto) return;
    e.preventDefault();
    foto = null; fotoInput.value = ''; onizleme.hidden = true; onizleme.removeAttribute('src');
    fotoEtiket.textContent = '+ foto'; boya(); guncelle();
  });

  // Bekleyen notu duvara çiz
  function bekleyenCiz(b, once) {
    var a = document.createElement('article');
    a.className = 'note w2 bekliyor ' + (b.foto ? 'has-img' : 'c-' + b.renk);
    a.dataset.yol = b.yol;
    a.innerHTML = (b.foto ? '<img class="foto" alt="" src="' + b.foto + '">' : '') + paragraf(b.metin) +
      '<div class="meta">yayınlanıyor… <span class="kucuk-not">(1-2 dk)</span></div>';
    duvar.insertBefore(a, once || yazici.nextSibling);
    return a;
  }
  bekleyen.slice().reverse().forEach(function (b) { bekleyenCiz(b); });

  btn.addEventListener('click', function () {
    var metin = ta.value.trim();
    if (!metin && !foto) return;
    var p = simdi();
    var gun = p.year + '-' + p.month + '-' + p.day;
    var ad = gun + '-' + p.hour + p.minute + p.second;
    var yol = '_posts/' + ad + '.md';
    var fotoYol = 'assets/img/' + ad + '.jpg';

    var bas = ['---', 'date: ' + gun + ' ' + p.hour + ':' + p.minute + ':' + p.second + ' +0300'];
    if (foto) bas.push('image: /' + fotoYol, 'image_alt: ""'); else bas.push('renk: ' + renk);
    bas.push('---');
    var govde = metin;
    if (/\{\{|\{%/.test(govde) && govde.indexOf('endraw') < 0) govde = '{' + '% raw %' + '}' + govde + '{' + '% endraw %' + '}';
    var icerik = bas.join('\n') + '\n' + govde + '\n';

    btn.disabled = true; btn.textContent = 'yapıştırılıyor…'; durum.textContent = '';
    var f = foto;
    var once = f ? istek('PUT', fotoYol, { message: 'fotoğraf: ' + ad, content: f.veri.split(',')[1] }) : Promise.resolve();
    once.then(function () {
      return istek('PUT', yol, { message: 'not: ' + ad, content: b64(icerik) });
    }).then(function () {
      var b = { yol: yol, metin: metin, renk: renk, zaman: Date.now() };
      // Fotoğrafın küçük önizlemesini sakla (sayfa yenilenirse görünsün)
      if (f) b.foto = f.veri.length < 400000 ? f.veri : '';
      bekleyen.push(b);
      try { yaz('duvar-bekleyen', JSON.stringify(bekleyen)); } catch (e) {}
      bekleyenCiz(b);
      ta.value = ''; yaz('duvar-taslak', null);
      foto = null; fotoInput.value = ''; onizleme.hidden = true; fotoEtiket.textContent = '+ foto';
      boya(); btn.textContent = 'yapıştır'; guncelle();
    }).catch(function (e) {
      btn.textContent = 'yapıştır'; btn.disabled = false;
      durum.textContent = hataMetni(e);
    });
  });

  // --- Silme ---
  Object.keys(sayfadaki).forEach(function (yol) {
    var a = sayfadaki[yol];
    if (!a.isConnected) return;
    var x = document.createElement('button');
    x.type = 'button'; x.className = 'sil'; x.title = 'bu notu sil'; x.setAttribute('aria-label', 'bu notu sil');
    x.textContent = '×';
    a.appendChild(x);
    x.addEventListener('click', function () {
      if (!confirm('Bu not silinsin mi? Geri alınamaz.')) return;
      a.classList.add('siliniyor');
      var dosyalar = [yol];
      if (a.dataset.foto && a.dataset.foto.indexOf('/assets/img/') === 0) dosyalar.push(a.dataset.foto.slice(1));
      // Dosyaları sırayla sil (aynı anda silmek GitHub'da çakışabilir)
      dosyalar.reduce(function (pr, d) {
        return pr.then(function () {
          return istek('GET', d + '?ref=main').then(function (j) {
            return istek('DELETE', d, { message: 'sil: ' + d, sha: j.sha });
          }).catch(function (e) { if (e.status === 404 && d !== yol) return; throw e; });
        });
      }, Promise.resolve()).then(function () {
        silinen.push({ yol: yol, zaman: Date.now() });
        yaz('duvar-silinen', JSON.stringify(silinen));
        a.remove();
      }).catch(function (e) {
        a.classList.remove('siliniyor');
        alert(hataMetni(e));
      });
    });
  });

  boya(); guncelle();
})();
