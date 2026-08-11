
(function(){
'use strict';

const AR='ar', EN='en';
const exact = new Map(Object.entries({
  'أطلس الكسوف الشمسي الذكي':'Smart Solar Eclipse Atlas',
  'الحساب':'Calculate','الخريطة':'Map','النتائج':'Results','التقرير':'Report',
  'شاهد الكسوف كحدثٍ علمي حيّ، لا كجدول أرقام.':'Experience an eclipse as a live scientific event — not a table of numbers.',
  'محرك حسابي فلكي، خريطة ذكية، كرة أرضية ثلاثية الأبعاد، وذكاء جغرافي للمدن في تجربة بصرية واحدة.':'Astronomical computation, smart mapping, a 3D globe, and worldwide city intelligence in one interactive experience.',
  'مركز قيادة الكسوف':'Eclipse Command Center',
  'ابدأ باختيار الحدث والموقع. بعد نجاح الحل المحلي فقط تُفتح طبقات المسار والنتائج وImpact GIS.':'Choose an eclipse and observer location. Scientific path, results, and Impact GIS layers unlock only after a successful local solution.',
  'التاريخ':'Date','نوع الكسوف':'Eclipse Type','الأعظم UTC':'Greatest UTC','المقدار العالمي':'Global Magnitude',
  'اختيار الحدث':'Event Selection','السنة':'Year','الكسوف':'Eclipse',
  'JPL DE440: جارٍ التحقق من طبقة التدقيق المضمّنة…':'JPL DE440: verifying the embedded audit layer…',
  'WORLD_CITIES_SPATIAL_FINAL: جارٍ التحقق من قاعدة المدن…':'WORLD_CITIES_SPATIAL_FINAL: verifying the offline world-city database…',
  'موقع الراصد':'Observer Location','موقع سريع':'Quick Location','خط العرض °':'Latitude °','خط الطول °':'Longitude °','الارتفاع m':'Elevation m',
  'فرق التوقيت عن UTC':'UTC Offset','اسم الموقع في التقرير':'Location Name in Report','ابدأ الحساب العلمي':'Run Scientific Calculation','جاهز للحساب':'Ready to calculate',
  'المختبر الجغرافي الذكي':'Smart Geographic Laboratory','الخريطة الأساسية جاهزة':'Base map ready',
  '▱ خريطة 2D':'▱ 2D Map','◉ كرة 3D':'◉ 3D Globe','◉ مجال الكسوف':'◉ Eclipse Field','◐ الليل/النهار':'◐ Day/Night','⌖ مدن الكسوف':'⌖ Eclipse Cities','✦ الأعظم':'✦ Greatest',
  'اضغط على الخريطة لاختيار موقع':'Tap the map to choose a location','بانتظار الحساب':'Waiting for calculation','بانتظار الحساب…':'Waiting for calculation…',
  'المقدار المحلي عند الأعظم':'Local magnitude at maximum','خط المركز':'Centerline','حدود المسار':'Path limits','أعظم الكسوف':'Greatest eclipse','الراصد':'Observer',
  'قبل الحساب تظهر الخريطة كأساس جغرافي فقط؛ المسار والمجال العلمي ومدن الكسوف تظهر بعد الحل الناجح.':'Before calculation, only the geographic base map is shown. Eclipse path, scientific field, and impacted cities appear after a successful solution.',
  'مدن الكسوف المتأثرة':'Impacted Eclipse Cities','متأثرة هندسيًا':'Geometrically impacted','مرئية مبدئيًا':'Initially visible','كلي':'Total','حلقي':'Annular','جزئي':'Partial','الكل':'All','فوق الأفق':'Above horizon',
  'لا توجد نتيجة بعد. اضغط زر الحساب أولًا.':'No result yet. Run the calculation first.',
  'بنفسجي = كلي • برتقالي = حلقي • ذهبي = جزئي. اختيار المدينة ينفّذ الحل المحلي الكامل لها.':'Purple = total • Orange = annular • Gold = partial. Selecting a city runs the full local C1–C4 solution.',
  'النتيجة العلمية':'Scientific Result','النوع المحلي':'Local Type','المقدار':'Magnitude','الاحتجاب':'Obscuration','ارتفاع الشمس':'Sun Altitude',
  'التماس الأول':'First Contact','بداية المركزية':'Central Phase Begins','الأعظم المحلي':'Local Maximum','نهاية المركزية':'Central Phase Ends','التماس الرابع':'Fourth Contact',
  'ذكاء الدول والمدن':'Country & City Intelligence',
  'محرك GIS يرشّح المواقع جغرافيًا ثم يمررها إلى نفس الحل الفلكي المحلي؛ الخريطة ليست بديلًا عن الحساب العلمي.':'The GIS engine geographically prefilters locations, then passes them to the same local astronomical solver. The map is not a substitute for the scientific calculation.',
  'اكتشف الدول والمدن داخل المسار المركزي':'Discover Countries & Cities Inside the Central Path','بحث داخل مدن هذا الكسوف':'Search This Eclipse’s Cities','ترتيب المدن':'Sort Cities',
  'أفضلية الرصد العلمية':'Scientific observing score','أطول مدة مركزية':'Longest central duration','الأقرب إلى خط المركز':'Closest to centerline','أعلى ارتفاع للشمس':'Highest Sun altitude','عدد السكان':'Population',
  'أفضل مدن الرصد':'Top Observing Cities','المستكشف التاريخي للمدن 1550–2650':'Historical City Explorer 1550–2650',
  'ابحث عن مدينة ليحسب المحرك الكسوفات المركزية التي تمر بها ويعرض C1 • C2 • MAX • C3 • C4.':'Search for a city to calculate central eclipses passing over it and display C1 • C2 • MAX • C3 • C4.',
  'ابحث عن المدينة':'Search City','التقرير الذكي':'Smart Scientific Report','مشاركة':'Share','المنهج العلمي':'Scientific Method',
  'الحساب المحلي C1/C2/MAX/C3/C4 يعتمد عناصر Besselian المضمّنة، مع طبقة تدقيق مستقلة لهندسة الحدث مقابل JPL DE440 داخل إصدار التطبيق.':'Local C1/C2/MAX/C3/C4 circumstances use embedded Besselian elements, with an independent event-geometry audit against JPL DE440 in the app edition.',
  'طبقة المجال تبدأ بمعاينة سريعة ثم تُصقل تلقائيًا إلى شبكة أعلى دقة 6°×5° وتُعرض كرستر متصل ناعم بلا مربعات ظاهرة؛ طبقة الليل/النهار مستقلة ومخزنة مؤقتًا لتحسين أداء الهاتف. التقويم يولياني حتى 1582-10-04 وغريغوري من 1582-10-15.':'The field starts with a fast preview, then automatically refines to a higher-resolution 6°×5° grid and is rendered as a continuous smooth raster without visible square cells. Day/night is independently cached for mobile performance. Calendar policy: Julian through 1582-10-04 and Gregorian from 1582-10-15.',
  'إعداد وتطوير: الفيزيائي عمر الباز':'Created and developed by Physicist Omar Albaz',
  'اكتب مدينة أو دولة':'Type a city or country','مثال: Mosul / الموصل':'Example: Mosul / الموصل',
  'التسلسل الزمني للكسوف':'Eclipse contact timeline',
  'تم اختيار الحدث • اضغط':'Event selected • press',
  'للبدء':'to begin',
  'لا توجد بيانات':'No data','لا توجد نتيجة كسوف بعد.':'No eclipse result yet.',
  'غير مرئي':'Not visible','تحت الأفق':'Below horizon','غير مرئية فوق الأفق':'Not visible above the horizon',
  'الدولة':'Country','المدينة':'City','الحالة':'Status','المدة':'Duration','البعد عن المركز':'Centerline Distance','تقييم الرصد':'Observing Score',
  'نوع محلي':'Local Type','ارتفاع':'Elevation','سمت الشمس عند الأعظم':'Sun azimuth at maximum',
  'التقرير العلمي الذكي للكسوف الشمسي':'Smart Scientific Solar Eclipse Report','التقرير الكامل للكسوف الشمسي':'Full Solar Eclipse Report',
  'الموقع':'Location','الإحداثيات':'Coordinates','أعظم الكسوف عالميًا':'Global Greatest Eclipse','المدة المركزية الهندسية':'Geometric Central Duration','فترة الرؤية':'Visibility Window',
  'ΔT المستخدم':'ΔT Used','مصدر الظروف المحلية':'Local Circumstances Source','ملف الدفع':'Ephemeris File','بصمة DE440':'DE440 SHA-256','المحرك':'Engine','سياسة التقويم':'Calendar Policy','تدقيق DE440':'DE440 Audit','مسح المدن المتأثرة':'Impacted Cities Scan','قاعدة المدن':'City Database',
  'ارتفاع الشمس عند الأعظم':'Sun altitude at maximum','نسبة الاحتجاب':'Obscuration','المقدار المحلي':'Local Magnitude'
}));

const patterns = [
  [/^JPL DE440 مدمج داخل APK • ([\d,]+) بايت • تم تدقيق 2611 كسوفًا ضمن تغطيته الرسمية\.$/, 'JPL DE440 embedded in APK • $1 bytes • 2,611 eclipses audited within official coverage.'],
  [/^تحذير: ملف DE440 موجود لكن حجمه غير مطابق \(([^)]+) بايت\)\.$/, 'Warning: DE440 exists but its size does not match ($1 bytes).'],
  [/^تحذير: ملف JPL DE440 غير متاح داخل حزمة Android\.$/, 'Warning: JPL DE440 is not available inside the Android package.'],
  [/^JPL DE440 مضمّن في مشروع Android، وطبقة التدقيق المشتقة منه محمّلة في هذه المعاينة\.$/, 'JPL DE440 is bundled with the Android project; its derived audit layer is loaded in this preview.'],
  [/^WORLD_CITIES_SPATIAL_FINAL • ([\d,]+) مدينة\/تجمع • ([\d,]+) دولة\/إقليم • SQLite Offline • شبكة ([\d.]+)°\.$/, 'WORLD_CITIES_SPATIAL_FINAL • $1 cities/settlements • $2 countries/territories • Offline SQLite • $3° grid.'],
  [/^معاينة المتصفح: core-fallback • ([\d,]+) مدينة\. تطبيق Android يستخدم WORLD_CITIES_SPATIAL_FINAL عند توفر الجسر الأصلي\.$/, 'Browser preview: core-fallback • $1 cities. Android uses WORLD_CITIES_SPATIAL_FINAL when the native bridge is available.'],
  [/^الخريطة الأساسية جاهزة • لا توجد نتيجة قبل الحساب$/, 'Base map ready • no result before calculation'],
  [/^بانتظار الحساب • لا توجد نتائج أو مدن متأثرة عند بدء البرنامج\.$/, 'Waiting for calculation • no eclipse or impacted-city result is shown at startup.'],
  [/^جارٍ مسح المدن المتأثرة… (\d+)% • ([\d,]+) \/ ([\d,]+) مرشح$/, 'Scanning impacted cities… $1% • $2 / $3 candidates'],
  [/^Impact Layer جاهزة • ([\d,]+) مدينة مرئية مبدئيًا • فُحص ([\d,]+) مرشح من قاعدة ([\d,]+) سجل\.$/, 'Impact Layer ready • $1 initially visible cities • $2 candidates scanned from $3 records.'],
  [/^([\d,]+) مدينة$/, '$1 cities'],
  [/^كلي (\d+) • حلقي (\d+) • جزئي (\d+)$/, 'Total $1 • Annular $2 • Partial $3'],
  [/^وجدت (\d+) نتيجة مرشحة\. اختر المدينة المطلوبة\.$/, '$1 candidate matches found. Choose a city.'],
  [/^لم أجد مدينة مطابقة في قاعدة المدن المحملة حاليًا\.$/, 'No matching city was found in the currently loaded city database.'],
  [/^جارٍ تحليل المسار والمدن…$/, 'Analyzing path and cities…'],
  [/^تعذر المسح الجغرافي: (.+)$/, 'Geographic scan failed: $1'],
  [/^تعذر حساب تاريخ المدينة: (.+)$/, 'City history calculation failed: $1'],
  [/^ارتفاع الشمس ([\d.\-]+)°$/, 'Sun altitude $1°'],
  [/^تم إرسال الملف إلى مجلد التنزيلات\.$/, 'File sent to the Downloads folder.'],
  [/^تم حفظ الصورة في مجلد التنزيلات\.$/, 'Image saved to the Downloads folder.']
];

let lang = AR;
try{
  const saved = window.localStorage?.getItem('albaz-language');
  if(saved===AR || saved===EN) lang=saved;
}catch(_){/* persistence is optional */}

const nodeOriginal = new WeakMap();
const attrOriginal = new WeakMap();
const suppressedText = new WeakMap();
let applying=false;
let observer=null;

function translateRaw(value){
  if(lang===AR) return String(value??'');
  const raw=String(value??'');
  const lead=(raw.match(/^\s*/)||[''])[0], tail=(raw.match(/\s*$/)||[''])[0];
  const core=raw.slice(lead.length,raw.length-tail.length);
  if(exact.has(core)) return lead+exact.get(core)+tail;
  let out=core;
  for(const [rx,repl] of patterns){
    if(rx.test(out)){ out=out.replace(rx,repl); break; }
  }
  return lead+out+tail;
}

function setNodeValue(node,value){
  const target=String(value??'');
  if(node.nodeValue===target) return;
  suppressedText.set(node,target);
  node.nodeValue=target;
}

function translateTextNode(node,{capture=false}={}){
  if(!node || node.nodeType!==Node.TEXT_NODE) return;
  if(capture || !nodeOriginal.has(node)) nodeOriginal.set(node,node.nodeValue);
  const source=nodeOriginal.get(node) ?? node.nodeValue ?? '';
  setNodeValue(node,lang===AR?source:translateRaw(source));
}

function translateAttrs(el,{capture=false}={}){
  if(!el || el.nodeType!==Node.ELEMENT_NODE) return;
  let saved=attrOriginal.get(el);
  if(!saved){saved={};attrOriginal.set(el,saved);}
  for(const attr of ['placeholder','aria-label','title']){
    if(el.hasAttribute(attr) && (capture || saved[attr]===undefined)) saved[attr]=el.getAttribute(attr);
    if(saved[attr]!==undefined){
      const target=lang===AR?saved[attr]:translateRaw(saved[attr]);
      if(el.getAttribute(attr)!==target) el.setAttribute(attr,target);
    }
  }
}

function translateTree(root,{capture=false}={}){
  if(!root) return;
  applying=true;
  try{
    if(root.nodeType===Node.TEXT_NODE){
      translateTextNode(root,{capture});
      return;
    }
    if(root.nodeType!==Node.ELEMENT_NODE && root.nodeType!==Node.DOCUMENT_NODE && root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE) return;
    if(root.nodeType===Node.ELEMENT_NODE) translateAttrs(root,{capture});
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
    let n;
    while((n=walker.nextNode())){
      if(n.nodeType===Node.TEXT_NODE) translateTextNode(n,{capture});
      else translateAttrs(n,{capture});
    }
  }finally{
    applying=false;
  }
}

function updateButtons(){
  const ar=document.getElementById('langAr'),en=document.getElementById('langEn');
  ar?.classList.toggle('active',lang===AR);
  en?.classList.toggle('active',lang===EN);
  ar?.setAttribute('aria-pressed',String(lang===AR));
  en?.setAttribute('aria-pressed',String(lang===EN));
}

function apply(next,emit=true){
  const nextLang=next===EN?EN:AR;
  lang=nextLang;
  document.documentElement.lang=lang;
  document.documentElement.dir=lang===AR?'rtl':'ltr';
  document.body?.classList.toggle('lang-en',lang===EN);
  document.body?.classList.toggle('lang-ar',lang===AR);
  translateTree(document.body);
  updateButtons();
  try{window.localStorage?.setItem('albaz-language',lang);}catch(_){ }
  if(emit) window.dispatchEvent(new CustomEvent('albaz:languagechange',{detail:{lang}}));
  return lang;
}

function t(ar,en){return lang===EN?en:ar;}
function cityName(c){return lang===EN?(c?.name||c?.asciiName||c?.nameAr||''):(c?.nameAr||c?.name||'');}
function countryName(c){return lang===EN?(c?.countryName||c?.country||c?.countryCode||c?.iso3||''):(c?.countryAr||c?.countryName||c?.countryCode||c?.iso3||'');}
function localType(type,arFallback){
  if(lang===AR)return arFallback||({total:'كلي',annular:'حلقي',partial:'جزئي',none:'غير مرئي'}[type]||type||'—');
  return ({total:'Total',annular:'Annular',partial:'Partial',none:'Not visible'}[type]||type||'—');
}
function globalType(code,arFallback){
  if(lang===AR)return arFallback||code||'—';
  const c=String(code||'').trim().toUpperCase();
  const b=c[0]; return ({T:'Total',A:'Annular',H:'Hybrid',P:'Partial'}[b]||c||'—');
}

function bindButtons(){
  const ar=document.getElementById('langAr'),en=document.getElementById('langEn');
  if(ar && !ar.dataset.i18nBound){ar.dataset.i18nBound='1';ar.addEventListener('click',()=>apply(AR));}
  if(en && !en.dataset.i18nBound){en.dataset.i18nBound='1';en.addEventListener('click',()=>apply(EN));}
}

function startObserver(){
  observer?.disconnect();
  observer=new MutationObserver(records=>{
    if(applying) return;
    for(const r of records){
      if(r.type==='characterData'){
        const node=r.target;
        const suppressed=suppressedText.get(node);
        if(suppressed!==undefined && node.nodeValue===suppressed){
          suppressedText.delete(node);
          continue;
        }
        // App-generated text is authored in Arabic; capture the new source then translate to the active language.
        nodeOriginal.set(node,node.nodeValue);
        translateTextNode(node);
      }
      for(const n of r.addedNodes||[]) translateTree(n,{capture:true});
    }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
}

function init(){
  bindButtons();
  // Capture the initial Arabic UI exactly once, then apply the selected language.
  translateTree(document.body,{capture:true});
  apply(lang,false);
  startObserver();
}

window.ALBAZI18N={
  get lang(){return lang;},
  apply,t,cityName,countryName,localType,globalType,translateTree,translateRaw,
  setLanguage:apply
};
window.setALBAZLanguage=apply;

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();

