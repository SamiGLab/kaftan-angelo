const collections = [
  {ref:'01', hu:'Női bőrkabátok', en:"Women's Leather Jackets", de:'Damen-Lederjacken', tr:'Kadın Deri Ceketler', ar:'سترات جلدية نسائية', huDesc:'Klasszikus és modern valódi bőrkabátok, üzletünkben felpróbálhatók.', enDesc:'Classic and modern genuine leather jackets to try on in store.', deDesc:'Klassische und moderne Echtlederjacken zum Anprobieren.', trDesc:'Mağazada deneyebileceğiniz klasik ve modern gerçek deri ceketler.', arDesc:'سترات جلد طبيعي كلاسيكية وعصرية للتجربة في المتجر.'},
  {ref:'02', hu:'Férfi bőrkabátok', en:"Men's Leather Jackets", de:'Herren-Lederjacken', tr:'Erkek Deri Ceketler', ar:'سترات جلدية رجالية', huDesc:'Valódi bőrdzsekik és bőrkabátok többféle fazonban és méretben.', enDesc:'Genuine leather jackets in a range of fits and sizes.', deDesc:'Echte Lederjacken in verschiedenen Schnitten und Größen.', trDesc:'Farklı kalıp ve bedenlerde gerçek deri ceketler.', arDesc:'سترات جلد طبيعي بقصات ومقاسات مختلفة.'},
  {ref:'03', hu:'Irhakabátok', en:'Shearling Jackets', de:'Lammfelljacken', tr:'Shearling Ceketler', ar:'سترات جلد الخروف', huDesc:'Meleg női és férfi irhadzsekik, irhakabátok szezonális választékban.', enDesc:'Warm shearling jackets and coats for women and men.', deDesc:'Warme Lammfelljacken und -mäntel für Damen und Herren.', trDesc:'Kadın ve erkek sıcak shearling ceket ve montlar.', arDesc:'سترات ومعاطف دافئة من جلد الخروف للنساء والرجال.'},
  {ref:'04', hu:'Szőrmekabátok', en:'Fur Jackets & Coats', de:'Pelzjacken & -mäntel', tr:'Kürk Ceket & Montlar', ar:'سترات ومعاطف فراء', huDesc:'Női szőrmekabátok, szőrmedzsekik és rókamellények.', enDesc:'Women’s fur jackets, coats and fox fur vests.', deDesc:'Pelzjacken, Pelzmäntel und Fuchspelzwesten für Damen.', trDesc:'Kadın kürk ceketleri, montları ve tilki kürkü yelekler.', arDesc:'سترات ومعاطف فراء نسائية وسترات من فرو الثعلب.'},
  {ref:'05', hu:'Bőr kiegészítők', en:'Leather Accessories', de:'Lederaccessoires', tr:'Deri Aksesuarlar', ar:'إكسسوارات جلدية', huDesc:'Bőrövek, bőr pénztárcák és válogatott kiegészítők.', enDesc:'Leather belts, wallets and selected accessories.', deDesc:'Ledergürtel, Geldbörsen und ausgewählte Accessoires.', trDesc:'Deri kemerler, cüzdanlar ve seçilmiş aksesuarlar.', arDesc:'أحزمة ومحافظ جلدية وإكسسوارات مختارة.'},
  {ref:'06', hu:'Egyedi bőrkabát rendelés', en:'Custom Leather Jackets', de:'Leder-Sonderanfertigungen', tr:'Özel Deri Ceket', ar:'سترات جلد حسب الطلب', huDesc:'Egyedi fazon, szín és méret személyes egyeztetés alapján.', enDesc:'Custom style, colour and sizing discussed in person.', deDesc:'Individueller Schnitt, Farbe und Größe nach Beratung.', trDesc:'Model, renk ve beden mağazada birlikte belirlenir.', arDesc:'تصميم ولون ومقاس مخصص بعد الاستشارة في المتجر.'}
];

const icons = [
  '<path d="M16 8 L11 13 L11 40 H37 L37 13 L32 8 L27 12 H21 Z"/><path d="M21 12 L18 24 L24 21 L30 24 L27 12"/>',
  '<path d="M17 8 L12 14 L12 40 H36 L36 14 L31 8 L26 13 L24 11 L22 13 Z"/><path d="M22 13 L19 27 L24 24 L29 27 L26 13"/>',
  '<path d="M15 9 Q12 12 13 18 L13 39 H35 L35 18 Q36 12 33 9 L28 13 L24 10 L20 13 Z"/><path d="M18 20 q2 -2 4 0 q2 -2 4 0 q2 -2 4 0" stroke-width="1.1"/>',
  '<path d="M14 10 Q10 13 12 20 L11 38 H37 L36 20 Q38 13 34 10" /><path d="M15 16 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0" stroke-width="1.1"/><path d="M15 24 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0 q3 -3 5 0" stroke-width="1.1"/>',
  '<rect x="9" y="21" width="30" height="7" rx="1.5"/><circle cx="24" cy="24.5" r="3"/><path d="M14 32 h8 v9 h-8 z"/><path d="M14 34 h8" stroke-width="1"/>',
  '<path d="M11 34 L34 11 L39 16 L16 39 Z"/><path d="M31 14 l3 3 M27 18 l3 3 M23 22 l3 3"/>'
];


function buildTagGridOld() {
  var html = '';
  collections.forEach(function(c, i){
    html += '<div class="tag-card"><div class="tag-hole"></div>' +
      '<span class="tag-ref mono">Ref. ' + c.ref + '</span>' +
      '<svg class="tag-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4">' + icons[i] + '</svg>' +
      '<h3><span class="lang-hu">' + c.hu + '</span><span class="lang-en">' + c.en + '</span><span class="lang-de">' + c.de + '</span><span class="lang-tr">' + c.tr + '</span><span class="lang-ar">' + c.ar + '</span></h3>' +
      '<p><span class="lang-hu">' + c.huDesc + '</span><span class="lang-en">' + c.enDesc + '</span><span class="lang-de">' + c.deDesc + '</span><span class="lang-tr">' + c.trDesc + '</span><span class="lang-ar">' + c.arDesc + '</span></p>' +
      '<div class="stitch stitch-edge"></div></div>';
  });
  return html;
}

function buildTagGridNew() {
  var html = collections.map(function(c, i) {
    return '<div class="tag-card"><div class="tag-hole"></div>' +
      '<span class="tag-ref mono">Ref. ' + c.ref + '</span>' +
      '<svg class="tag-icon" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.4">' + icons[i] + '</svg>' +
      '<h3><span class="lang-hu">' + c.hu + '</span><span class="lang-en">' + c.en + '</span><span class="lang-de">' + c.de + '</span><span class="lang-tr">' + c.tr + '</span><span class="lang-ar">' + c.ar + '</span></h3>' +
      '<p><span class="lang-hu">' + c.huDesc + '</span><span class="lang-en">' + c.enDesc + '</span><span class="lang-de">' + c.deDesc + '</span><span class="lang-tr">' + c.trDesc + '</span><span class="lang-ar">' + c.arDesc + '</span></p>' +
      '<div class="stitch stitch-edge"></div></div>';
  }).join('');
  return html;
}

function runBenchmark(name, fn) {
  const start = process.hrtime.bigint();
  for (let i = 0; i < 1000000; i++) {
    fn();
  }
  const end = process.hrtime.bigint();
  console.log(`${name}: ${(end - start) / 1000000n}ms`);
}

runBenchmark('Old (forEach + +=)', buildTagGridOld);
runBenchmark('New (map + join)', buildTagGridNew);
runBenchmark('Old (forEach + +=)', buildTagGridOld);
runBenchmark('New (map + join)', buildTagGridNew);
runBenchmark('Old (forEach + +=)', buildTagGridOld);
runBenchmark('New (map + join)', buildTagGridNew);
