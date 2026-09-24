# 🎵 Aria Music

YouTube Music, Spotify, SoundCloud, Deezer, TIDAL ve Apple Music'i **tek bir şık masaüstü arayüzünde** toplayan Electron uygulaması.

Uygulama yalnızca bir arayüzdür: müzik dosyası indirmez, hesap bilgisi saklamaz, hiçbir veriyi diske yazmaz.

## ✨ Özellikler

- **6 servis tek pencerede** — kenar çubuğundan tek tıkla geçiş
- **Modern, koyu temalı arayüz** — özel başlık çubuğu, karşılama ekranı, akıcı animasyonlar
- **Gizlilik öncelikli** — oturumlar (çerezler dahil) yalnızca **bellekte (RAM)** tutulur; uygulama kapanınca her şey silinir, diske hiçbir şey yazılmaz
- **Harici linkler sistem tarayıcısında** — servislerin açmak istediği yeni pencereler/dış bağlantılar Windows'taki varsayılan tarayıcında açılır
- **Medya tuşları** — klavyendeki ▶⏸ / ⏭ / ⏮ tuşları aktif servisi kontrol eder
- **Klavye kısayolları** — `Ctrl+1` … `Ctrl+6` ile servisler arasında geçiş
- **Gezinme araç çubuğu** — geri / ileri / yenile / sistem tarayıcısında aç
- Her servis **tembel yüklenir** (tıklayana kadar açılmaz) ve arka planda çalmaya devam eder

## 🔐 Giriş nasıl çalışıyor?

Tarayıcılar güvenlik gereği çerezlerini başka uygulamalarla **paylaşamaz** — bu yüzden Windows'taki tarayıcında yaptığın bir giriş uygulamaya aktarılamaz (bu, Spotify/Google dahil hiçbir uygulamada teknik olarak mümkün değildir).

Bunun yerine Aria Music şöyle çalışır:

1. Giriş, uygulamanın **içindeki görünümde** yapılır (uygulama kendini güncel bir Chrome olarak tanıttığı için Google girişi de sorunsuz çalışır).
2. Oturum bilgisi **yalnızca RAM'de** tutulur — `persist:` bölümü kullanılmaz, diske tek bayt yazılmaz.
3. Uygulamayı kapattığında oturum **tamamen yok olur**; bir sonraki açılışta istersen yeniden giriş yaparsın.
4. Servislerin dışarı açmak istediği her bağlantı (ör. "tarayıcıda aç", ödeme sayfaları) otomatik olarak **sistem tarayıcısına** yönlendirilir.

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
