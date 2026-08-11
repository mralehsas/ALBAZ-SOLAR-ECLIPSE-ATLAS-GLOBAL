
(function(){
'use strict';

const E = window.AlbazEclipse;
const G = window.AlbazGeoIntelligence;
const fallbackCities = window.ALBAZ_WORLD_CITIES || window.ALBAZ_CORE_CITIES || [];
const cityApi = window.ALBAZWorldCities || null;
let nativeCityMeta = null;
try{if(cityApi?.available?.())nativeCityMeta=cityApi.meta();}catch(_){nativeCityMeta=null;}
const nativeCityReady = !!(cityApi?.available?.() && nativeCityMeta && !nativeCityMeta.error && Number(nativeCityMeta.records)>0);
const worldCities = fallbackCities; // Browser preview fallback only; Android uses native SQLite when available.
const cityDbMeta = nativeCityReady ? {
  source:nativeCityMeta.source_family||'GeoNames cities1000',mode:'world-cities-spatial-final',count:Number(nativeCityMeta.records)||0,
  release:nativeCityMeta.release||'v0.1.9',gridDegrees:Number(nativeCityMeta.grid_degrees)||2,countries:Number(nativeCityMeta.countries_territories)||0
} : (window.ALBAZ_CITY_DB_META || {source:'unknown',mode:'core-fallback',count:worldCities.length});
const cityDbCount = nativeCityReady ? Number(cityDbMeta.count) : worldCities.length;
const cityIndex = G.buildCitySpatialIndex(worldCities,2);
const repo = E.buildRepository(window.ALBAZ_BESSELIAN_CSV);
const pathRows = E.parseCsv(window.ALBAZ_PATHS_CSV || '');
const world = window.ALBAZ_WORLD || {features:[]};
const de440Audit = window.ALBAZ_DE440_AUDIT || {};
const DE440_SIZE = 119799808;
const DE440_SHA256 = 'a4ce9bf9b3282becc9f4b2ac3cebe03a2ae7599981aabd7265fd8482fff7c4b5';
const $ = id => document.getElementById(id);
const defer = (fn,ms=0) => typeof setTimeout==='function' ? setTimeout(fn,ms) : fn();
const normLon = lon => { let x = Number(lon) || 0; while (x > 180) x -= 360; while (x <= -180) x += 360; return x; };

const isEn = () => window.ALBAZI18N?.lang === 'en';
const tx = (ar,en) => window.ALBAZI18N?.t?.(ar,en) ?? ar;
const cityName = c => window.ALBAZI18N?.cityName?.(c) || c?.nameAr || c?.name || '';
const countryName = c => window.ALBAZI18N?.countryName?.(c) || c?.countryAr || c?.countryName || c?.countryCode || c?.iso3 || '';
const localTypeLabel = (type,ar) => window.ALBAZI18N?.localType?.(type,ar) || ar || type || '—';
const globalTypeLabel = (code,ar) => window.ALBAZI18N?.globalType?.(code,ar) || ar || code || '—';
const presetEnglish = ['Madrid — Spain','Reykjavik — Iceland','Baghdad — Iraq','Samarra — Iraq','Makkah — Saudi Arabia','Jerusalem — Palestine','Cairo — Egypt','Abu Dhabi — United Arab Emirates','Algiers — Algeria','Rabat — Morocco','Custom coordinates'];
function presetLabel(i){return isEn()?(presetEnglish[i]||presets[i]?.[0]||''):(presets[i]?.[0]||'');}
function renderPresetOptions(){const sel=$('preset');if(!sel)return;const keep=Number(sel.value)||0;sel.innerHTML=presets.map((p,i)=>`<option value="${i}">${escapeHtml(presetLabel(i))}</option>`).join('');sel.value=String(Math.min(keep,presets.length-1));}

const presets = [
  ['مدريد — إسبانيا',40.4168,-3.7038,667,2],
  ['ريكيافيك — آيسلندا',64.1466,-21.9426,61,0],
  ['بغداد — العراق',33.3152,44.3661,34,3],
  ['سامراء — العراق',34.1980,43.8740,75,3],
  ['مكة المكرمة — السعودية',21.4225,39.8262,277,3],
  ['القدس — فلسطين',31.7683,35.2137,754,3],
  ['القاهرة — مصر',30.0444,31.2357,23,3],
  ['أبوظبي — الإمارات',24.4539,54.3773,27,4],
  ['الجزائر — الجزائر',36.7538,3.0588,25,1],
  ['الرباط — المغرب',34.0209,-6.8416,75,1],
  ['إحداثيات مخصصة',0,0,0,0]
];

let currentRow = null, currentResult = null, currentPaths = null, calculatedPathCache = new Map();
let currentGeoScan = null, selectedGeoCountry = 'ALL';
let historySelectedCity = null;
let viewMode = 'flat', globeLon = -15, globeLat = 40, drag = null;
let showScientificField = true, showNightLayer = true, showCityLayer = true;
const scientificFieldCache = new Map();
const scientificFieldPreviewCache = new Map();
const scientificFieldRasterCache = new Map();
const nightGridCache = new Map();
const nightRasterCache = new Map();
const impactCache = new Map();
let impactedCities = [], impactFilter = 'visible', impactedMarkerHits = [], impactScanToken = 0;
let impactScanState = {key:null,running:false,done:false,progress:0,processed:0,total:0,candidateCells:0,source:nativeCityReady?'WORLD_CITIES_SPATIAL_FINAL':'core-fallback'};
let calculationToken = 0, scientificFieldBuildToken = 0, mapDrawTimer = 0, mapDrawRaf = 0, resizeTimer = 0;
let scientificFieldBuildState = {key:null,running:false,progress:0,quality:'none'};
let globeDragging = false;

function emitCalcStage(message,progress,state='running'){
  try{window.dispatchEvent(new CustomEvent('albaz:calcstage',{detail:{message,progress:Math.max(0,Math.min(1,Number(progress)||0)),state}}));}catch(_){/* UI decoration only */}
}
function scheduleMapDraw(delay=0){
  if(delay>0){
    if(mapDrawTimer)return;
    mapDrawTimer=defer(()=>{mapDrawTimer=0;scheduleMapDraw(0);},Math.max(0,delay));
    return;
  }
  if(mapDrawRaf)return;
  const raf=window.requestAnimationFrame||((fn)=>defer(fn,0));
  mapDrawRaf=raf(()=>{mapDrawRaf=0;drawMap();});
}
function resizeMapCanvas(force=false){
  const c=$('mapCanvas');if(!c)return;
  const r=c.getBoundingClientRect();if(!(r.width>0))return;
  const mobile=(window.innerWidth||r.width)<820;
  const dpr=Math.max(1,Math.min(mobile?1.75:2,Number(window.devicePixelRatio)||1));
  const targetW=Math.max(mobile?620:900,Math.min(mobile?980:1600,Math.round(r.width*dpr)));
  const targetH=Math.max(336,Math.round(targetW*(780/1440)));
  if(force||Math.abs(c.width-targetW)>24||Math.abs(c.height-targetH)>16){c.width=targetW;c.height=targetH;scheduleMapDraw(0);}
}

const pathsByDate = new Map();
for(const r of pathRows){
  if(!pathsByDate.has(r.date)) pathsByDate.set(r.date,{});
  const g=pathsByDate.get(r.date);
  if(!g[r.kind]) g[r.kind]=[];
  g[r.kind].push({lon:Number(r.lon),lat:Number(r.lat),order:Number(r.order)});
}
for(const g of pathsByDate.values()) for(const k of Object.keys(g)) g[k].sort((a,b)=>a.order-b.order);

function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function fmt(x,d=3){return Number.isFinite(Number(x))?Number(x).toFixed(d):'—';}
function pct(x){return Number.isFinite(Number(x))?(Number(x)*100).toFixed(2)+'%':'—';}
function dur(sec){if(!(sec>0)) return '—';const s=Math.round(sec),m=Math.floor(s/60);return `${String(m).padStart(2,'0')}m ${String(s%60).padStart(2,'0')}s`;}
function clockOnly(s){return s==='—'?'—':String(s).slice(11);}
function utcOffsetLabel(z){const n=Number(z)||0;return `UTC${n>=0?'+':''}${n}`;}
function dateKey(row){return E.eventDate(row);}
function de440For(row){return row ? (de440Audit[dateKey(row)] || null) : null;}
function de440TypeCompatible(row,a){
  if(!a?.available)return true;
  const typ=E.baseType(row.eclipse_type), g=a.geometryClass;
  if(typ===g)return true;
  if(typ==='H'&&(g==='A'||g==='T'))return true;
  if(typ==='P'&&(g==='A'||g==='T')&&a.limbSensitive)return true;
  return false;
}
function runtimeDE440(row){
  const fallback=de440For(row);
  if(!window.AndroidBridge?.auditDE440Event)return fallback?{...fallback,source:'precomputed-de440-audit'}:null;
  try{
    const raw=JSON.parse(window.AndroidBridge.auditDE440Event(Number(row.julian_date)));
    if(!raw.available)return {...raw,source:'embedded-de440-runtime'};
    return {available:true,geometryClass:raw.geometryClass,dtSec:Number(raw.minDtSec),gamma:Number(raw.gamma),sepDeg:Number(raw.separationDeg),moonDistKm:Number(raw.moonDistanceKm),sunDistKm:Number(raw.sunDistanceKm),limbSensitive:!!raw.limbSensitive,axisKm:Number(raw.axisKm),coneMarginKm:Number(raw.coneMarginKm),source:'embedded-de440-runtime'};
  }catch(err){return {available:false,reason:'runtime_error:'+String(err),source:'embedded-de440-runtime'};}
}
function updateDE440Status(){
  const el=$('de440Status'); if(!el)return;
  let native=null;
  try{if(window.AndroidBridge?.getDE440Status) native=JSON.parse(window.AndroidBridge.getDE440Status());}catch(_){native=null;}
  if(native?.present && Number(native.sizeBytes)===DE440_SIZE){
    el.textContent=`JPL DE440 مدمج داخل APK • ${native.sizeBytes.toLocaleString()} بايت • تم تدقيق 2611 كسوفًا ضمن تغطيته الرسمية.`;
  }else if(native?.present){
    el.textContent=`تحذير: ملف DE440 موجود لكن حجمه غير مطابق (${native.sizeBytes} بايت).`;
  }else if(window.AndroidBridge){
    el.textContent='تحذير: ملف JPL DE440 غير متاح داخل حزمة Android.';
  }else{
    el.textContent='JPL DE440 مضمّن في مشروع Android، وطبقة التدقيق المشتقة منه محمّلة في هذه المعاينة.';
  }
}

function updateCityDbStatus(){
  const el=$('cityDbStatus');if(!el)return;
  if(nativeCityReady){
    el.textContent=`WORLD_CITIES_SPATIAL_FINAL • ${cityDbCount.toLocaleString()} مدينة/تجمع • ${Number(cityDbMeta.countries||0).toLocaleString()} دولة/إقليم • SQLite Offline • شبكة ${cityDbMeta.gridDegrees||2}°.`;
    el.classList.add('ok');
  }else{
    el.textContent=`معاينة المتصفح: core-fallback • ${worldCities.length.toLocaleString()} مدينة. تطبيق Android يستخدم WORLD_CITIES_SPATIAL_FINAL عند توفر الجسر الأصلي.`;
    el.classList.remove('ok');
  }
}


function init(){
  renderPresetOptions();
  $('preset').addEventListener('change',applyPreset);
  $('year').addEventListener('change',()=>{clampYear();loadEvents();});
  $('event').addEventListener('change',()=>{selectEvent();});
  $('calculate').addEventListener('click',calculate);
  $('lat').addEventListener('input',drawMap);$('lon').addEventListener('input',drawMap);
  $('scanCities').addEventListener('click',scanGeography);
  $('geoQuery').addEventListener('input',renderGeoCities);
  $('geoSort').addEventListener('change',renderGeoCities);
  $('findHistoryCity').addEventListener('click',findHistoryCities);
  $('historyCitySearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();findHistoryCities();}});
  const syncCanvasGestureMode=()=>{
    const mapCanvas=$('mapCanvas');
    if(!mapCanvas)return;
    const globe=viewMode==='globe';
    mapCanvas.classList.toggle('globe-gesture-lock',globe);
    if(mapCanvas.style)mapCanvas.style.touchAction=globe?'none':'pan-y pinch-zoom';
  };
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');viewMode=b.dataset.view;syncCanvasGestureMode();drawMap();}));
  $('fieldToggle').onclick=()=>{showScientificField=!showScientificField;$('fieldToggle').classList.toggle('active',showScientificField);$('fieldLegend').classList.toggle('hidden',!showScientificField);drawMap();};
  $('nightToggle').onclick=()=>{showNightLayer=!showNightLayer;$('nightToggle').classList.toggle('active',showNightLayer);drawMap();};
  $('citiesToggle').onclick=()=>{showCityLayer=!showCityLayer;$('citiesToggle').classList.toggle('active',showCityLayer);drawMap();};
  document.querySelectorAll('[data-impact-filter]').forEach(b=>b.addEventListener('click',()=>{impactFilter=b.dataset.impactFilter||'visible';document.querySelectorAll('[data-impact-filter]').forEach(x=>x.classList.toggle('active',x===b));renderImpactConsole();drawMap();}));
  $('focusGreatest').onclick=()=>{if(!currentRow||!currentResult)return;const es=E.eventSummary(currentRow);globeLon=Number(es.greatestLon)||0;globeLat=Math.max(-75,Math.min(75,Number(es.greatestLat)||0));viewMode='globe';document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x.dataset.view==='globe'));syncCanvasGestureMode();drawMap();};
  $('saveJson').onclick=saveJson;$('saveCsv').onclick=saveCsv;$('saveHtml').onclick=saveHtml;$('savePng').onclick=savePng;$('printPdf').onclick=printPdf;$('shareReport').onclick=shareReport;
  const canvas=$('mapCanvas');
  const beginGlobeDrag=e=>{
    if(viewMode!=='globe'||e.pointerType==='mouse'&&e.button!==0)return;
    e.preventDefault?.();
    drag={x:e.clientX,y:e.clientY,lon:globeLon,lat:globeLat,pointerId:e.pointerId,active:true};
    globeDragging=true;
    try{canvas.setPointerCapture?.(e.pointerId);}catch(_){ }
  };
  const moveGlobeDrag=e=>{
    if(!drag||viewMode!=='globe'||e.pointerId!==drag.pointerId)return;
    e.preventDefault?.();
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    globeLon=drag.lon-dx*.35;
    globeLat=Math.max(-80,Math.min(80,drag.lat+dy*.25));
    scheduleMapDraw(0);
  };
  const stopGlobeDrag=e=>{
    if(drag&&e&&e.pointerId!=null&&e.pointerId!==drag.pointerId)return;
    if(drag){try{canvas.releasePointerCapture?.(drag.pointerId);}catch(_){ }}
    drag=null;globeDragging=false;scheduleMapDraw(0);
  };
  canvas.addEventListener('pointerdown',beginGlobeDrag,{passive:false});
  canvas.addEventListener('pointermove',moveGlobeDrag,{passive:false});
  canvas.addEventListener('click',selectNearestCityFromFlatMap);
  canvas.addEventListener('pointerup',stopGlobeDrag,{passive:false});
  canvas.addEventListener('pointercancel',stopGlobeDrag,{passive:false});
  canvas.addEventListener('lostpointercapture',stopGlobeDrag);
  syncCanvasGestureMode();
  window.addEventListener?.('resize',()=>{if(resizeTimer)clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{resizeTimer=0;resizeMapCanvas(true);},120);},{passive:true});
  window.addEventListener?.('albaz:languagechange',()=>{
    const presetIndex=Number($('preset')?.value)||0,eventIndex=Number($('event')?.value)||0;
    renderPresetOptions();if($('preset'))$('preset').value=String(presetIndex);
    if(presetIndex<presets.length-1 && $('placeName'))$('placeName').value=presetLabel(presetIndex);
    const events=repo.eventsForYear(Number($('year').value));
    $('event').innerHTML=events.map((r,i)=>`<option value="${i}">${String(r.month).padStart(2,'0')}-${String(r.day).padStart(2,'0')} • ${globalTypeLabel(r.eclipse_type,E.typeCodeToArabic(r.eclipse_type))} • Saros ${escapeHtml(r.saros)}</option>`).join('');
    if(events.length)$('event').value=String(Math.min(eventIndex,events.length-1));
    updateDE440Status();updateCityDbStatus();renderEventMeta(!!currentResult);
    if(currentResult){renderResults();renderReport();renderImpactConsole();if(currentGeoScan)renderGeoScan();drawMap();}
  });
  resizeMapCanvas(true);loadEvents(); applyPreset(); updateDE440Status(); updateCityDbStatus();
}

function clampYear(){let y=Math.round(Number($('year').value)||2026);y=Math.max(1550,Math.min(2650,y));$('year').value=y;}
function loadEvents(){
  const y=Number($('year').value);const events=repo.eventsForYear(y);$('event').innerHTML=events.map((r,i)=>`<option value="${i}">${String(r.month).padStart(2,'0')}-${String(r.day).padStart(2,'0')} • ${globalTypeLabel(r.eclipse_type,E.typeCodeToArabic(r.eclipse_type))} • Saros ${escapeHtml(r.saros)}</option>`).join('');
  if(!events.length){$('event').innerHTML=`<option>${tx('لا توجد بيانات','No data')}</option>`;currentRow=null;return;}
  if(y===2026){const idx=events.findIndex(r=>Number(r.month)===8&&Number(r.day)===12);if(idx>=0)$('event').value=String(idx);}
  selectEvent();
}
function resetImpactState(){
  impactScanToken++;
  impactedCities=[];
  impactScanState={key:null,running:false,done:false,progress:0,processed:0,total:0,candidateCells:0,source:nativeCityReady?'WORLD_CITIES_SPATIAL_FINAL':'core-fallback'};
  renderImpactConsole();
}
function selectEvent(){
  // Changing the event cancels any pending progressive layer build cleanly.
  calculationToken++;scientificFieldBuildToken++;
  emitCalcStage(tx('جاهز للحساب','Ready to calculate'),0,'idle');
  const events=repo.eventsForYear(Number($('year').value));
  currentRow=events[Number($('event').value)||0]||events[0];
  currentResult=null;currentGeoScan=null;selectedGeoCountry='ALL';currentPaths=null;
  resetImpactState();
  $('resultsPanel').classList.add('hidden');$('geoPanel').classList.add('hidden');$('reportPanel').classList.add('hidden');$('mapPanel').classList.remove('hidden');
  $('geoCountries').innerHTML='';$('geoTop').innerHTML='';$('geoCities').innerHTML='';$('geoQuery').value='';
  if(!currentRow){renderEventMeta(false);drawMap();return;}
  globeLon=Number($('lon').value)||0;globeLat=Math.max(-65,Math.min(65,Number($('lat').value)||20));
  renderEventMeta(false);drawMap();
}
function renderEventMeta(computed=false){
  if(!currentRow){$('eventMeta').innerHTML='';for(const id of ['atlasKpiDate','atlasKpiType','atlasKpiGreatest','atlasKpiMagnitude'])$(id).textContent='—';$('liveEvent').textContent='—';return;}
  const s=E.eventSummary(currentRow);
  if(!computed){
    $('eventMeta').innerHTML=`<span class="chip">${tx('تم اختيار الحدث • اضغط','Event selected • press')} <strong>${tx('احسب الظروف المحلية','Run local circumstances')}</strong> ${tx('لبدء الحل العلمي وإظهار المسار وImpact GIS.','to run the scientific solution and reveal the eclipse path and Impact GIS.')}</span>`;
    $('atlasKpiDate').textContent='—';$('atlasKpiType').textContent='—';$('atlasKpiGreatest').textContent='—';$('atlasKpiMagnitude').textContent='—';$('liveEvent').textContent='—';
    $('mapStatus').textContent=tx('الخريطة الأساسية جاهزة • لا توجد نتيجة قبل الحساب','Base map ready • no result before calculation');
    return;
  }
  const a=de440For(currentRow);
  const typeLabel=globalTypeLabel(currentRow.eclipse_type,s.typeAr);const chips=[`${tx('التاريخ','Date')} <strong>${s.date}</strong>`,`${tx('النوع','Type')} <strong>${typeLabel}</strong>`,`${tx('الأعظم UTC','Greatest UTC')} <strong>${clockOnly(s.greatestUTC)}</strong>`,`${tx('المقدار العالمي','Global magnitude')} <strong>${fmt(s.magnitude,5)}</strong>`,`Saros <strong>${escapeHtml(s.saros)}</strong>`,`ΔT <strong>${fmt(s.deltaTSeconds,1)} s</strong>`];
  if(a?.available) chips.push(`DE440 <strong>✓ ${a.geometryClass}</strong> • Δمحور ${fmt(a.dtSec,1)} s`);
  else if(a && !a.available) chips.push('DE440 <strong>خارج التغطية</strong>');
  $('eventMeta').innerHTML=chips.map(x=>`<span class="chip">${x}</span>`).join('');
  $('atlasKpiDate').textContent=s.date;$('atlasKpiType').textContent=typeLabel;$('atlasKpiGreatest').textContent=clockOnly(s.greatestUTC)+' UTC';$('atlasKpiMagnitude').textContent=fmt(s.magnitude,5);$('liveEvent').textContent=`${s.date} • ${typeLabel} • Saros ${s.saros}`;
}
function applyPreset(){const i=Number($('preset').value)||0,p=presets[i];if(!p)return;$('placeName').value=presetLabel(i);$('lat').value=p[1];$('lon').value=p[2];$('alt').value=p[3];$('tz').value=p[4];drawMap();}

function calculate(){
  const token=++calculationToken;
  $('calcError').classList.add('hidden');
  emitCalcStage(tx('بدء الحساب العلمي…','Starting scientific calculation…'),.05,'running');
  // Give WebView one frame to paint the progress state before entering the numerical solver.
  defer(()=>performCalculation(token),18);
}
function performCalculation(token){
  try{
    if(token!==calculationToken)return;
    if(!currentRow)throw new Error(tx('اختر كسوفًا أولًا.','Choose an eclipse first.'));
    emitCalcStage(tx('حل الظروف المحلية C1–C4…','Solving local C1–C4 circumstances…'),.16,'running');
    const result=E.calculateLocal(currentRow,Number($('lat').value),Number($('lon').value),Number($('alt').value),Number($('tz').value));
    if(token!==calculationToken)return;
    currentResult=result;

    emitCalcStage(tx('تدقيق هندسة الحدث مقابل DE440…','Auditing event geometry against DE440…'),.34,'running');
    const d440=runtimeDE440(currentRow);
    if(window.AndroidBridge && d440 && !d440.available && String(d440.reason||'').startsWith('runtime_error:')) throw new Error(tx('فشل قراءة ملف JPL DE440 المدمج: ','Failed to read embedded JPL DE440 file: ')+d440.reason);
    if(d440?.available && !de440TypeCompatible(currentRow,d440)) throw new Error(isEn()?`DE440 scientific gate failed: catalog class ${E.baseType(currentRow.eclipse_type)} does not match DE440 geometry ${d440.geometryClass}.`:`فشل بوابة DE440 العلمية: تصنيف الكتالوج ${E.baseType(currentRow.eclipse_type)} لا يطابق هندسة DE440 ${d440.geometryClass}.`);
    currentResult.de440Verification=d440;
    currentPaths=pathsByDate.get(dateKey(currentRow))||null;
    const needCalculatedPath=!currentPaths?.center && ['A','T','H'].includes(E.baseType(currentRow.eclipse_type));

    globeLon=currentResult.globalGreatestLon;globeLat=Math.max(-65,Math.min(65,currentResult.globalGreatestLat));
    // Critical UX rule: show the local scientific result BEFORE any expensive global map/GIS work.
    renderEventMeta(true);renderResults();renderReport();drawMap();
    $('resultsPanel').classList.remove('hidden');$('geoPanel').classList.remove('hidden');$('mapPanel').classList.remove('hidden');$('reportPanel').classList.remove('hidden');
    $('geoStats').textContent=['A','T','H'].includes(E.baseType(currentRow.eclipse_type))
      ? (isEn()?`Local solution ready • global city layer will prepare progressively • ${cityDbCount.toLocaleString()} records • ${nativeCityReady?'WORLD_CITIES_SPATIAL_FINAL Offline':'core-fallback preview'}.`:`الحل المحلي جاهز • ستُجهز طبقة المدن العالمية تدريجيًا • ${cityDbCount.toLocaleString()} سجل • ${nativeCityReady?'WORLD_CITIES_SPATIAL_FINAL Offline':'core-fallback للمعاينة'}.`)
      : tx('هذا كسوف جزئي عالميًا، لذلك لا يوجد مسار مركزي لاكتشاف مدنه.','This is a globally partial eclipse, so there is no central path for city discovery.');
    $('geoCountries').innerHTML='';$('geoTop').innerHTML='';$('geoCities').innerHTML='';$('geoQuery').value='';
    resetImpactState();
    emitCalcStage(tx('ظهرت النتيجة المحلية • تجهيز طبقات الخريطة…','Local result ready • preparing map layers…'),.56,'running');
    $('resultsPanel').scrollIntoView({behavior:'smooth',block:'start'});

    defer(()=>preparePostCalculationLayers(currentRow,token,needCalculatedPath),40);
  }catch(err){
    currentResult=null;resetImpactState();renderEventMeta(false);drawMap();
    $('calcError').textContent=err?.message||String(err);$('calcError').classList.remove('hidden');
    emitCalcStage(tx('تعذر إكمال الحساب','Calculation failed'),1,'error');
  }
}
function preparePostCalculationLayers(row,token,needCalculatedPath){
  if(token!==calculationToken||row!==currentRow||!currentResult)return;
  if(needCalculatedPath && !calculatedPathCache.has(dateKey(row))){
    emitCalcStage(tx('حساب خط المركز…','Computing centerline…'),.64,'running');
    try{calculatedPathCache.set(dateKey(row),E.calculatedCenterline(row,3));}catch(_){calculatedPathCache.set(dateKey(row),[]);}
    scheduleMapDraw(0);
  }
  emitCalcStage(tx('بناء معاينة المجال العلمي…','Building scientific field preview…'),.70,'running');
  buildScientificFieldAsync(row,token,(previewGrid)=>{
    if(token!==calculationToken||row!==currentRow||!currentResult)return;
    scheduleMapDraw(0);
    emitCalcStage(tx('اكتمل الحل • الخريطة عالية الدقة وImpact GIS يعملان في الخلفية','Solution ready • high-resolution map and Impact GIS continue in the background'),1,'done');
    // Candidate selection reuses the already-computed eclipse field; this avoids a second 16,200-point global probe.
    defer(startImpactScan,180);
    // Refine the 2D field after the first usable result is visible. It is chunked and never blocks WebView scrolling.
    defer(()=>buildScientificFieldHighResAsync(row,token),650);
  });
}
function impactTypeAr(type){return localTypeLabel(type,type==='total'?'كلي':type==='annular'?'حلقي':type==='partial'?'جزئي':'غير مرئي');}
function impactColor(type){return type==='total'?'#bd4cff':type==='annular'?'#ff6547':'#ffd166';}
function impactCacheKey(row){return `${dateKey(row)}|${cityDbMeta.mode||'unknown'}|${cityDbCount}`;}
function impactRowsForFilter(){
  if(!currentResult)return [];
  if(impactFilter==='all')return impactedCities;
  if(impactFilter==='visible')return impactedCities.filter(x=>x.visibleScreen);
  return impactedCities.filter(x=>x.localType===impactFilter);
}
function impactStats(){
  const all=currentResult?impactedCities:[],vis=all.filter(x=>x.visibleScreen);
  return {all:all.length,visible:vis.length,total:vis.filter(x=>x.localType==='total').length,annular:vis.filter(x=>x.localType==='annular').length,partial:vis.filter(x=>x.localType==='partial').length};
}
function renderImpactConsole(){
  const status=$('impactScanStatus');if(!status)return;
  const st=impactStats();
  $('impactAllCount').textContent=st.all.toLocaleString();$('impactVisibleCount').textContent=st.visible.toLocaleString();$('impactTotalCount').textContent=st.total.toLocaleString();$('impactAnnularCount').textContent=st.annular.toLocaleString();$('impactPartialCount').textContent=st.partial.toLocaleString();
  if($('impactHudCount'))$('impactHudCount').textContent=impactScanState.running?`${Math.round(impactScanState.progress*100)}%`:(currentResult?`${st.visible.toLocaleString()} ${tx('مدينة','cities')}`:'—');
  if($('impactHudBreakdown'))$('impactHudBreakdown').textContent=impactScanState.running?tx('جارٍ المسح العلمي','Scientific scan in progress'):(currentResult?(isEn()?`Total ${st.total} • Annular ${st.annular} • Partial ${st.partial}`:`كلي ${st.total} • حلقي ${st.annular} • جزئي ${st.partial}`):tx('بانتظار الحساب','Waiting for calculation'));
  if(!currentResult)status.textContent=tx('بانتظار الحساب • لا توجد نتائج أو مدن متأثرة عند بدء البرنامج.','Waiting for calculation • no eclipse or impacted-city result is shown at startup.');
  else if(impactScanState.running)status.textContent=isEn()?`Scanning impacted cities… ${Math.round(impactScanState.progress*100)}% • ${impactScanState.processed.toLocaleString()} / ${impactScanState.total.toLocaleString()} candidates`:`جارٍ مسح المدن المتأثرة… ${Math.round(impactScanState.progress*100)}% • ${impactScanState.processed.toLocaleString()} / ${impactScanState.total.toLocaleString()} مرشح`;
  else if(impactScanState.done)status.textContent=isEn()?`Impact Layer ready • ${st.visible.toLocaleString()} initially visible cities • ${impactScanState.total.toLocaleString()} candidates scanned from ${cityDbCount.toLocaleString()} records.`:`Impact Layer جاهزة • ${st.visible.toLocaleString()} مدينة مرئية مبدئيًا • فُحص ${impactScanState.total.toLocaleString()} مرشح من قاعدة ${cityDbCount.toLocaleString()} سجل.`;
  else status.textContent=tx('الحل المحلي جاهز • ستبدأ طبقة المدن المتأثرة الآن.','Local solution ready • the impacted-cities layer will start now.');
  const rows=impactRowsForFilter().slice().sort((a,b)=>(b.visibleScreen-a.visibleScreen)||((b.localType==='total')-(a.localType==='total'))||((b.localType==='annular')-(a.localType==='annular'))||b.magnitude-a.magnitude||(Number(b.city.population)||0)-(Number(a.city.population)||0)).slice(0,48);
  const list=$('impactedCitiesList');
  list.innerHTML=rows.length?rows.map(x=>`<button class="impact-city" data-impact-index="${x.cityIndex}"><span class="impact-dot ${x.localType}"></span><b>${escapeHtml(cityName(x.city))}</b><small>${escapeHtml(countryName(x.city))} • ${impactTypeAr(x.localType)} • Mag ${fmt(x.magnitude,3)}${x.visibleScreen?` • ${tx('فوق الأفق','Above horizon')}`:` • ${tx('غير مرئي فوق الأفق','Not visible above horizon')}`}</small></button>`).join(''):`<span class="impact-empty">${currentResult?tx('جارٍ إعداد طبقة المدن أو لا توجد مدن ضمن المرشح الحالي.','Preparing the city layer, or no cities match the current candidate set.'):tx('لا توجد نتيجة بعد. اضغط زر الحساب أولًا.','No result yet. Run the calculation first.')}</span>`;
  list.querySelectorAll?.('[data-impact-index]').forEach(b=>b.onclick=()=>{const x=impactedCities.find(v=>v.cityIndex===Number(b.dataset.impactIndex));if(x)selectImpactCity(x.city);});
}
function queryNativeCandidateCellsAsync(keys,token,done){
  const unique=[...new Set((keys||[]).map(Number).filter(Number.isFinite))],out=[],seen=new Set();let i=0;
  const batchSize=120;
  const step=()=>{
    if(token!==impactScanToken||!currentResult)return;
    try{
      const rows=cityApi.queryCells(unique.slice(i,i+batchSize),{minPopulation:0,limit:200000});
      if(!Array.isArray(rows))throw new Error(rows?.error||'native city query failed');
      for(const r of rows){const id=String(r.id??r.geonameId??`${r.lat},${r.lon},${r.name}`);if(seen.has(id))continue;seen.add(id);out.push(r);}
      i+=batchSize;
      impactScanState.source=`WORLD_CITIES_SPATIAL_FINAL • loading candidates ${Math.min(i,unique.length)}/${unique.length}`;renderImpactConsole();
      if(i<unique.length)defer(step,0);else done(out);
    }catch(err){done(null,err);}
  };
  defer(step,0);
}
function runImpactCandidateScan(candidates,source,token,key){
  const I=E._internals;if(!I?.prepareObserver||!I?.findLocalMid||!I?.geometryAtMid||!I?.circumstancesAt){impactScanState.running=false;renderImpactConsole();return;}
  impactScanState.total=candidates.length;impactScanState.processed=0;impactScanState.progress=0;impactScanState.candidateCells=source.candidateCells||0;impactScanState.source=source.source;renderImpactConsole();
  let i=0,lastMapUpdate=0;const hits=[],tmin=Number(currentRow.tmin??-4),tmax=Number(currentRow.tmax??4),samples=10,chunkSize=(window.innerWidth||1000)<820?24:48,fieldGrid=scientificFieldPreviewCache.get(dateKey(currentRow))||scientificFieldCache.get(dateKey(currentRow));
  const step=()=>{
    if(token!==impactScanToken||!currentResult)return;
    const end=Math.min(candidates.length,i+chunkSize);
    for(;i<end;i++){
      const city=candidates[i],lat=Number(city.lat),lon=Number(city.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
      // Conservative field prefilter: exact Besselian classification still decides every retained city.
      if(fieldGrid&&gridAt(fieldGrid,fieldGrid.mags,lat,lon)<-.08)continue;
      try{
        const obs=I.prepareObserver(lat,lon,Number(city.elevationM??city.elevation??0)||0),mid=I.findLocalMid(currentRow,obs),g=I.geometryAtMid(mid);if(!(g.magnitude>0))continue;
        let visible=false,visiblePeak=0,maxAlt=-90;
        for(let j=0;j<=samples;j++){
          const t=tmin+(tmax-tmin)*j/samples,c=I.circumstancesAt(currentRow,obs,t),gg=I.geometryAtMid(c),alt=c.alt*180/Math.PI;maxAlt=Math.max(maxAlt,alt);
          if(c.alt>=I.HORIZON_RAD&&gg.magnitude>0){visible=true;visiblePeak=Math.max(visiblePeak,gg.magnitude);}
        }
        hits.push({city,cityIndex:i,lat,lon,localType:g.localType,magnitude:g.magnitude,obscuration:g.obscuration,visibleScreen:visible,visiblePeak,maxAltDeg:maxAlt});
      }catch(_){/* isolated malformed city cannot abort the atlas */}
    }
    impactedCities=hits;impactScanState.processed=i;impactScanState.progress=candidates.length?i/candidates.length:1;renderImpactConsole();
    const now=Date.now();if(now-lastMapUpdate>240){lastMapUpdate=now;scheduleMapDraw(0);}
    if(i<candidates.length)defer(step,0);else{
      impactScanState={...impactScanState,key,running:false,done:true,progress:1,processed:i,total:candidates.length};
      hits.sort((a,b)=>(b.visibleScreen-a.visibleScreen)||b.magnitude-a.magnitude||(Number(b.city.population)||0)-(Number(a.city.population)||0));
      impactCache.set(key,{hits,total:candidates.length,candidateCells:source.candidateCells||0,source:source.source});impactedCities=hits;renderImpactConsole();scheduleMapDraw(0);if(currentResult)renderReport();
    }
  };
  defer(step,0);
}
function startImpactScan(){
  if(!currentRow||!currentResult)return;
  const key=impactCacheKey(currentRow),token=++impactScanToken;
  if(impactCache.has(key)){
    const cached=impactCache.get(key);impactedCities=cached.hits;impactScanState={key,running:false,done:true,progress:1,processed:cached.total,total:cached.total,candidateCells:cached.candidateCells||0,source:cached.source||'cache'};renderImpactConsole();drawMap();return;
  }
  impactedCities=[];impactScanState={key,running:true,done:false,progress:0,processed:0,total:0,candidateCells:0,source:nativeCityReady?'WORLD_CITIES_SPATIAL_FINAL':'core-fallback'};renderImpactConsole();drawMap();
  if(nativeCityReady){
    const grid=scientificFieldPreviewCache.get(dateKey(currentRow))||scientificFieldCache.get(dateKey(currentRow));
    const keys=fieldCandidateCells(grid,.5);
    impactScanState.candidateCells=keys.length;impactScanState.source='WORLD_CITIES_SPATIAL_FINAL • field-derived mask';renderImpactConsole();
    if(!keys.length){impactScanState={...impactScanState,running:false,done:true,progress:1,processed:0,total:0};renderImpactConsole();return;}
    queryNativeCandidateCellsAsync(keys,token,(rows,err)=>{
      if(token!==impactScanToken||!currentResult)return;
      if(err||!Array.isArray(rows))runImpactCandidateScan(worldCities,{candidateCells:cityIndex.stats.cellCount,source:'core-fallback-after-native-error'},token,key);
      else runImpactCandidateScan(rows,{candidateCells:keys.length,source:'WORLD_CITIES_SPATIAL_FINAL • field-derived mask'},token,key);
    });
  }else runImpactCandidateScan(worldCities,{candidateCells:cityIndex.stats.cellCount,source:'core-fallback'},token,key);
}
function setObserverCity(c,runCalculation=false){
  if(!c)return;
  $('placeName').value=`${cityName(c)} — ${countryName(c)}`;$('lat').value=Number(c.lat).toFixed(6);$('lon').value=Number(c.lon).toFixed(6);$('alt').value=Number(c.elevationM??c.elevation??0)||0;$('preset').value=String(presets.length-1);drawMap();
  if(runCalculation)calculate();
}
function selectImpactCity(c){setObserverCity(c,true);}

function scanGeography(){
  if(!currentRow||!currentResult)return;
  if(!['A','T','H'].includes(E.baseType(currentRow.eclipse_type))){
    $('geoStats').textContent='الكسوف عالميًا جزئي؛ لا يوجد شريط كلي/حلقي مركزي.';return;
  }
  const btn=$('scanCities'),old=btn.textContent;btn.disabled=true;btn.textContent='جارٍ تحليل المسار والمدن…';
  setTimeout(()=>{
    try{
      const published=pathsByDate.get(dateKey(currentRow))||null;
      if(nativeCityReady){
        const path=published?.center?.length?published.center:E.calculatedCenterline(currentRow,2);
        const pathWidth=Math.max(1,Number(currentRow.path_width)||150),candidateRadius=Math.max(450,Math.min(1200,pathWidth*6));
        const keys=cityApi.cellsForPath(path,candidateRadius,1),source=cityApi.queryCellsBatched(keys,{minPopulation:0,limit:200000,batchSize:500});
        if(!Array.isArray(source))throw new Error(source?.error||'تعذر قراءة قاعدة المدن العالمية.');
        currentGeoScan=G.scanCentralCities(currentRow,source,published,{useSpatial:false});
        currentGeoScan.prefilterCount=source.length;currentGeoScan.candidateMethod='native-sqlite-2deg';currentGeoScan.indexStats={cellDeg:2,cellCount:keys.length,cityCount:cityDbCount};
      }else currentGeoScan=G.scanCentralCities(currentRow,worldCities,published,{index:cityIndex});
      selectedGeoCountry='ALL';renderGeoScan();
    }catch(err){$('geoStats').textContent='تعذر المسح الجغرافي: '+(err?.message||String(err));}
    finally{btn.disabled=false;btn.textContent=old;}
  },20);
}
function renderGeoScan(){
  const s=currentGeoScan;if(!s)return;
  const totals=s.cities.filter(c=>c.localType==='total').length,annular=s.cities.filter(c=>c.localType==='annular').length;
  const idx=s.indexStats||cityIndex.stats;
  $('geoStats').textContent=isEn()
    ? `Spatial index ${Number(idx.cellDeg||2)}°: ${Number(idx.cellCount||0).toLocaleString()} candidate cells • prefilter ${Number(s.prefilterCount||0).toLocaleString()} • geometric scan ${s.candidateCount.toLocaleString()} of ${cityDbCount.toLocaleString()} records. Inside central path: ${s.cities.length.toLocaleString()} • Total ${totals} • Annular ${annular} • Countries ${s.countries.length}. Database: ${cityDbMeta.mode}.`
    : `الفهرس المكاني ${Number(idx.cellDeg||2)}°: ${Number(idx.cellCount||0).toLocaleString()} خلية مرشحة • التصفية الأولية ${Number(s.prefilterCount||0).toLocaleString()} • الفحص الهندسي ${s.candidateCount.toLocaleString()} من أصل ${cityDbCount.toLocaleString()} سجل. داخل المسار المركزي: ${s.cities.length.toLocaleString()} • كلي ${totals} • حلقي ${annular} • دول ${s.countries.length}. قاعدة البيانات: ${cityDbMeta.mode}.`;
  const chips=[`<button class="country-chip active" data-country="ALL">${tx('الكل','All')} (${s.cities.length})</button>`].concat(s.countries.map(c=>`<button class="country-chip" data-country="${escapeHtml(c.key||c.countryCode||c.iso3||c.countryName)}">${escapeHtml(countryName(c.cities[0]||c))} (${c.cities.length})</button>`));
  $('geoCountries').innerHTML=chips.join('');
  $('geoCountries').querySelectorAll('.country-chip').forEach(b=>b.onclick=()=>{selectedGeoCountry=b.dataset.country;$('geoCountries').querySelectorAll('.country-chip').forEach(x=>x.classList.toggle('active',x===b));renderGeoCities();});
  const top=G.topCities(s,12);
  $('geoTop').innerHTML=top.map(c=>`<div class="geo-card" data-city="${escapeHtml(c.name)}" data-lat="${c.lat}" data-lon="${c.lon}"><b>${escapeHtml(cityName(c))} — ${escapeHtml(countryName(c))}</b><small>${localTypeLabel(c.localType,c.localTypeAr)} • MAX ${clockOnly(c.maxUTC)} UTC • ${tx('المدة','Duration')} ${dur(c.durationSeconds)} • ${tx('ارتفاع الشمس','Sun altitude')} ${fmt(c.sunAltitudeDeg,1)}° • ${tx('تقييم الرصد','Observing score')} ${fmt(c.observationScore,1)}/100</small></div>`).join('');
  $('geoTop').querySelectorAll('.geo-card').forEach(bindGeoCity);
  renderGeoCities();
}
function renderGeoCities(){
  const s=currentGeoScan;if(!s)return;
  const rows=G.filterSortCities(s,{country:selectedGeoCountry,query:$('geoQuery').value,sort:$('geoSort').value});
  $('geoCities').innerHTML=`<table class="geo-table"><thead><tr><th>${tx('الدولة','Country')}</th><th>${tx('المدينة','City')}</th><th>${tx('الحالة','Status')}</th><th>MAX UTC</th><th>${tx('المدة','Duration')}</th><th>${tx('ارتفاع الشمس','Sun altitude')}</th><th>${tx('البعد عن المركز','Centerline distance')}</th><th>${tx('السكان','Population')}</th><th>${tx('تقييم الرصد','Observing score')}</th></tr></thead><tbody>${rows.map(c=>`<tr data-city="${escapeHtml(c.name)}" data-lat="${c.lat}" data-lon="${c.lon}"><td>${escapeHtml(countryName(c))}</td><td><b>${escapeHtml(cityName(c))}</b>${isEn()&&c.nameAr?`<small> ${escapeHtml(c.nameAr)}</small>`:(!isEn()&&c.nameAr?`<small> ${escapeHtml(c.name)}</small>`:'')}${c.edgeWarning?`<br><small style="color:#f3c94c">${tx('قرب حافة المسار','Near path edge')}</small>`:''}</td><td><span class="geo-badge ${c.localType}">${escapeHtml(localTypeLabel(c.localType,c.localTypeAr))}</span></td><td>${clockOnly(c.maxUTC)}</td><td>${dur(c.durationSeconds)}</td><td>${fmt(c.sunAltitudeDeg,1)}°</td><td>${fmt(c.pathDistanceKm,1)} km</td><td>${c.population?Number(c.population).toLocaleString():'—'}</td><td>${fmt(c.observationScore,1)}</td></tr>`).join('')}</tbody></table>`;
  $('geoCities').querySelectorAll('tr[data-city]').forEach(bindGeoCity);
}
function citySearchMatches(query,limit=24){if(nativeCityReady){const r=cityApi.search(query,{limit});return Array.isArray(r)?r:[];}return G.searchCities(cityIndex,query,limit);}
function findHistoryCities(){
  const rows=citySearchMatches($('historyCitySearch').value,24);
  historySelectedCity=null;$('historyResults').classList.add('hidden');$('historyResults').innerHTML='';
  $('historyStatus').textContent=rows.length?(isEn()?`${rows.length} candidate matches found. Choose a city.`:`وجدت ${rows.length} نتيجة مرشحة. اختر المدينة المطلوبة.`):tx('لم أجد مدينة مطابقة في قاعدة المدن المحملة حاليًا.','No matching city was found in the currently loaded city database.');
  $('historyCandidates').innerHTML=rows.map((c,i)=>`<button class="country-chip history-candidate" data-i="${i}">${escapeHtml(cityName(c))} — ${escapeHtml(countryName(c))}${c.population?` • ${Number(c.population).toLocaleString()}`:''}</button>`).join('');
  $('historyCandidates').querySelectorAll('.history-candidate').forEach(b=>b.onclick=()=>{historySelectedCity=rows[Number(b.dataset.i)];scanSelectedCityHistory();});
}
function scanSelectedCityHistory(){
  const c=historySelectedCity;if(!c)return;
  $('historyStatus').textContent=isEn()?`Calculating central-eclipse history for ${cityName(c)} from 1550–2650…`:`جارٍ حساب تاريخ الكسوفات المركزية في ${cityName(c)} للفترة 1550–2650…`;
  $('historyCandidates').querySelectorAll('.history-candidate').forEach(x=>x.disabled=true);
  setTimeout(()=>{
    try{
      const h=G.scanCityHistory(repo,c,{startYear:1550,endYear:2650,include:'central'});
      $('historyStatus').textContent=isEn()?`${cityName(c)} — ${countryName(c)}: tested ${h.tested.toLocaleString()} globally central eclipses. Found ${h.hits.length} local central passages • Total ${h.total} • Annular ${h.annular}.`:`${cityName(c)} — ${countryName(c)}: تم اختبار ${h.tested.toLocaleString()} كسوفًا عالميًا مركزيًا. وُجد ${h.hits.length} مرورًا مركزيًا محليًا • كلي ${h.total} • حلقي ${h.annular}.`;
      $('historyResults').classList.remove('hidden');
      $('historyResults').innerHTML=`<table class="geo-table history-table"><thead><tr><th>${tx('التاريخ','Date')}</th><th>${tx('النوع المحلي','Local Type')}</th><th>Saros</th><th>C1</th><th>C2</th><th>MAX</th><th>C3</th><th>C4</th><th>${tx('المدة','Duration')}</th><th>${tx('المقدار','Magnitude')}</th><th>${tx('ارتفاع الشمس','Sun Altitude')}</th></tr></thead><tbody>${h.hits.map(x=>`<tr><td>${x.date}</td><td><span class="geo-badge ${x.localType}">${escapeHtml(localTypeLabel(x.localType,x.localTypeAr))}</span></td><td>${escapeHtml(x.saros)}</td><td>${clockOnly(x.c1UTC)}</td><td>${clockOnly(x.c2UTC)}</td><td>${clockOnly(x.maxUTC)}</td><td>${clockOnly(x.c3UTC)}</td><td>${clockOnly(x.c4UTC)}</td><td>${dur(x.durationSeconds)}</td><td>${fmt(x.magnitude,5)}</td><td>${fmt(x.sunAltitudeDeg,1)}°</td></tr>`).join('')}</tbody></table>`;
    }catch(err){$('historyStatus').textContent=tx('تعذر حساب تاريخ المدينة: ','City history calculation failed: ')+(err?.message||String(err));}
    finally{$('historyCandidates').querySelectorAll('.history-candidate').forEach(x=>x.disabled=false);}
  },20);
}
function bindGeoCity(el){el.onclick=()=>{
  $('placeName').value=`${el.dataset.city}`;$('lat').value=el.dataset.lat;$('lon').value=el.dataset.lon;$('alt').value=0;$('preset').value=String(presets.length-1);calculate();
};}


function selectNearestCityFromFlatMap(e){
  if(!currentRow)return;
  const canvas=$('mapCanvas'),r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
  const x=(e.clientX-r.left)/r.width*canvas.width,y=(e.clientY-r.top)/r.height*canvas.height;
  if(currentResult){let best=null,bestD=Infinity;for(const h of impactedMarkerHits){const d=Math.hypot(x-h.x,y-h.y);if(d<=Math.max(10,h.r+6)&&d<bestD){best=h;bestD=d;}}if(best){selectImpactCity(best.impact.city);return;}}
  if(viewMode!=='flat')return;
  const lon=x/canvas.width*360-180,lat=90-y/canvas.height*180;
  let hit=null;
  if(nativeCityReady){const rows=cityApi.nearest(lat,lon,{limit:1,maxKm:450});if(Array.isArray(rows)&&rows.length)hit={city:rows[0],distanceKm:rows[0].distanceKm};}
  else hit=G.nearestCity(cityIndex,lat,lon,450);
  if(!hit)return;
  setObserverCity(hit.city,!!currentResult);
}
function renderResults(){const r=currentResult;
  const typeLabel=localTypeLabel(r.localType,r.localTypeAr);$('liveLocation').textContent=`${$('placeName').value} • ${fmt(r.latitude,3)}°, ${fmt(r.longitude,3)}° • ${typeLabel}`;
  $('localType').textContent=typeLabel+(r.visible?'':` • ${tx('تحت الأفق','Below horizon')}`);
  $('magnitude').textContent=fmt(r.magnitude,5);$('obscuration').textContent=pct(r.obscuration);$('sunAlt').textContent=fmt(r.sunAltitudeDeg,2)+'°';
  for(const k of ['c1','c2','max','c3','c4']){$(k).textContent=clockOnly(r[k+'UTC']);const a=r[k+'SunAltitudeDeg'];$(k+'alt').textContent=Number.isFinite(a)?`${tx('ارتفاع الشمس','Sun altitude')} ${fmt(a,1)}°`:'';}
  let note='';
  if(!r.visible) note=tx('يوجد تماس هندسي محلي وفق العناصر إذا كانت القيم أعلاه موجودة، لكن الشمس تحت الأفق طوال الجزء المحسوب؛ لذلك لا توجد مرحلة مرئية من الموقع.','Geometric local contacts may exist according to the Besselian solution, but the Sun remains below the horizon throughout the computed interval; no phase is visible from this location.');
  else{
    note=`${tx('فترة الرؤية الفعلية','Actual visibility window')}: ${clockOnly(r.visibleStartUTC)} → ${clockOnly(r.visibleEndUTC)} UTC. ${tx('الأعظم المرئي','Visible maximum')}: ${clockOnly(r.visibleMaxUTC)} UTC.`;
    if(r.centralDurationSeconds>0)note+=` ${tx('مدة المرحلة المركزية الهندسية','Geometric central duration')} ${dur(r.centralDurationSeconds)}`;
    if(r.visibleCentralDurationSeconds>0)note+=`${isEn()?', visible ': '، والمرئية '}${dur(r.visibleCentralDurationSeconds)}.`;
  }
  $('visibilityNote').textContent=note;
}
function reportRows(){const r=currentResult,a=r.de440Verification;
  const gt=globalTypeLabel(r.globalType,r.globalTypeAr),lt=localTypeLabel(r.localType,r.localTypeAr);
  const rows=[
    [tx('الكسوف','Eclipse'),`${r.eventDate} — ${gt}`],
    [tx('الموقع','Location'),$('placeName').value],
    [tx('الإحداثيات','Coordinates'),`${fmt(r.latitude,6)}°, ${fmt(r.longitude,6)}° • ${tx('ارتفاع','Elevation')} ${fmt(r.altitudeM,0)} m`],
    [tx('أعظم الكسوف عالميًا','Global Greatest Eclipse'),`${r.globalGreatestUTC} UTC • ${fmt(r.globalGreatestLat,5)}°, ${fmt(r.globalGreatestLon,5)}°`],
    [tx('النوع المحلي','Local Type'),lt],
    [`C1 — ${tx('التماس الأول','First Contact')}`,`${r.c1UTC} UTC`],
    [`C2 — ${tx('بداية المرحلة المركزية','Central Phase Begins')}`,`${r.c2UTC} UTC`],
    [`MAX — ${tx('الأعظم المحلي','Local Maximum')}`,`${r.maxUTC} UTC`],
    [`C3 — ${tx('نهاية المرحلة المركزية','Central Phase Ends')}`,`${r.c3UTC} UTC`],
    [`C4 — ${tx('التماس الرابع','Fourth Contact')}`,`${r.c4UTC} UTC`],
    [tx('المقدار المحلي','Local Magnitude'),fmt(r.magnitude,6)],
    [tx('نسبة الاحتجاب','Obscuration'),pct(r.obscuration)],
    [tx('ارتفاع الشمس عند الأعظم','Sun altitude at maximum'),`${fmt(r.sunAltitudeDeg,3)}°`],
    [tx('سمت الشمس عند الأعظم','Sun azimuth at maximum'),`${fmt(r.sunAzimuthDeg,3)}°`],
    [tx('المدة المركزية الهندسية','Geometric Central Duration'),dur(r.centralDurationSeconds)],
    [tx('فترة الرؤية','Visibility Window'),r.visible?`${r.visibleStartUTC} → ${r.visibleEndUTC} UTC`:tx('غير مرئية فوق الأفق','Not visible above the horizon')],
    [tx('ΔT المستخدم','ΔT Used'),`${fmt(r.deltaTSeconds,2)} s`],['Saros',r.saros],
    [tx('مصدر الظروف المحلية','Local Circumstances Source'),'NASA/GSFC Besselian elements'],
    [tx('ملف الدفع','Ephemeris File'),tx('JPL DE440.bsp مدمج داخل التطبيق','JPL DE440.bsp embedded in the app')],
    [tx('بصمة DE440','DE440 SHA-256'),DE440_SHA256],[tx('المحرك','Engine'),r.engine],[tx('سياسة التقويم','Calendar Policy'),r.calendar]
  ];
  if(a?.available){rows.splice(19,0,
    [tx('تدقيق DE440','DE440 Audit'),isEn()?`Geometrically verified • ${a.source==='embedded-de440-runtime'?'direct read from de440.bsp':'DE440-derived audit layer'} • class ${a.geometryClass} • minimum-axis Δt ${fmt(a.dtSec,3)} s`:`مطابق هندسيًا • ${a.source==='embedded-de440-runtime'?'قراءة مباشرة من de440.bsp':'طبقة تدقيق مشتقة من DE440'} • الفئة ${a.geometryClass} • فرق أقل محور ${fmt(a.dtSec,3)} s`],
    ['DE440 γ',fmt(a.gamma,7)],[tx('المسافة الزاوية Sun–Moon','Sun–Moon angular separation'),`${fmt(a.sepDeg,7)}°`],[tx('مسافة القمر DE440','DE440 Moon distance'),`${fmt(a.moonDistKm,1)} km`],[tx('مسافة الشمس DE440','DE440 Sun distance'),`${fmt(a.sunDistKm,1)} km`]);
  } else if(a && !a.available){rows.splice(19,0,[tx('تدقيق DE440','DE440 Audit'),tx('غير متاح: الحدث بعد نهاية تغطية DE440 في 2650-01-25 TDB','Unavailable: event is beyond DE440 coverage ending 2650-01-25 TDB')]);}
  if(impactScanState.done&&impactScanState.key===impactCacheKey(currentRow)){const st=impactStats();rows.push(
    [tx('مسح المدن المتأثرة','Impacted Cities Scan'),isEn()?`${st.all} geometrically impacted • ${st.visible} initially visible • Total ${st.total} • Annular ${st.annular} • Partial ${st.partial}`:`${st.all} متأثرة هندسيًا • ${st.visible} مرئية مبدئيًا • كلي ${st.total} • حلقي ${st.annular} • جزئي ${st.partial}`],
    [tx('قاعدة المدن','City Database'),`${cityDbMeta.mode} • ${cityDbCount.toLocaleString()} ${tx('سجل','records')} • ${impactScanState.source}`]);}
  return rows;
}
function renderReport(){const rows=reportRows(),r=currentResult,seal=r.de440Verification?.available?'DE440<br>VERIFIED':'BESSELIAN<br>VALID',lt=localTypeLabel(r.localType,r.localTypeAr);
  $('report').innerHTML=`<div class="report-header-card"><div><h2>${tx('التقرير العلمي الذكي للكسوف الشمسي','Smart Scientific Solar Eclipse Report')}</h2><p>ALBAZ ASTROTECH • DE440 / Besselian Scientific Digital Twin • ${escapeHtml(r.eventDate)}</p></div><div class="report-seal">${seal}</div></div><div class="report-kpis"><div><small>${tx('الموقع','Location')}</small><b>${escapeHtml($('placeName').value)}</b></div><div><small>${tx('النوع المحلي','Local Type')}</small><b>${escapeHtml(lt)}</b></div><div><small>${tx('المقدار','Magnitude')}</small><b>${fmt(r.magnitude,5)}</b></div><div><small>${tx('ارتفاع الشمس','Sun Altitude')}</small><b>${fmt(r.sunAltitudeDeg,2)}°</b></div></div><table><tbody>${rows.map(([a,b])=>`<tr><th>${escapeHtml(a)}</th><td>${escapeHtml(b)}</td></tr>`).join('')}</tbody></table><div class="report-note">${tx('C1 وC4 التماسان خارجيان هندسيان. C2 وC3 يظهران فقط عند المرور داخل المرحلة المركزية المحلية. طبقة المجال الجغرافية في التطبيق مستقلة بصريًا، أما قيم التقرير فتخرج من الحل المحلي العلمي الكامل. طبقة المدن المتأثرة تستخدم فحصًا سريعًا على مستوى العالم، وعند اختيار مدينة يُعاد حلها كاملًا لإنتاج C1–C4.','C1 and C4 are external geometric contacts. C2 and C3 appear only when the local solution enters the central phase. The geographic field layer is a visualization layer; report values come from the full local scientific solution. The impacted-cities layer uses a fast global screening pass, and selecting a city reruns the full C1–C4 solution.')}</div>`;
}
function parseClockHours(v){
  const a=String(v??'').trim().split(':').map(Number);if(!Number.isFinite(a[0]))return 0;
  return a[0]+(a[1]||0)/60+(a[2]||0)/3600;
}
function eventGreatestT(row){
  let t=parseClockHours(row?.td_ge)-Number(row?.t0||0);
  while(t>12)t-=24;while(t<-12)t+=24;
  return Math.max(Number(row?.tmin??-4),Math.min(Number(row?.tmax??4),t));
}
function fieldColor(v,type='partial',alpha=.46){
  const x=Math.max(0,Number(v)||0);
  if(type==='total')return `rgba(189,76,255,${Math.min(1,alpha+.10)})`;
  if(type==='annular')return `rgba(255,72,83,${Math.min(1,alpha+.08)})`;
  if(x>=.95)return `rgba(255,64,94,${alpha})`;
  if(x>=.80)return `rgba(255,142,59,${alpha})`;
  if(x>=.55)return `rgba(240,206,82,${alpha})`;
  if(x>=.30)return `rgba(26,182,184,${alpha})`;
  if(x>=.08)return `rgba(20,91,134,${alpha})`;
  return 'rgba(0,0,0,0)';
}
const FIELD_PREVIEW_LON=12,FIELD_PREVIEW_LAT=10,FIELD_HIGH_LON=6,FIELD_HIGH_LAT=5;
function fieldTypeCode(type){return type==='total'?3:type==='annular'?2:type==='partial'?1:0;}
function fieldTypeName(code){return code===3?'total':code===2?'annular':'partial';}
function makeFieldGrid(stepLon,stepLat,quality){
  const nx=Math.round(360/stepLon),ny=Math.round(180/stepLat),lon0=-180+stepLon/2,lat0=-90+stepLat/2;
  return {stepLon,stepLat,nx,ny,lon0,lat0,quality,mags:new Float32Array(nx*ny),types:new Uint8Array(nx*ny),activePoints:[]};
}
function buildFieldGridAsync(row,stepLon,stepLat,quality,calcToken,onProgress,done){
  const I=E._internals;if(!I?.prepareObserver||!I?.findLocalMid||!I?.geometryAtMid){done?.(null);return;}
  const token=++scientificFieldBuildToken,grid=makeFieldGrid(stepLon,stepLat,quality),total=grid.nx*grid.ny;let idx=0;
  const step=()=>{
    if(token!==scientificFieldBuildToken||calcToken!==calculationToken||row!==currentRow||!currentResult)return;
    const started=(typeof performance!=='undefined'?performance.now():Date.now()),budgetMs=(window.innerWidth||1000)<820?7:10;
    while(idx<total){
      const iy=Math.floor(idx/grid.nx),ix=idx-iy*grid.nx,lat=grid.lat0+iy*grid.stepLat,lon=grid.lon0+ix*grid.stepLon;
      let mag=-1,type=0;
      try{const obs=I.prepareObserver(lat,lon,0),mid=I.findLocalMid(row,obs),g=I.geometryAtMid(mid);mag=Number(g.magnitude);type=fieldTypeCode(g.localType);if(mag>.015)grid.activePoints.push({lat,lon,magnitude:mag,localType:g.localType});}catch(_){mag=-1;}
      grid.mags[idx]=Number.isFinite(mag)?mag:-1;grid.types[idx]=type;idx++;
      const now=(typeof performance!=='undefined'?performance.now():Date.now());if(now-started>=budgetMs)break;
    }
    const progress=idx/total;onProgress?.(progress,grid);
    if(idx<total)defer(step,0);else done?.(grid);
  };
  defer(step,0);
}
function gridAt(grid,arr,lat,lon){
  if(!grid||!arr)return -1;
  let x=(normLon(lon)-grid.lon0)/grid.stepLon;while(x<0)x+=grid.nx;while(x>=grid.nx)x-=grid.nx;
  const x0=Math.floor(x),x1=(x0+1)%grid.nx,fx=x-x0;
  const maxLat=grid.lat0+(grid.ny-1)*grid.stepLat,clat=Math.max(grid.lat0,Math.min(maxLat,Number(lat)||0));
  const y=(clat-grid.lat0)/grid.stepLat,y0=Math.max(0,Math.min(grid.ny-1,Math.floor(y))),y1=Math.min(grid.ny-1,y0+1),fy=y-y0;
  const a=arr[y0*grid.nx+x0],b=arr[y0*grid.nx+x1],c=arr[y1*grid.nx+x0],d=arr[y1*grid.nx+x1];
  const ab=a+(b-a)*fx,cd=c+(d-c)*fx;return ab+(cd-ab)*fy;
}
function fieldRgb(mag){
  const stops=[[.015,20,91,134],[.30,26,182,184],[.55,240,206,82],[.80,255,142,59],[.97,255,64,94],[1.08,189,76,255]];
  if(!(mag>stops[0][0]))return [0,0,0,0];
  let hi=1;while(hi<stops.length&&mag>stops[hi][0])hi++;if(hi>=stops.length)hi=stops.length-1;const lo=Math.max(0,hi-1),a=stops[lo],b=stops[hi],t=Math.max(0,Math.min(1,(mag-a[0])/Math.max(1e-6,b[0]-a[0])));
  const mix=(i)=>Math.round(a[i]+(b[i]-a[i])*t),edge=Math.max(0,Math.min(1,(mag-.015)/.055)),alpha=Math.round((72+Math.min(1,mag)*88)*edge);
  return [mix(1),mix(2),mix(3),alpha];
}
function buildScientificRaster(key,grid){
  if(!grid||typeof document==='undefined')return null;
  const targetW=grid.quality==='high'?1080:540,targetH=Math.round(targetW*(780/1440)),c=document.createElement('canvas');c.width=targetW;c.height=targetH;const x=c.getContext('2d');if(!x?.createImageData||!x?.putImageData)return null;const im=x.createImageData(targetW,targetH),d=im.data;
  let k=0;for(let py=0;py<targetH;py++){const lat=90-(py+.5)/targetH*180;for(let px=0;px<targetW;px++){const lon=-180+(px+.5)/targetW*360,mag=gridAt(grid,grid.mags,lat,lon),rgba=fieldRgb(mag);d[k++]=rgba[0];d[k++]=rgba[1];d[k++]=rgba[2];d[k++]=rgba[3];}}
  x.putImageData(im,0,0);const entry={canvas:c,quality:grid.quality,grid};scientificFieldRasterCache.set(key,entry);return entry;
}
function buildScientificFieldAsync(row,calcToken,done){
  if(!row){done?.(null);return;}const key=dateKey(row);
  const existing=scientificFieldPreviewCache.get(key)||scientificFieldCache.get(key);if(existing){done?.(existing);return;}
  scientificFieldBuildState={key,running:true,progress:0,quality:'preview'};
  buildFieldGridAsync(row,FIELD_PREVIEW_LON,FIELD_PREVIEW_LAT,'preview',calcToken,(progress)=>{
    scientificFieldBuildState={key,running:true,progress,quality:'preview'};emitCalcStage(tx('بناء معاينة المجال العلمي…','Building scientific field preview…'),.70+.22*progress,'running');
  },grid=>{
    if(!grid)return;scientificFieldPreviewCache.set(key,grid);scientificFieldCache.set(key,grid);buildScientificRaster(key,grid);scientificFieldBuildState={key,running:false,progress:1,quality:'preview'};scheduleMapDraw(0);done?.(grid);
  });
}
function buildScientificFieldHighResAsync(row,calcToken,done){
  if(!row||calcToken!==calculationToken||row!==currentRow||!currentResult)return;const key=dateKey(row),best=scientificFieldCache.get(key);if(best?.quality==='high'){done?.(best);return;}
  scientificFieldBuildState={key,running:true,progress:0,quality:'high'};
  buildFieldGridAsync(row,FIELD_HIGH_LON,FIELD_HIGH_LAT,'high',calcToken,(progress)=>{
    scientificFieldBuildState={key,running:true,progress,quality:'high'};if($('mapStatus')&&currentResult)$('mapStatus').textContent=`${viewMode==='globe'?'3D Globe':'2D GIS'} • HI-RES ${Math.round(progress*100)}% • ${impactScanState.running?'Cities '+Math.round(impactScanState.progress*100)+'%':tx('خريطة تكيفية','Adaptive map')}`;
  },grid=>{
    if(!grid||calcToken!==calculationToken||row!==currentRow||!currentResult)return;scientificFieldCache.set(key,grid);buildScientificRaster(key,grid);scientificFieldBuildState={key,running:false,progress:1,quality:'high'};scheduleMapDraw(0);done?.(grid);
  });
}
function drawScientificFieldFlat(ctx,w,h){
  if(!showScientificField||!currentRow||!currentResult)return;const key=dateKey(currentRow),grid=scientificFieldCache.get(key);if(!grid)return;let r=scientificFieldRasterCache.get(key);if(!r||r.quality!==grid.quality)r=buildScientificRaster(key,grid);if(!r)return;
  ctx.save();ctx.globalCompositeOperation='screen';ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(r.canvas,0,0,w,h);ctx.restore();
}
function drawScientificFieldGlobe(ctx,w,h){
  if(!showScientificField||!currentRow||!currentResult)return;const key=dateKey(currentRow),grid=scientificFieldPreviewCache.get(key)||scientificFieldCache.get(key);if(!grid)return;
  ctx.save();ctx.globalCompositeOperation='screen';for(const q of grid.activePoints){const p=ortho(q.lon,q.lat,w,h);if(!p)continue;const r=Math.max(2.2,Math.min(10,2.3+q.magnitude*4.6))*Math.max(.45,p.z);ctx.fillStyle=fieldColor(q.magnitude,q.localType,.40);ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();}ctx.restore();
}
function makeNightGrid(row){
  const key=dateKey(row);if(nightGridCache.has(key))return nightGridCache.get(key);const I=E._internals;if(!I?.prepareObserver||!I?.circumstancesAt)return null;const stepLon=12,stepLat=10,nx=30,ny=18,lon0=-174,lat0=-85,vals=new Float32Array(nx*ny),points=[],t=eventGreatestT(row);
  for(let iy=0;iy<ny;iy++)for(let ix=0;ix<nx;ix++){const lat=lat0+iy*stepLat,lon=lon0+ix*stepLon;let alt=90;try{alt=I.circumstancesAt(row,I.prepareObserver(lat,lon,0),t).alt*180/Math.PI;}catch(_){alt=90;}vals[iy*nx+ix]=alt;points.push({lat,lon,alt});}
  const grid={stepLon,stepLat,nx,ny,lon0,lat0,vals,points};nightGridCache.set(key,grid);return grid;
}
function buildNightRaster(key,grid){
  if(!grid||typeof document==='undefined')return null;const W=420,H=Math.round(W*(780/1440)),c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');if(!x?.createImageData||!x?.putImageData)return null;const im=x.createImageData(W,H),d=im.data;let k=0;
  for(let py=0;py<H;py++){const lat=90-(py+.5)/H*180;for(let px=0;px<W;px++){const lon=-180+(px+.5)/W*360,alt=gridAt(grid,grid.vals,lat,lon),night=Math.max(0,Math.min(1,(-.833-alt)/8));d[k++]=0;d[k++]=3;d[k++]=10;d[k++]=Math.round(118*night);}}
  x.putImageData(im,0,0);const r={canvas:c,grid};nightRasterCache.set(key,r);return r;
}
function drawNightFlat(ctx,w,h){
  if(!showNightLayer||!currentRow||!currentResult)return;const key=dateKey(currentRow),grid=makeNightGrid(currentRow);if(!grid)return;const r=nightRasterCache.get(key)||buildNightRaster(key,grid);if(!r)return;ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(r.canvas,0,0,w,h);ctx.restore();
}
function drawNightGlobe(ctx,w,h){
  if(!showNightLayer||!currentRow||!currentResult)return;const grid=makeNightGrid(currentRow);if(!grid)return;ctx.save();for(const q of grid.points){if(q.alt>=-.833)continue;const p=ortho(q.lon,q.lat,w,h);if(!p)continue;const a=Math.max(.12,Math.min(.42,(-.833-q.alt)/24));ctx.fillStyle=`rgba(0,2,8,${a})`;ctx.beginPath();ctx.arc(p.x,p.y,7*Math.max(.45,p.z),0,Math.PI*2);ctx.fill();}ctx.restore();
}
function fieldCandidateCells(grid,padSamples=1){
  if(!grid)return [];const set=new Set(),nx2=180,ny2=90;
  const addBox=(minLat,maxLat,minLon,maxLon)=>{const y0=Math.max(0,Math.floor((Math.max(-89.999,minLat)+90)/2)),y1=Math.min(ny2-1,Math.floor((Math.min(89.999,maxLat)+90)/2));const addInterval=(a,b)=>{let x0=Math.floor((Math.max(-180,a)+180)/2),x1=Math.floor((Math.min(179.999,b)+180)/2);for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){let xx=x%nx2;if(xx<0)xx+=nx2;set.add(y*nx2+xx);}};if(maxLon-minLon>=360)addInterval(-180,179.999);else{const a=normLon(minLon),b=normLon(maxLon);if(a<=b)addInterval(a,b);else{addInterval(a,179.999);addInterval(-180,b);}}};
  const rx=(padSamples+.55)*grid.stepLon,ry=(padSamples+.55)*grid.stepLat;
  for(const q of grid.activePoints){if(!(q.magnitude>0))continue;addBox(q.lat-ry,q.lat+ry,q.lon-rx,q.lon+rx);}
  return [...set];
}
function impactMarkerRadius(x){const p=Math.max(0,Number(x.city.population)||0);return Math.max(2.4,Math.min(6.2,2.4+Math.log10(Math.max(1,p))/2.2+(x.localType==='partial'?0:1)));}
function drawCityLayerFlat(ctx,px,py){
  if(!showCityLayer||!currentResult)return;ctx.save();
  const rows=impactRowsForFilter(),stride=Math.max(1,Math.ceil(rows.length/3600));
  for(let i=0;i<rows.length;i+=stride){const x=rows[i],px0=px(x.lon),py0=py(x.lat),r=impactMarkerRadius(x);ctx.globalAlpha=x.visibleScreen?.92:.34;ctx.fillStyle=impactColor(x.localType);ctx.strokeStyle='rgba(255,255,255,.72)';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(px0,py0,r,0,Math.PI*2);ctx.fill();if(x.localType!=='partial')ctx.stroke();impactedMarkerHits.push({x:px0,y:py0,r,impact:x});}
  ctx.restore();
}
function drawCityLayerGlobe(ctx,w,h){
  if(!showCityLayer||!currentResult)return;ctx.save();
  const rows=impactRowsForFilter(),maxPoints=globeDragging?520:1800,stride=Math.max(1,Math.ceil(rows.length/maxPoints));
  for(let i=0;i<rows.length;i+=stride){const x=rows[i],p=ortho(x.lon,x.lat,w,h);if(!p)continue;const r=impactMarkerRadius(x)*(.55+.45*p.z);ctx.globalAlpha=x.visibleScreen?.94:.30;ctx.fillStyle=impactColor(x.localType);ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=.7;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();if(x.localType!=='partial')ctx.stroke();impactedMarkerHits.push({x:p.x,y:p.y,r,impact:x});}
  ctx.restore();
}

function worldRings(){const out=[];for(const f of world.features||[]){const g=f.geometry||{};if(g.type==='Polygon')out.push(...g.coordinates);else if(g.type==='MultiPolygon')for(const p of g.coordinates)out.push(...p);}return out;}
const rings=worldRings();
function mapPathGroups(){if(!currentResult||!currentRow)return {};if(currentPaths)return currentPaths;const c=calculatedPathCache.get(dateKey(currentRow))||[];return c.length?{center:c}:{};}
function splitDateline(points){const segs=[];let seg=[];for(const p of points){if(seg.length&&Math.abs(p.lon-seg[seg.length-1].lon)>180){if(seg.length>1)segs.push(seg);seg=[];}seg.push(p);}if(seg.length>1)segs.push(seg);return segs;}

function drawFlat(ctx,w,h){
  ctx.fillStyle='#061827';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='rgba(130,185,215,.20)';ctx.lineWidth=1;
  for(let lon=-150;lon<=150;lon+=30){const x=(lon+180)/360*w;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let lat=-60;lat<=60;lat+=30){const y=(90-lat)/180*h;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.fillStyle='#173c43';ctx.strokeStyle='#5d8793';ctx.lineWidth=.7;
  const px=(lon)=>((lon+180)/360*w),py=(lat)=>((90-lat)/180*h);
  for(const ring of rings){if(!ring.length)continue;ctx.beginPath();for(let i=0;i<ring.length;i++){const [lon,lat]=ring[i],x=px(lon),y=py(lat);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();}
  drawNightFlat(ctx,w,h,px,py);
  drawScientificFieldFlat(ctx,w,h,px,py);
  drawCityLayerFlat(ctx,px,py);
  drawFlatOverlay(ctx,w,h,px,py);
}
function drawFlatOverlay(ctx,w,h,px,py){
  const g=currentResult?mapPathGroups():{};
  function path(kind,color,width,dash=[]){const pts=g[kind]||[];ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);for(const seg of splitDateline(pts)){ctx.beginPath();seg.forEach((p,i)=>{const x=px(p.lon),y=py(p.lat);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();}ctx.setLineDash([]);}
  path('partial_north','#7a74b8',1.6,[8,7]);path('partial_south','#7a74b8',1.6,[8,7]);path('north','#3e9bf3',2.2);path('south','#3e9bf3',2.2);path('center','#ef4137',2.6);
  if(currentResult){const glat=currentResult.globalGreatestLat,glon=currentResult.globalGreatestLon;if(Number.isFinite(Number(glat))&&Number.isFinite(Number(glon)))marker(ctx,px(Number(glon)),py(Number(glat)),'#f3c94c',7,'★');}
  const slat=currentResult?.latitude??Number($('lat').value),slon=currentResult?.longitude??Number($('lon').value);if(Number.isFinite(Number(slat))&&Number.isFinite(Number(slon)))marker(ctx,px(Number(slon)),py(Number(slat)),'#45d7dc',6,'');
}
function ortho(lon,lat,w,h){const R=Math.min(w,h)*.43,lam=(normLon(lon-globeLon))*Math.PI/180,phi=lat*Math.PI/180,p0=globeLat*Math.PI/180;const cosc=Math.sin(p0)*Math.sin(phi)+Math.cos(p0)*Math.cos(phi)*Math.cos(lam);if(cosc<0)return null;return {x:w/2+R*Math.cos(phi)*Math.sin(lam),y:h/2-R*(Math.cos(p0)*Math.sin(phi)-Math.sin(p0)*Math.cos(phi)*Math.cos(lam)),z:cosc,R};}
function drawGlobe(ctx,w,h){
  ctx.fillStyle='#02070d';ctx.fillRect(0,0,w,h);
  const R=Math.min(w,h)*.43,cx=w/2,cy=h/2;
  const grad=ctx.createRadialGradient(cx-R*.25,cy-R*.25,R*.08,cx,cy,R);
  grad.addColorStop(0,'#174f70');grad.addColorStop(.7,'#0b3049');grad.addColorStop(1,'#061522');
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle=grad;ctx.fill();
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();

  ctx.strokeStyle='rgba(170,220,238,.24)';ctx.lineWidth=1;
  for(let lat=-60;lat<=60;lat+=30){ctx.beginPath();let pen=false;for(let lon=-180;lon<=180;lon+=3){const p=ortho(lon,lat,w,h);if(p){pen?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);pen=true}else pen=false}ctx.stroke();}
  for(let lon=-150;lon<=180;lon+=30){ctx.beginPath();let pen=false;for(let lat=-89;lat<=89;lat+=2){const p=ortho(lon,lat,w,h);if(p){pen?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);pen=true}else pen=false}ctx.stroke();}

  ctx.fillStyle='#315e4f';ctx.strokeStyle='rgba(181,222,207,.72)';ctx.lineWidth=0.85;
  for(const ring of rings){
    let segment=[];
    const flush=()=>{
      if(segment.length>=3){
        ctx.beginPath();ctx.moveTo(segment[0].x,segment[0].y);
        for(let i=1;i<segment.length;i++)ctx.lineTo(segment[i].x,segment[i].y);
        ctx.closePath();ctx.fill();ctx.stroke();
      }else if(segment.length===2){
        ctx.beginPath();ctx.moveTo(segment[0].x,segment[0].y);ctx.lineTo(segment[1].x,segment[1].y);ctx.stroke();
      }
      segment=[];
    };
    for(const [lon,lat] of ring){
      const p=ortho(lon,lat,w,h);
      if(p)segment.push(p);else flush();
    }
    flush();
  }

  drawNightGlobe(ctx,w,h);
  drawScientificFieldGlobe(ctx,w,h);
  drawCityLayerGlobe(ctx,w,h);
  const g=currentResult?mapPathGroups():{};
  function path(kind,color,width,dash=[]){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.setLineDash(dash);ctx.beginPath();let pen=false;for(const p0 of (g[kind]||[])){const p=ortho(p0.lon,p0.lat,w,h);if(p){pen?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);pen=true}else pen=false}ctx.stroke();ctx.setLineDash([]);}
  path('partial_north','#8078bd',1.5,[7,6]);path('partial_south','#8078bd',1.5,[7,6]);path('north','#3e9bf3',2.4);path('south','#3e9bf3',2.4);path('center','#ef4137',3.0);
  if(currentResult){const ge=ortho(Number(currentResult.globalGreatestLon),Number(currentResult.globalGreatestLat),w,h);if(ge)marker(ctx,ge.x,ge.y,'#f3c94c',7,'★');}
  const slat=currentResult?.latitude??Number($('lat').value),slon=currentResult?.longitude??Number($('lon').value);const st=ortho(Number(slon),Number(slat),w,h);if(st)marker(ctx,st.x,st.y,'#45d7dc',6,'');
  ctx.restore();
  ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.strokeStyle='#75d8ff';ctx.lineWidth=2;ctx.stroke();
}
function marker(ctx,x,y,color,r,char){ctx.save();ctx.fillStyle=color;ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();if(char){ctx.font=`${r*2.2}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#111';ctx.fillText(char,x,y+.5);}ctx.restore();}
function drawMap(){
  const c=$('mapCanvas');if(!c)return;impactedMarkerHits=[];const ctx=c.getContext('2d');
  viewMode==='globe'?drawGlobe(ctx,c.width,c.height):drawFlat(ctx,c.width,c.height);
  if($('pathSource')){
    if(!currentResult)$('pathSource').textContent=tx('لا توجد نتيجة كسوف بعد. الخريطة في الوضع الأساسي؛ اضغط «احسب الظروف المحلية» لإظهار المسار والمجال العلمي وImpact GIS.','No eclipse result yet. The map is in base mode; press “Run Scientific Calculation” to reveal the path, scientific field, and Impact GIS.');
    else $('pathSource').textContent=currentPaths?.center?tx('المسار: طبقة Besselian/WGS84 منشورة مضمّنة لهذا الكسوف. المجال اللوني = مقدار الكسوف المحلي الهندسي عند الأعظم المحلي، مع صقل بصري عالي الدقة.','Path: embedded published Besselian/WGS84 layer for this eclipse. The color field represents geometric local magnitude at local maximum with high-resolution visual refinement.'):tx('المسار: خط المركز محسوب داخل التطبيق من عناصر Besselian؛ المجال اللوني محسوب من العناصر المحلية ويُعرض كرستر متصل عالي الدقة.','Path: centerline computed in-app from Besselian elements; the color field is computed from local elements and rendered as a continuous high-resolution raster.');
  }
  if($('mapStatus')){
    if(!currentResult)$('mapStatus').textContent=`${viewMode==='globe'?'3D Globe':'2D GIS'} • BASE MAP • ${tx('بانتظار الحساب','Waiting for calculation')}`;
    else{const st=impactStats(),q=scientificFieldCache.get(dateKey(currentRow))?.quality||'preview',refining=scientificFieldBuildState.running&&scientificFieldBuildState.quality==='high';$('mapStatus').textContent=`${viewMode==='globe'?'3D Globe':'2D GIS'} • ${showScientificField?(refining?'HI-RES '+Math.round(scientificFieldBuildState.progress*100)+'%':q==='high'?'HI-RES':'Field ON'):'Field OFF'} • ${showNightLayer?'Day/Night ON':'Day/Night OFF'} • ${impactScanState.running?'Cities '+Math.round(impactScanState.progress*100)+'%':st.visible+' visible cities'}`;}
  }
}

function payload(){return {app:'ALBAZ Solar Eclipse Atlas Android',version:'0.1.9-world-cities-spatial-final',generatedAt:new Date().toISOString(),place:$('placeName').value,event:E.eventSummary(currentRow),result:currentResult,reportRows:reportRows()};}
function baseName(){return `ALBAZ_ECLIPSE_${dateKey(currentRow)}_${String($('placeName').value).replace(/[^\w\u0600-\u06FF-]+/g,'_').slice(0,40)}`;}
function bridge(){return window.AndroidBridge||null;}
function saveText(name,text,mime){if(bridge()?.saveTextFile){bridge().saveTextFile(name,text,mime);toast('تم إرسال الملف إلى مجلد التنزيلات.');return;}const b=new Blob([text],{type:mime});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href);}
function saveBase64(name,mime,dataUrl){const b64=dataUrl.split(',')[1];if(bridge()?.saveBase64File){bridge().saveBase64File(name,mime,b64);toast('تم حفظ الصورة في مجلد التنزيلات.');return;}const a=document.createElement('a');a.href=dataUrl;a.download=name;a.click();}
function saveJson(){saveText(baseName()+'.json',JSON.stringify(payload(),null,2),'application/json');}
function saveCsv(){const rows=[['field','value'],...reportRows()];const q=s=>'"'+String(s).replaceAll('"','""')+'"';saveText(baseName()+'.csv','\uFEFF'+rows.map(r=>r.map(q).join(',')).join('\r\n'),'text/csv');}
function reportHtmlDocument(){const en=isEn();return `<!doctype html><html lang="${en?'en':'ar'}" dir="${en?'ltr':'rtl'}"><meta charset="utf-8"><title>${escapeHtml(baseName())}</title><h1>${tx('التقرير الكامل للكسوف الشمسي','Full Solar Eclipse Report')}</h1><p>C1 • C2 • MAX • C3 • C4</p><table>${reportRows().map(([a,b])=>`<tr><th>${escapeHtml(a)}</th><td>${escapeHtml(b)}</td></tr>`).join('')}</table><div class="note">ALBAZ Solar Eclipse Atlas — Besselian local circumstances • JPL DE440 audit.</div></html>`;}
function saveHtml(){saveText(baseName()+'.html',reportHtmlDocument(),'text/html');}
function printPdf(){if(bridge()?.printPage){bridge().printPage(`ALBAZ Eclipse ${dateKey(currentRow)}`);}else window.print();}
function shareReport(){const text=reportRows().map(([a,b])=>`${a}: ${b}`).join('\n'),title=tx('تقرير الكسوف الشمسي','Solar Eclipse Report');if(bridge()?.shareText)bridge().shareText(title,text);else navigator.share?.({title,text}).catch(()=>{});}
function savePng(){const c=document.createElement('canvas');c.width=1400;c.height=1900;const x=c.getContext('2d');x.fillStyle='#f6f4ed';x.fillRect(0,0,c.width,c.height);x.fillStyle='#111';x.textAlign='center';x.font='bold 46px \"Janna LT\", Arial';x.fillText('ALBAZ Solar Eclipse Atlas',700,70);x.font='bold 36px \"Janna LT\", Arial';x.fillText(tx('التقرير الكامل للكسوف الشمسي','Full Solar Eclipse Report'),700,125);x.font='24px \"Janna LT\", Arial';x.fillText('C1 • C2 • MAX • C3 • C4',700,165);x.textAlign='right';x.font='23px \"Janna LT\", Arial';let y=225;for(const [a,b] of reportRows().slice(0,16)){x.fillStyle='#e7ecee';x.fillRect(80,y-28,1240,44);x.fillStyle='#14212a';x.fillText(`${a}:`,1280,y);x.font='21px \"Janna LT\", Arial';x.fillText(String(b),880,y);x.font='23px \"Janna LT\", Arial';y+=54;}x.save();x.translate(100,y+20);drawFlat(x,1200,620);x.restore();y+=690;x.fillStyle='#36454f';x.textAlign='center';x.font='20px \"Janna LT\", Arial';x.fillText('NASA/GSFC Besselian local contacts • JPL DE440 embedded geometric audit',700,y);saveBase64(baseName()+'.png','image/png',c.toDataURL('image/png',1));}
function toast(msg){if(bridge()?.toast)bridge().toast(msg);else console.log(msg);}

init();
})();

