# Aria Music — devir notu (yapay zekâ asistanı için)

Kullanıcı Türkçe konuşur; arayüz metinleri, yorumlar ve commit mesajları Türkçe.
Repo: github.com/dursuncankaymak/Music-app, çalışma dalı `claude/selam-ppzphq`.
Her push'ta `.github/workflows/windows.yml` Windows'ta derleyip `windows-v1.0.<n>` etiketiyle
Releases'a `Aria-Music-Setup.exe` ve `Aria-Music-Portable.exe` koyar. Son sürüm: **windows-v1.0.9**
(kod olarak v1.0.8 ile aynı; yalnızca açıklama metinleri değişti).

## Ne
YouTube Music, Spotify, SoundCloud, Deezer, TIDAL ve Apple Music'i tek pencerede `<webview>` ile
açan Electron masaüstü uygulaması. Backend yok, şifre/veri tutmaz.

## Dosyalar
- `main.js` — ana süreç: çerçevesiz pencere, tepsi, tek örnek kilidi, dış linkleri sistem
  tarayıcısına yönlendirme, giriş açılır pencerelerine (`AUTH_POPUP_HOSTS`) uygulama içinde izin,
  yazım denetimi kapalı, GPU hızlandırma ayarı (`userData/aria-settings.json`).
- `media-keys-win.js` — Windows medya tuşu kancaları (aşağıya bak).
- `preload.js` — `window.aria` köprüsü.
- `renderer/app.js` — webview yönetimi, uyku modu, medya tuşu yönlendirme, ayarlar (localStorage `aria.settings`).
- `renderer/services.js` — servisler; her biri için medya düğmesi CSS seçicileri.

## Bozulmaması gereken kararlar
- **castlabs Electron** (`castlabs/electron-releases#v32.3.3+wvcus`): Widevine DRM için.
- **User-agent taklidi yok**: Chrome UA taklidi Google girişini engelliyordu.
- Oturum: "Oturumları hatırla" açıkken `persist:<id>`, kapalıyken `inmemory-<id>` bölümü.
- Webview'ler `backgroundThrottling=no`; pencere görünürlüğü ana süreçten `window:visibility` IPC'siyle gelir.
- X: bir şey çalıyorsa tepsiye gizler, çalmıyorsa uygulamayı kapatır.
- **Site izolasyonu kapatılmayacak** (kullanıcı kararı).

## Uyku modu
- Sessiz arka plan servisinin webview'i 5 dk sonra kaldırılır (oturum kalır, tıklayınca yeniden açılır).
- **En son çalan servis (`mediaOwnerId`) duraklatılmış olsa bile uyutulmaz** (v1.0.6).
- Çöken webview (`render-process-gone`) otomatik yeniden yüklenir.

## Medya tuşları — geçmiş ve mevcut durum (ÖNEMLİ)
Kullanıcının bilgisayarı: **masaüstü PC, Razer Ornata klavye** (medya tuşları Fn+F).
1. v1.0.6'ya kadar: `globalShortcut.register('MediaPlayPause'…)`. Sorun: Electron, media key
   globalShortcut kaydında Chromium'un yerleşik medya tuşu desteğini (Windows SMTC) kapatıyor;
   uygulama önde değilken (oyun açıkken) tuşlar hiç çalışmadı.
2. v1.0.7: globalShortcut kaldırıldı → tuşlar Chromium'un SMTC entegrasyonuyla sayfanın
   `navigator.mediaSession`'ına gidiyor. **Kullanıcı doğruladı: bir kez elle çaldıktan sonra
   arka planda dahil çalışıyor.** Sorun: uygulama açılıp hiçbir şey çalmamışken medya oturumu
   olmadığından ilk basış boşa gidiyordu.
3. v1.0.8: `media-keys-win.js` — `koffi` (N-API FFI, native derleme gerekmez) ile
   - düşük seviye klavye kancası (WH_KEYBOARD_LL; VK_MEDIA_PLAY_PAUSE 0xB3, NEXT 0xB0, PREV 0xB1),
   - shell kancası (`RegisterShellHookWindow` + `hookWindowMessage`, HSHELL_APPCOMMAND),
   350 ms tekrar süzgeciyle. Tuşlar yutulmaz. Ana süreç `media:key` (`{fallback:true}`) gönderir;
   `renderer/app.js` bunu **yalnızca `mediaOwnerId` boşken** (hiçbir servis çalmamışken) uygular,
   aksi hâlde Windows SMTC zaten işler (çift tetiklemeyi önlemek için).
   `package.json`: `asarUnpack` koffi + `@koromix/*`, `npmRebuild: false`.
   **Gerçek Windows'ta henüz test edilmedi.** Kullanıcıdan beklenen test:
   (a) uygulamayı aç, Spotify'a gir, hiçbir şeye tıklamadan Fn+oynat;
   (b) müzik çalarken oyundayken Fn ileri/geri/durdur.
- Tepsi menüsündeki oynat/ileri/geri `sendMediaAction` → renderer → servis düğmesine tıklama yolunu kullanır.
- Medya tuşu hedefi: en son çalan servis, yoksa ekrandaki servis; o servis uyuyorsa arka planda
  açılır ve tuş, oynatıcı hazır olunca uygulanır (20 sn'ye kadar yeniden dener).
- YouTube Music yeni açıldığında çalma sırası boştur; Fn+oynat'ın başlatabileceği bir şey yoktur
  (servisin davranışı). Spotify son parçayı hatırlar.

## Olası sonraki adımlar (v1.0.8 çalışmazsa)
- `media-keys-win.js` içinde kancanın kurulup kurulmadığını ve tuş gelince ne olduğunu
  `userData` altına bir log dosyasına yaz; kullanıcıdan logu iste.
- Razer Synapse'te Fn tuşlarına makro atanmışsa tuşlar medya tuşu olarak gelmeyebilir.

## Geliştirme
`npm install && npm start`; `npm run dist` → `dist/` altında Setup + Portable exe (Windows'ta).
