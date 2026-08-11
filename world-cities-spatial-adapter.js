
/* ALBAZ WORLD_CITIES_SPATIAL_FINAL v0.1.9
 * Offline Android candidate layer only. Scientific eclipse classification remains in eclipse_engine.js.
 */
(function(g){'use strict';
 const native=()=>g.ALBAZWorldCitiesNative;
 const parse=s=>{try{return JSON.parse(s)}catch(e){return {error:String(e)}}};
 const api={
   version:'0.1.9',name:'WORLD_CITIES_SPATIAL_FINAL',gridDegrees:2,
   available:()=>!!native(),
   meta:()=>native()?parse(native().meta()):{error:'ALBAZWorldCitiesNative bridge is not bound'},
   cell:(lat,lon)=>{
     const a=Math.min(89,Math.max(0,Math.floor((+lat+90)/2)));
     const b=Math.min(179,Math.max(0,Math.floor((+lon+180)/2)));
     return {lat:a,lon:b,key:a*180+b};
   },
   queryBBox:(minLat,minLon,maxLat,maxLon,opt={})=>native()?parse(native().queryBBox(+minLat,+minLon,+maxLat,+maxLon,opt.minPopulation||0,opt.limit||50000)):[],
   queryCells:(keys,opt={})=>native()?parse(native().queryCells(JSON.stringify(keys),opt.minPopulation||0,opt.limit||100000)):[],
   queryCellsBatched:(keys,opt={})=>{
      if(!native())return [];
      const unique=[...new Set((keys||[]).map(Number).filter(Number.isFinite))],batch=Math.max(1,Math.min(700,opt.batchSize||500)),out=[];
      const seen=new Set();
      for(let i=0;i<unique.length;i+=batch){
        const rows=api.queryCells(unique.slice(i,i+batch),opt);
        if(!Array.isArray(rows))return rows;
        for(const r of rows){const id=String(r.id??r.geonameId??`${r.lat},${r.lon},${r.name}`);if(seen.has(id))continue;seen.add(id);out.push(r);}
      }
      return out;
   },
   search:(query,opt={})=>native()?parse(native().search(String(query||''),opt.limit||24)):[],
   nearest:(lat,lon,opt={})=>native()?parse(native().nearest(+lat,+lon,opt.limit||8,opt.maxKm||1000)):[],
   cellsForPath:(path,radiusKm,padCells=1)=>{
      const d=2,r=Math.max(1,+radiusKm||1),set=new Set(),nx=180,ny=90;
      const norm=x=>{x=+x||0;while(x>180)x-=360;while(x<=-180)x+=360;return x};
      for(const p of path||[]){
        const lat=Math.max(-90,Math.min(90,+p.lat)),lon=norm(p.lon);if(!Number.isFinite(lat)||!Number.isFinite(lon))continue;
        const latDelta=Math.min(90,r/110.5+d*1.5),cos=Math.max(.035,Math.cos(lat*Math.PI/180)),lonDelta=Math.min(180,r/(111.32*cos)+d*1.5);
        const y0=Math.max(0,Math.floor((Math.max(-89.999999,lat-latDelta)+90)/d)-padCells),y1=Math.min(ny-1,Math.floor((Math.min(89.999999,lat+latDelta)+90)/d)+padCells);
        const addInterval=(a,b)=>{let x0=Math.floor((Math.max(-180,a)+180)/d)-padCells,x1=Math.floor((Math.min(179.999999,b)+180)/d)+padCells;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){let xx=x%nx;if(xx<0)xx+=nx;set.add(y*nx+xx)}};
        if(lonDelta>=180)addInterval(-180,179.999999);else{const a=norm(lon-lonDelta),b=norm(lon+lonDelta);if(a<=b)addInterval(a,b);else{addInterval(a,179.999999);addInterval(-180,b)}}
      }
      return [...set];
   }
 };
 g.ALBAZWorldCities=api;
})(window);

