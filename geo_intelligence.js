
(function(global){
'use strict';
const E=global.AlbazEclipse;
const R=6371.0088;
function rad(x){return Number(x)*Math.PI/180;}
function normLon(lon){let x=Number(lon)||0;while(x>180)x-=360;while(x<=-180)x+=360;return x;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function haversine(lat1,lon1,lat2,lon2){
  const p1=rad(lat1),p2=rad(lat2),dp=rad(lat2-lat1),dl=rad(normLon(lon2-lon1));
  const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(a)));
}
function nearestPathKm(city,path){
  let d=Infinity;
  for(const p of path||[]){const x=haversine(city.lat,city.lon,p.lat,p.lon);if(x<d)d=x;}
  return d;
}
function cellKey(lat,lon,cellDeg){
  const iy=Math.floor((clamp(Number(lat),-89.999999,89.999999)+90)/cellDeg);
  const ix=Math.floor((normLon(lon)+180)/cellDeg);
  return iy+':'+ix;
}
function buildCitySpatialIndex(cities,cellDeg=2){
  const deg=Math.max(.5,Math.min(10,Number(cellDeg)||2));
  const rows=Array.isArray(cities)?cities:[];
  const cells=new Map(), search=[];
  for(let i=0;i<rows.length;i++){
    const c=rows[i],lat=Number(c.lat),lon=Number(c.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const k=cellKey(lat,lon,deg);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(i);
    const fields=[c.name,c.nameAr,c.asciiName,c.countryName,c.countryAr,c.countryCode,c.iso3,c.sourceCountry].filter(Boolean).map(v=>String(v).toLocaleLowerCase());
    search.push({i,name:String(c.name||'').toLocaleLowerCase(),text:fields.join('\u0001'),population:Number(c.population)||0});
  }
  return {cities:rows,cellDeg:deg,cells,search,stats:{cityCount:rows.length,indexedCities:search.length,cellCount:cells.size,cellDeg:deg}};
}
function lonIntervals(center,delta){
  if(delta>=180)return [[-180,180]];
  const a=normLon(center-delta),b=normLon(center+delta);
  return a<=b?[[a,b]]:[[-180,b],[a,180]];
}
function cellIndicesForBox(index,minLat,maxLat,minLon,maxLon,out){
  const d=index.cellDeg;
  const y0=Math.floor((clamp(minLat,-89.999999,89.999999)+90)/d), y1=Math.floor((clamp(maxLat,-89.999999,89.999999)+90)/d);
  const x0=Math.floor((clamp(minLon,-180,179.999999)+180)/d), x1=Math.floor((clamp(maxLon,-180,179.999999)+180)/d);
  for(let iy=y0;iy<=y1;iy++)for(let ix=x0;ix<=x1;ix++){const bucket=index.cells.get(iy+':'+ix);if(bucket)for(const i of bucket)out.add(i);}
}
function candidateCitiesForPath(index,path,radiusKm){
  if(!index?.cells||!Array.isArray(path)||!path.length)return index?.cities||[];
  const ids=new Set(), r=Math.max(1,Number(radiusKm)||1), d=index.cellDeg;
  for(const p of path){
    const lat=clamp(Number(p.lat),-90,90),lon=normLon(p.lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
    const latDelta=Math.min(90,r/110.5+d*1.25);
    const cos=Math.max(.035,Math.cos(rad(lat)));
    const lonDelta=Math.min(180,r/(111.32*cos)+d*1.25);
    for(const [a,b] of lonIntervals(lon,lonDelta))cellIndicesForBox(index,lat-latDelta,lat+latDelta,a,b,ids);
  }
  return [...ids].map(i=>index.cities[i]);
}
function searchCities(index,query,limit=24){
  if(!index)return [];
  const q=String(query||'').trim().toLocaleLowerCase();if(q.length<2)return [];
  const starts=[],contains=[];
  for(const r of index.search||[]){if(!r.text.includes(q))continue;(r.name.startsWith(q)?starts:contains).push(r);}
  const cmp=(a,b)=>b.population-a.population||String(index.cities[a.i]?.name||'').localeCompare(String(index.cities[b.i]?.name||''));
  return starts.sort(cmp).concat(contains.sort(cmp)).slice(0,Math.max(1,limit)).map(r=>index.cities[r.i]);
}
function nearestCity(index,lat,lon,maxKm=Infinity){
  if(!index?.cities?.length)return null;
  const target={lat:Number(lat),lon:Number(lon)};if(!Number.isFinite(target.lat)||!Number.isFinite(target.lon))return null;
  const d=index.cellDeg,baseY=Math.floor((clamp(target.lat,-89.999999,89.999999)+90)/d),baseX=Math.floor((normLon(target.lon)+180)/d);
  const nx=Math.ceil(360/d),ny=Math.ceil(180/d),seen=new Set();let best=null,bestKm=Infinity;
  const maxRing=Math.max(nx,ny);
  for(let ring=0;ring<=maxRing;ring++){
    let touched=false;
    for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++){
      if(ring>0&&Math.abs(dx)!==ring&&Math.abs(dy)!==ring)continue;
      const iy=baseY+dy;if(iy<0||iy>=ny)continue;let ix=(baseX+dx)%nx;if(ix<0)ix+=nx;
      const key=iy+':'+ix;if(seen.has(key))continue;seen.add(key);const bucket=index.cells.get(key);if(!bucket)continue;touched=true;
      for(const i of bucket){const c=index.cities[i],km=haversine(target.lat,target.lon,Number(c.lat),Number(c.lon));if(km<bestKm){bestKm=km;best=c;}}
    }
    if(best&&bestKm<=Math.max(5,(ring+.5)*d*85))break;
    if(!touched&&ring>8&&best)break;
  }
  return best&&bestKm<=Number(maxKm)?{city:best,distanceKm:bestKm}:null;
}
function centralPath(row,published){if(published?.center?.length)return published.center;return E.calculatedCenterline(row,2);}
function observationScore(c){
  const duration=Math.max(0,Number(c.durationSeconds)||0),alt=Number.isFinite(Number(c.sunAltitudeDeg))?Number(c.sunAltitudeDeg):-90,distance=Math.max(0,Number(c.pathDistanceKm)||0),pop=Math.max(0,Number(c.population)||0);
  const durationScore=Math.min(1,duration/360)*45,altitudeScore=Math.max(0,Math.min(1,(alt+5)/75))*30,centerScore=Math.max(0,1-Math.min(distance,250)/250)*20,populationScore=Math.min(1,Math.log10(pop+1)/7)*5,edgePenalty=c.edgeWarning?4:0;
  return Math.max(0,Math.min(100,durationScore+altitudeScore+centerScore+populationScore-edgePenalty));
}
function enrichHit(c,r,d){
  const out={geonameId:c.geonameId||c.id||'',name:c.name,nameAr:c.nameAr||'',countryCode:c.countryCode||'',countryName:c.countryName||c.sourceCountry||'',countryAr:c.countryAr||'',iso3:c.iso3||'',lat:Number(c.lat),lon:Number(c.lon),population:Number(c.population)||0,elevationM:Number(c.elevationM??c.elevation??0)||0,timezone:c.timezone||'',localType:r.localType,localTypeAr:r.localTypeAr,c1UTC:r.c1UTC,c2UTC:r.c2UTC,maxUTC:r.maxUTC,c3UTC:r.c3UTC,c4UTC:r.c4UTC,durationSeconds:r.centralDurationSeconds||0,magnitude:r.magnitude,obscuration:r.obscuration,sunAltitudeDeg:r.sunAltitudeDeg,sunAzimuthDeg:r.sunAzimuthDeg,pathDistanceKm:d,visible:r.visible,edgeWarning:(r.centralDurationSeconds||0)<45};
  out.observationScore=observationScore(out);return out;
}
function scanCentralCities(row,cities,published,opts={}){
  const type=E.baseType(row.eclipse_type);if(!['A','T','H'].includes(type))return {path:[],cities:[],countries:[],candidateCount:0,candidateMethod:'none'};
  const path=centralPath(row,published);if(!path.length)return {path:[],cities:[],countries:[],candidateCount:0,candidateMethod:'none'};
  const pathWidth=Math.max(1,Number(row.path_width)||150),candidateRadius=Math.max(450,Math.min(1200,pathWidth*6));
  const useSpatial=opts.useSpatial!==false,index=opts.index||((useSpatial&&cities?.length)?buildCitySpatialIndex(cities,2):null);
  const source=useSpatial&&index?candidateCitiesForPath(index,path,candidateRadius):(cities||[]),candidates=[];
  for(const c of source){const lat=Number(c.lat),lon=Number(c.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;const d=nearestPathKm({lat,lon},path);if(d<=candidateRadius)candidates.push([c,d]);}
  const hits=[];
  for(const [c,d] of candidates){let r;try{r=E.calculateLocal(row,Number(c.lat),Number(c.lon),Number(c.elevationM??c.elevation??0)||0,0);}catch(_){continue;}if(r.localType!=='total'&&r.localType!=='annular')continue;hits.push(enrichHit(c,r,d));}
  hits.sort((a,b)=>b.observationScore-a.observationScore||b.durationSeconds-a.durationSeconds||a.pathDistanceKm-b.pathDistanceKm||String(a.name).localeCompare(String(b.name)));
  const countryMap=new Map();for(const c of hits){const key=c.countryCode||c.iso3||c.countryName||'—';if(!countryMap.has(key))countryMap.set(key,{key,countryCode:c.countryCode,iso3:c.iso3,countryName:c.countryName,countryAr:c.countryAr,cities:[],total:0,annular:0});const g=countryMap.get(key);g.cities.push(c);g[c.localType]++;}
  const countries=[...countryMap.values()].sort((a,b)=>b.cities.length-a.cities.length||String(a.countryName).localeCompare(String(b.countryName)));
  return {path,cities:hits,countries,candidateCount:candidates.length,prefilterCount:source.length,candidateMethod:useSpatial&&index?'spatial-'+index.cellDeg+'deg':'full-scan',indexStats:index?.stats||null};
}
function topCities(scan,limit=12){return (scan?.cities||[]).slice().sort((a,b)=>b.observationScore-a.observationScore||b.durationSeconds-a.durationSeconds||b.sunAltitudeDeg-a.sunAltitudeDeg||a.pathDistanceKm-b.pathDistanceKm).slice(0,limit);}
function filterSortCities(scan,{country='ALL',query='',sort='score'}={}){
  const q=String(query||'').trim().toLocaleLowerCase();const rows=(scan?.cities||[]).filter(c=>{const key=c.countryCode||c.iso3||c.countryName;if(country!=='ALL'&&key!==country)return false;if(!q)return true;return [c.name,c.nameAr,c.countryName,c.countryAr,c.countryCode,c.iso3].some(v=>String(v||'').toLocaleLowerCase().includes(q));});
  const cmp={duration:(a,b)=>b.durationSeconds-a.durationSeconds||b.observationScore-a.observationScore,center:(a,b)=>a.pathDistanceKm-b.pathDistanceKm||b.durationSeconds-a.durationSeconds,altitude:(a,b)=>b.sunAltitudeDeg-a.sunAltitudeDeg||b.durationSeconds-a.durationSeconds,population:(a,b)=>b.population-a.population||b.durationSeconds-a.durationSeconds,score:(a,b)=>b.observationScore-a.observationScore||b.durationSeconds-a.durationSeconds}[sort]||((a,b)=>b.observationScore-a.observationScore);return rows.sort(cmp);
}
function scanCityHistory(repo,city,opts={}){
  const startYear=Math.max(1550,Math.min(2650,Number(opts.startYear)||1550)),endYear=Math.max(startYear,Math.min(2650,Number(opts.endYear)||2650)),include=opts.include||'central',hits=[];let tested=0;
  for(let y=startYear;y<=endYear;y++)for(const row of repo.eventsForYear(y)||[]){const globalType=E.baseType(row.eclipse_type);if(include==='central'&&!['A','T','H'].includes(globalType))continue;tested++;let r;try{r=E.calculateLocal(row,Number(city.lat),Number(city.lon),Number(city.elevationM??city.elevation??0)||0,0);}catch(_){continue;}const central=r.localType==='total'||r.localType==='annular';if(include==='central'&&!central)continue;if(include==='visible'&&!r.visible)continue;if(include==='all'&&r.localType==='none')continue;hits.push({date:E.eventDate(row),year:y,globalType,globalTypeAr:r.globalTypeAr,localType:r.localType,localTypeAr:r.localTypeAr,saros:r.saros,c1UTC:r.c1UTC,c2UTC:r.c2UTC,maxUTC:r.maxUTC,c3UTC:r.c3UTC,c4UTC:r.c4UTC,durationSeconds:r.centralDurationSeconds||0,magnitude:r.magnitude,obscuration:r.obscuration,sunAltitudeDeg:r.sunAltitudeDeg,sunAzimuthDeg:r.sunAzimuthDeg,visible:r.visible});}
  hits.sort((a,b)=>a.date.localeCompare(b.date));return {city,tested,startYear,endYear,include,hits,total:hits.filter(x=>x.localType==='total').length,annular:hits.filter(x=>x.localType==='annular').length};
}
global.AlbazGeoIntelligence={haversine,nearestPathKm,buildCitySpatialIndex,candidateCitiesForPath,searchCities,nearestCity,observationScore,scanCentralCities,topCities,filterSortCities,scanCityHistory};
})(typeof window!=='undefined'?window:globalThis);

