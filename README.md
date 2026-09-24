# 🎵 Aria Music

YouTube Music, Spotify, SoundCloud, Deezer, TIDAL ve Apple Music'i **tek bir şık masaüstü arayüzünde** toplayan Electron uygulaması.

Uygulama yalnızca bir arayüzdür: müzik dosyası indirmez, hesap bilgisi saklamaz, hiçbir veriyi diske yazmaz.

## ✨ Özellikler

- **6 servis tek pencerede** — kenar çubuğundan tek tıkla geçiş
- **Modern, koyu temalı arayüz** — özel başlık çubuğu, karşılama ekranı, akıcı animasyonlar
- **Girişler hatırlanır** — bir kere giriş yaparsın, uygulama her açılışta seni hatırlar (istersen kapatılabilir, aşağıya bak)
- **DRM desteği** — Widevine içeren [castlabs Electron](https://github.com/castlabs/electron-releases) sayesinde Spotify, Apple Music ve TIDAL'daki korumalı içerik de çalar
- **Harici linkler sistem tarayıcısında** — servislerin açmak istediği yeni pencereler/dış bağlantılar Windows'taki varsayılan tarayıcında açılır
- **Medya tuşları** — klavyendeki ▶⏸ / ⏭ / ⏮ tuşları aktif servisi kontrol eder
- **Klavye kısayolları** — `Ctrl+1` … `Ctrl+6` ile servisler arasında geçiş
- **Gezinme araç çubuğu** — geri / ileri / yenile / sistem tarayıcısında aç
- Her servis **tembel yüklenir** (tıklayana kadar açılmaz) ve arka planda çalmaya devam eder

## 🔐 Giriş ve oturumlar nasıl çalışıyor?

Giriş, uygulamanın **içindeki görünümde**, ilgili servisin kendi resmî giriş sayfasında yapılır (uygulama kendini güncel bir Chrome olarak tanıttığı için Google girişi de sorunsuz çalışır). Şifren hiçbir zaman uygulamanın kodundan geçmez; doğrudan servisin sunucusuna gider. Uygulamanın kendi backend'i yoktur.

Oturum saklama iki modda çalışır — kenar çubuğunun altındaki **"Oturumları hatırla"** anahtarıyla seçilir:

| Mod | Davranış |
|---|---|
| **Hatırla (varsayılan)** | Girişler bu bilgisayarda Chromium'un şifreli çerez deposunda saklanır (Windows'ta DPAPI ile senin kullanıcı hesabına kilitlidir). Uygulamayı her açtığında girişli hâlde başlarsın. |
| **Kapalı** | Oturumlar yalnızca bellekte (RAM) tutulur; uygulama kapanınca her şey silinir. |

Kenar çubuğundaki **"Oturumları temizle"** butonu tüm servislerdeki girişleri, çerezleri ve önbelleği tek tıkla siler.

Servislerin dışarı açmak istediği her bağlantı (ör. "tarayıcıda aç", ödeme sayfaları) otomatik olarak **sistem tarayıcısına** yönlendirilir.

## 🚀 Kurulum ve Çalıştırma

Gereksinim: [Node.js](https://nodejs.org) 18+

```bash
# Bağımlılıkları yükle
npm install

# Uygulamayı başlat
npm start
```

## 📦 Windows için paketleme

```bash
# Kurulum sihirbazı (NSIS) + taşınabilir exe
npm run dist

# Yalnızca taşınabilir tek exe
npm run dist:portable
```

Çıktılar `dist/` klasörüne yazılır.

> **DRM notu:** `npm start` ile geliştirme modunda Widevine (Spotify vb. korumalı içerik) doğrudan çalışır çünkü castlabs'in hazır ikili dosyaları imzalıdır. Paketlenmiş bir sürümü **dağıtacaksan** exe'nin castlabs'in ücretsiz [EVS servisi](https://github.com/castlabs/electron-releases/wiki/EVS) ile imzalanması gerekir; kendi bilgisayarında kullanmak için buna genelde gerek olmaz.

## 🗂 Proje yapısı

```
├── main.js              # Electron ana süreç: pencere, medya tuşları, dış link yönlendirme
├── preload.js           # Güvenli IPC köprüsü (contextBridge)
└── renderer/
    ├── index.html       # Arayüz iskeleti (başlık çubuğu, kenar çubuğu, görünümler)
    ├── styles.css       # Koyu tema ve tüm görsel tasarım
    ├── services.js      # Servis tanımları (URL, renk, ikon, medya tuşu seçicileri)
    └── app.js           # Arayüz mantığı: sekme yönetimi, webview'ler, kısayollar
```

## ➕ Yeni servis eklemek

`renderer/services.js` dosyasına yeni bir nesne eklemen yeterli:

```js
{
  id: 'ornek',
  name: 'Örnek Müzik',
  url: 'https://ornek.com',
  color: '#00c896',
  icon: `<svg viewBox="0 0 24 24">...</svg>`,
  controls: {
    playpause: ['.play-btn'],
    next: ['.next-btn'],
    prev: ['.prev-btn'],
  },
}
```

Kenar çubuğu, karşılama kartları ve `Ctrl+N` kısayolu otomatik güncellenir.

## ⚖️ Not

Bu uygulama listelenen müzik servislerinin resmî web oynatıcılarını gösteren bağımsız bir istemcidir; hiçbir servisle bağlantılı veya onlar tarafından onaylanmış değildir. İçerik oynatmak için ilgili servislerdeki kendi hesabını kullanırsın.
