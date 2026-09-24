'use strict';

// Servis listesinin tek kaynağı masaüstü uygulamasındaki renderer/services.js.
// Bu betik onu Android web klasörüne kopyalar; böylece iki uygulama hiçbir
// zaman farklı servis listeleriyle çalışmaz.
const fs = require('fs');
const path = require('path');

const source = path.resolve(__dirname, '..', '..', 'renderer', 'services.js');
const target = path.resolve(__dirname, '..', 'www', 'services.js');

fs.copyFileSync(source, target);
console.log(`services.js kopyalandı: ${path.relative(process.cwd(), target)}`);
