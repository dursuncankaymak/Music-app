# 🎵 Aria Music

YouTube Music, Spotify, SoundCloud, Deezer, TIDAL ve Apple Music'i **tek bir şık masaüstü arayüzünde** toplayan Electron uygulaması.

Uygulama yalnızca bir arayüzdür: müzik dosyası indirmez, hesap bilgisi saklamaz, hiçbir veriyi diske yazmaz.

## ✨ Özellikler

- **6 servis tek pencerede** — kenar çubuğundan tek tıkla geçiş
- **Modern, koyu temalı arayüz** — özel başlık çubuğu, karşılama ekranı, akıcı animasyonlar
- **Girişler hatırlanır** — bir kere giriş yaparsın, uygulama her açılışta seni hatırlar (istersen kapatılabilir, aşağıya bak)
- **DRM desteği** — Widevine içeren [castlabs Electron](https://github.com/castlabs/electron-releases) sayesinde Spotify, Apple Music ve TIDAL'daki korumalı içerik de çalar
- **Harici linkler sistem tarayıcısında** — servislerin açmak istediği yeni pencereler/dış bağlantılar Windows'taki varsayılan tarayıcında açılır
- **Arka planda çalmaya devam eder** — pencereyi kapattığında müzik çalıyorsa uygulama sistem tepsisine (saatin yanına) küçülür ve çalmayı sürdürür; tepsi menüsünden oynat/duraklat, sonraki/önceki parça ve çıkış yapılabilir. Müzik çalmıyorsa X normal şekilde kapatır.
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

## 📦 Windows kurulum dosyası

**En kolay yol — Releases sayfası:** Depoya her push'ta `.github/workflows/windows.yml` GitHub'ın Windows sunucusunda uygulamayı derler ve **Releases** sayfasına iki dosya ekler:

| Dosya | Ne işe yarar |
|---|---|
| `Aria-Music-Setup.exe` | Kurulum sihirbazı; Başlat menüsüne ekler (önerilen) |
| `Aria-Music-Portable.exe` | Kurulum gerektirmeyen tek dosya; USB'de taşınabilir |

En yeni sürümün sabit indirme bağlantıları:

```
https://github.com/dursuncankaymak/Music-app/releases/latest/download/Aria-Music-Setup.exe
https://github.com/dursuncankaymak/Music-app/releases/latest/download/Aria-Music-Portable.exe
```

İlk açılışta Windows SmartScreen "tanınmayan uygulama" uyarısı verebilir (uygulama bir kod imzalama sertifikasıyla imzalı değildir): *Ek bilgi → Yine de çalıştır*.

**Yerelde derlemek:**

```bash
npm install
npm run dist            # dist/ altında Setup + Portable exe
```

### 🔐 DRM (Widevine) ve EVS imzası

`npm start` ile çalıştırınca Spotify / Apple Music / TIDAL'ın korumalı içeriği doğrudan çalar; castlabs'in geliştirme ikilileri Widevine için imzalıdır. **Paketlenmiş exe'de** ise Widevine'ın yüklenebilmesi için paketin castlabs'in ücretsiz [EVS](https://github.com/castlabs/electron-releases/wiki/EVS) servisiyle imzalanması gerekir; aksi hâlde bu üç servis "korumalı içerik oynatılamıyor" der (YouTube Music, SoundCloud ve Deezer etkilenmez).

CI bunu otomatik yapar, tek yapman gereken hesap açıp iki gizli değer tanımlamak:

1. `pip install castlabs-evs` → `python -m castlabs_evs.account signup` ile ücretsiz hesap aç.
2. GitHub'da depo → **Settings → Secrets and variables → Actions → New repository secret**:
   `CASTLABS_EVS_ACCOUNT` (hesap adı) ve `CASTLABS_EVS_PASSWD` (şifre).
3. Actions sekmesinden **Windows Build**'i yeniden çalıştır. Bu andan itibaren her sürüm imzalı çıkar.

## 🗂 Proje yapısı

```
├── main.js              # Electron ana süreç: pencere, tepsi, medya tuşları, dış link yönlendirme
├── preload.js           # Güvenli IPC köprüsü (contextBridge)
├── renderer/
│   ├── index.html       # Arayüz iskeleti (başlık çubuğu, kenar çubuğu, görünümler)
│   ├── styles.css       # Koyu tema ve tüm görsel tasarım
│   ├── services.js      # Servis tanımları (URL, renk, ikon, medya tuşu seçicileri)
│   └── app.js           # Arayüz mantığı: sekme yönetimi, webview'ler, kısayollar
├── assets/tray.png      # Sistem tepsisi simgesi
├── build/icon.png       # Uygulama simgesi (electron-builder .ico'yu buradan üretir)
└── .github/workflows/
    └── windows.yml      # Her push'ta Windows Setup + Portable exe üretip Releases'a ekleyen CI
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
