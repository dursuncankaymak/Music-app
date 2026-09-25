'use strict';

// Web klasörüne (www/) üretilen dosyaları kopyalar:
// - services.js: servis listesinin tek kaynağı masaüstündeki renderer/services.js
// - capacitor.js: Capacitor çekirdeğinin tarayıcı paketi. Android'in enjekte
//   ettiği köprü tek başına Capacitor.registerPlugin sağlamaz; eklentilere
//   (Browser, AppLauncher) erişmek için bu paket gerekir.
const fs = require('fs');
const path = require('path');

const www = path.resolve(__dirname, '..', 'www');
const copies = [
  [path.resolve(__dirname, '..', '..', 'renderer', 'services.js'), 'services.js'],
  [require.resolve('@capacitor/core/dist/capacitor.js'), 'capacitor.js'],
];

for (const [source, name] of copies) {
  const target = path.join(www, name);
  fs.copyFileSync(source, target);
  console.log(`${name} kopyalandı → ${path.relative(process.cwd(), target)}`);
}
