# duvar

Düşüncelerini post-it notlar olarak duvara yapıştırdığın küçük bir blog. GitHub Pages ile ücretsiz yayınlanır.

---

## 1. İlk kurulum (bir kere yapılır, yaklaşık 10 dakika)

1. GitHub'da giriş yap. Sağ üstte **+** → **New repository**.
2. **Repository name** kısmına tam olarak şunu yaz: `KULLANICI_ADIN.github.io` (kendi kullanıcı adınla, küçük harf).
3. **Public** seçili olsun. "Add a README" kutusunu **işaretleme**. **Create repository**'ye bas.
4. Açılan sayfada **uploading an existing file** bağlantısına tıkla.
5. Bu klasörün **içindeki her şeyi** (klasörün kendisini değil, içindekileri: `_posts`, `_layouts`, `assets`, `index.html`... hepsini) sürükleyip sayfaya bırak. Yüklenmesini bekle.
6. Aşağıda **Commit changes**'e bas.
7. Repo sayfasında **Settings** → soldaki **Pages** → "Build and deployment" altında **Source: Deploy from a branch**, **Branch: main** ve **/ (root)** seç → **Save**.
8. 1-3 dakika sonra siten şu adreste yayında olur: `https://KULLANICI_ADIN.github.io`

> Not: Ücretsiz planda GitHub Pages için repo herkese açık (public) olmalı. Bu yüzden repoya yüklediğin her şeyi, taslaklar dahil, herkes görebilir. Yayınlamak istemediğin bir şeyi yazma.

---

## Siteden not yazmak (en kolayı)

1. **Giriş (her cihazda bir kere):** `https://ogzozbl.github.io/giris/` adresini aç. (Sitenin en altındaki küçük **·** işareti de buraya götürür.) "GitHub'da aç" düğmesine bas, açılan sayfada **Only select repositories** → `ogzozbl.github.io` seç, **Generate token**'a bas, çıkan kodu kopyalayıp giriş sayfasına yapıştır.
2. **Yazmak:** Giriş yaptığın cihazda duvarın en başında boş bir post-it durur. Yaz, renk seç ya da fotoğraf ekle, **yapıştır**. Not hemen duvarda belirir. Herkese görünmesi 1-2 dakika sürer.
3. **Silmek:** Notun sağ üstündeki **×** işareti.
4. **Çıkış:** Menüdeki **çıkış**.

Telefonda siteyi açıp **Paylaş → Ana Ekrana Ekle** dersen uygulama gibi açılır.

> Kod sadece o cihazın tarayıcısında saklanır ve sadece bu repoya yazabilir. Ziyaretçiler yazma kutusunu da silme düğmesini de görmez. Bir cihazı kaybedersen GitHub → Settings → Developer settings → Fine-grained tokens'tan `duvar` anahtarını silmen yeterli.

---

## 2. Yeni not yazmak (GitHub üzerinden, alternatif yol)

1. Repo sayfanda **Add file** → **Create new file**.
2. Dosya adı kutusuna şu biçimde yaz:

   `_posts/2026-11-18-sabah.md`

   Biçim: `_posts/YIL-AY-GÜN-kisa-isim.md`. Kısa ismde Türkçe karakter, büyük harf ve boşluk kullanma (`sabah-yuruyusu` gibi).
3. Dosyanın içine şunu yaz (üstteki iki çizgi satırı kalsın):

   ```
   ---
   ---
   Bugün 10 dakika yürüdüm. Hava soğuktu ama kafam berrak.
   ```

4. Aşağıda **Commit changes** → **Commit changes**.
5. 1-2 dakika sonra not duvarında görünür.

**Aynı gün birden fazla not eklersen**, sıralamanın doğru olması için başlığa saat ekleyebilirsin:

```
---
date: 2026-11-18 16:30:00 +0300
---
```

**Rengi kendin seçmek istersen** (yoksa otomatik seçilir):

```
---
renk: pembe
---
```

Seçenekler: `sari`, `pembe`, `mavi`, `yesil`, `kayisi`, `eflatun`.

Kısa notlar duvarda tam görünür. 80 kelimeden uzun yazılar kısaltılır ve "devamını oku" bağlantısı çıkar.

---

## 3. Fotoğraf ekleme

1. Repo sayfasında `assets` → `img` klasörüne gir.
2. **Add file** → **Upload files** ile fotoğrafı yükle. Dosya adı küçük harf ve boşluksuz olsun (`kutuphane.jpg`). Telefon fotoğrafları büyük olur; mümkünse 1 MB altına düşür, yoksa site yavaşlar.
3. Notunun başlığına şunu ekle:

   ```
   ---
   image: /assets/img/kutuphane.jpg
   image_alt: Kütüphanede pencere kenarındaki masa
   ---
   Bugünkü köşem.
   ```

   `image_alt`, fotoğrafın kısa bir tarifi. Ekran okuyucu kullananlar için önemli, boş da bırakabilirsin.

Fotoğraflı notlar bantla yapıştırılmış kağıt gibi görünür.

---

## 4. Düzenleme ve silme

- **Düzenlemek:** Notun dosyasını aç, sağ üstteki kalem simgesine tıkla, değiştir, Commit changes.
- **Silmek:** Notun dosyasını aç, çöp kutusu simgesine tıkla, Commit changes.
- Başlangıçtaki iki örnek notu (`_posts` klasöründe) istediğin zaman silebilirsin.

---

## 5. Görünümü değiştirmek

Her şey `assets/css/duvar.css` dosyasının en üstündeki "Ayarlar" bölümünde:

- **Renkler:** `--sari`, `--pembe` gibi satırlardaki renk kodlarını değiştir.
- **Yazı boyutu:** `--not-boyut`.
- **Duvar rengi:** `--duvar`.
- **Yazı tipini sade bir sans-serif yapmak** için: `--not-font` satırını `'DM Sans', system-ui, sans-serif` yap ve `_layouts/default.html` içindeki Google Fonts bağlantısının sonuna `&family=DM+Sans:wght@400;500;600` ekle.

Blog adı ve alt yazı: `_config.yml` içindeki `title` ve `tagline`. "Hakkında" sayfası: `hakkinda.md`.

---

## Sorun giderme

- **Site açılmıyor / 404:** Settings → Pages bölümünde yayının hazır olduğunu gösteren yeşil bir mesaj olmalı. İlk seferde 5 dakikaya kadar sürebilir.
- **Yeni not görünmüyor:** Repo sayfasında **Actions** sekmesine bak, "pages build and deployment" çalışıyorsa bekle, kırmızı hata varsa dosya adını ve üstteki `---` satırlarını kontrol et.
- **Not görünmüyor ama hata da yok:** Dosya adının `_posts/` klasöründe olduğunu ve `YIL-AY-GÜN-isim.md` biçiminde olduğunu kontrol et.
