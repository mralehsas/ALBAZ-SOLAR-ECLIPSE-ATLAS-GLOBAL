
/*
 * ALBAZ Solar Eclipse Atlas — independent Besselian-elements runtime.
 *
 * The equations implemented here are standard Besselian eclipse geometry.
 * Input elements are the NASA/GSFC Five Millennium Canon dataset bundled
 * with the project.  This file is an original implementation for ALBAZ;
 * it is deliberately organized independently from legacy eclipse explorers.
 */
(function (global) {
  'use strict';

  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;
  const HORIZON_RAD = -0.00524; // standard apparent horizon threshold used by the reference model
  const EARTH_A_M = 6378140.0;
  const GEO_FACTOR = 0.99664719;

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const sq = x => x * x;
  const normLon = lon => {
    let x = lon;
    while (x > 180) x -= 360;
    while (x <= -180) x += 360;
    return x;
  };

  function parseCsv(text) {
    const lines = String(text || '').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
    if (!lines.length) return [];
    const headers = lines[0].split(',').map(s => s.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const vals = line.split(',');
      const obj = {};
      for (let j = 0; j < headers.length; j++) obj[headers[j]] = (vals[j] ?? '').trim();
      rows.push(obj);
    }
    return rows;
  }

  function n(row, key, fallback = 0) {
    const value = Number(row[key]);
    return Number.isFinite(value) ? value : fallback;
  }

  function eventDate(row) {
    return `${String(row.year).padStart(4, '0')}-${String(row.month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`;
  }

  function baseType(code) {
    const c = String(code || '').trim().toUpperCase();
    return ['P','A','T','H'].includes(c.charAt(0)) ? c.charAt(0) : '';
  }

  function typeCodeToArabic(code) {
    const map = { P: 'جزئي', A: 'حلقي', T: 'كلي', H: 'هجين' };
    return map[baseType(code)] || 'غير محدد';
  }

  function localTypeArabic(code) {
    const map = { none: 'غير مرئي', partial: 'جزئي', annular: 'حلقي', total: 'كلي' };
    return map[code] || 'غير محدد';
  }

  function prepareObserver(latDeg, lonEastDeg, altitudeM = 0) {
    const lat = Number(latDeg) * DEG;
    const westLon = -Number(lonEastDeg) * DEG;
    const alt = Number(altitudeM) || 0;
    const theta = Math.atan(GEO_FACTOR * Math.tan(lat));
    const rhoSin = GEO_FACTOR * Math.sin(theta) + (alt / EARTH_A_M) * Math.sin(lat);
    const rhoCos = Math.cos(theta) + (alt / EARTH_A_M) * Math.cos(lat);
    return { lat, lonEastDeg: Number(lonEastDeg), westLon, alt, rhoSin, rhoCos };
  }

  function polynomial(row, t) {
    const t2 = t * t, t3 = t2 * t;
    const x = n(row, 'x0') + n(row, 'x1') * t + n(row, 'x2') * t2 + n(row, 'x3') * t3;
    const y = n(row, 'y0') + n(row, 'y1') * t + n(row, 'y2') * t2 + n(row, 'y3') * t3;
    const dx = n(row, 'x1') + 2 * n(row, 'x2') * t + 3 * n(row, 'x3') * t2;
    const dy = n(row, 'y1') + 2 * n(row, 'y2') * t + 3 * n(row, 'y3') * t2;
    const dDeg = n(row, 'd0') + n(row, 'd1') * t + n(row, 'd2') * t2;
    const dd = (n(row, 'd1') + 2 * n(row, 'd2') * t) * DEG;
    let muDeg = n(row, 'mu0') + n(row, 'mu1') * t + n(row, 'mu2') * t2;
    muDeg = ((muDeg % 360) + 360) % 360;
    const dmu = (n(row, 'mu1') + 2 * n(row, 'mu2') * t) * DEG;
    const l1 = n(row, 'l10') + n(row, 'l11') * t + n(row, 'l12') * t2;
    const l2 = n(row, 'l20') + n(row, 'l21') * t + n(row, 'l22') * t2;
    return { x, y, dx, dy, d: dDeg * DEG, dd, mu: muDeg * DEG, dmu, l1, l2 };
  }

  function circumstancesAt(row, observer, t) {
    const p = polynomial(row, t);
    const sd = Math.sin(p.d), cd = Math.cos(p.d);
    const h = p.mu - observer.westLon - (n(row, 'dt') / 13713.44);
    const sh = Math.sin(h), ch = Math.cos(h);
    const xi = observer.rhoCos * sh;
    const eta = observer.rhoSin * cd - observer.rhoCos * ch * sd;
    const zeta = observer.rhoSin * sd + observer.rhoCos * ch * cd;
    const dxi = p.dmu * observer.rhoCos * ch;
    const deta = p.dmu * xi * sd - zeta * p.dd;
    const u = p.x - xi, v = p.y - eta;
    const a = p.dx - dxi, b = p.dy - deta;
    const l1p = p.l1 - zeta * n(row, 'tan_f1');
    const l2p = p.l2 - zeta * n(row, 'tan_f2');
    const m = Math.hypot(u, v);
    const n2 = a * a + b * b;
    const sinLat = Math.sin(observer.lat), cosLat = Math.cos(observer.lat);
    const alt = Math.asin(clamp(sd * sinLat + cd * cosLat * ch, -1, 1));
    let az = Math.atan2(-sh * cd, sd * cosLat - ch * sinLat * cd);
    if (az < 0) az += 2 * Math.PI;
    return { t, ...p, h, xi, eta, zeta, dxi, deta, u, v, a, b, l1p, l2p, m, n2, alt, az };
  }

  function findLocalMid(row, observer) {
    let t = 0;
    const tMin = n(row, 'tmin', -3), tMax = n(row, 'tmax', 3);
    for (let i = 0; i < 50; i++) {
      const c = circumstancesAt(row, observer, t);
      if (!(c.n2 > 1e-18)) break;
      const correction = (c.u * c.a + c.v * c.b) / c.n2;
      if (!Number.isFinite(correction)) break;
      t -= correction;
      t = clamp(t, tMin, tMax);
      if (Math.abs(correction) < 1e-9) break;
    }
    return circumstancesAt(row, observer, t);
  }

  function bisect(row, observer, fn, lo, hi, iterations = 50) {
    let flo = fn(circumstancesAt(row, observer, lo));
    let fhi = fn(circumstancesAt(row, observer, hi));
    if (!Number.isFinite(flo) || !Number.isFinite(fhi)) return null;
    if (Math.abs(flo) < 1e-12) return lo;
    if (Math.abs(fhi) < 1e-12) return hi;
    if (flo * fhi > 0) return null;
    for (let i = 0; i < iterations; i++) {
      const mid = (lo + hi) / 2;
      const fm = fn(circumstancesAt(row, observer, mid));
      if (!Number.isFinite(fm)) return null;
      if (Math.abs(fm) < 1e-11 || Math.abs(hi - lo) < 1e-10) return mid;
      if (flo * fm <= 0) { hi = mid; fhi = fm; }
      else { lo = mid; flo = fm; }
    }
    return (lo + hi) / 2;
  }

  function rootFromMid(row, observer, midT, fn, direction, stepSeconds) {
    const tMin = n(row, 'tmin', -3), tMax = n(row, 'tmax', 3);
    const step = Math.max(0.2, stepSeconds) / 3600;
    let innerT = midT;
    let innerF = fn(circumstancesAt(row, observer, innerT));
    if (!(innerF < 0)) return null;
    for (let i = 0; i < 10000; i++) {
      const outerT = innerT + direction * step;
      if (outerT < tMin || outerT > tMax) break;
      const outerF = fn(circumstancesAt(row, observer, outerT));
      if (outerF >= 0) {
        return direction < 0
          ? bisect(row, observer, fn, outerT, innerT)
          : bisect(row, observer, fn, innerT, outerT);
      }
      innerT = outerT;
      innerF = outerF;
    }
    return null;
  }

  function geometryAtMid(mid) {
    const denom = mid.l1p + mid.l2p;
    let magnitude = denom !== 0 ? (mid.l1p - mid.m) / denom : 0;
    const ratio = denom !== 0 ? (mid.l1p - mid.l2p) / denom : 0;
    let localType = 'none';
    if (magnitude > 0) {
      if (mid.m < Math.abs(mid.l2p)) localType = mid.l2p < 0 ? 'total' : 'annular';
      else localType = 'partial';
    }
    if (localType === 'total' || localType === 'annular') magnitude = ratio;
    let obscuration = 0;
    if (magnitude >= 1) {
      obscuration = 1;
    } else if (magnitude > 0) {
      if (localType === 'annular') {
        obscuration = clamp(ratio * ratio, 0, 1);
      } else if (mid.m > 1e-12) {
        const d1 = mid.l1p * mid.l1p - mid.l2p * mid.l2p;
        const ac1 = clamp((mid.l1p * mid.l1p + mid.l2p * mid.l2p - 2 * mid.m * mid.m) / d1, -1, 1);
        const ac2 = clamp((mid.l1p * mid.l2p + mid.m * mid.m) / (mid.m * (mid.l1p + mid.l2p)), -1, 1);
        const c = Math.acos(ac1);
        const b = Math.acos(ac2);
        const a = Math.PI - b - c;
        obscuration = clamp(((ratio * ratio * a + b) - ratio * Math.sin(c)) / Math.PI, 0, 1);
      } else {
        obscuration = clamp(ratio * ratio, 0, 1);
      }
    }
    return { magnitude: Math.max(0, magnitude), ratio, obscuration, localType };
  }

  function jdnFromCivil(y, m, d) {
    const greg = (y > 1582) || (y === 1582 && (m > 10 || (m === 10 && d >= 15)));
    let a = Math.floor((14 - m) / 12);
    let yy = y + 4800 - a;
    let mm = m + 12 * a - 3;
    if (greg) return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - 32083;
  }

  function civilFromJdn(jdn) {
    if (jdn >= 2299161) {
      let a = jdn + 32044;
      let b = Math.floor((4 * a + 3) / 146097);
      let c = a - Math.floor(146097 * b / 4);
      let d = Math.floor((4 * c + 3) / 1461);
      let e = c - Math.floor(1461 * d / 4);
      let m = Math.floor((5 * e + 2) / 153);
      const day = e - Math.floor((153 * m + 2) / 5) + 1;
      const month = m + 3 - 12 * Math.floor(m / 10);
      const year = 100 * b + d - 4800 + Math.floor(m / 10);
      return { year, month, day };
    }
    let c = jdn + 32082;
    let d = Math.floor((4 * c + 3) / 1461);
    let e = c - Math.floor(1461 * d / 4);
    let m = Math.floor((5 * e + 2) / 153);
    const day = e - Math.floor((153 * m + 2) / 5) + 1;
    const month = m + 3 - 12 * Math.floor(m / 10);
    const year = d - 4800 + Math.floor(m / 10);
    return { year, month, day };
  }

  function utcPartsForT(row, t, utcOffsetHours = 0) {
    let totalSeconds = (t + n(row, 't0') - n(row, 'dt') / 3600 + Number(utcOffsetHours || 0)) * 3600;
    let dayShift = Math.floor(totalSeconds / 86400);
    totalSeconds -= dayShift * 86400;
    if (totalSeconds < 0) { totalSeconds += 86400; dayShift--; }
    let sec = Math.round(totalSeconds);
    if (sec >= 86400) { sec -= 86400; dayShift++; }
    const base = jdnFromCivil(Number(row.year), Number(row.month), Number(row.day));
    const date = civilFromJdn(base + dayShift);
    const hh = Math.floor(sec / 3600);
    const mm = Math.floor((sec % 3600) / 60);
    const ss = sec % 60;
    return { ...date, hour: hh, minute: mm, second: ss };
  }

  function formatParts(p) {
    const y = String(p.year).padStart(4, '0');
    return `${y}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}:${String(p.second).padStart(2, '0')}`;
  }

  function formatT(row, t, utcOffsetHours = 0) {
    if (t === null || !Number.isFinite(t)) return '—';
    return formatParts(utcPartsForT(row, t, utcOffsetHours));
  }

  function parseClockHours(s) {
    const a = String(s || '00:00:00').split(':').map(Number);
    return (a[0] || 0) + (a[1] || 0) / 60 + (a[2] || 0) / 3600;
  }

  function globalGreatestUTC(row) {
    const tdHours = parseClockHours(row.td_ge);
    const t = tdHours - n(row, 't0');
    return formatT(row, t, 0);
  }

  function horizonIntervals(row, observer, startT, endT) {
    if (!(Number.isFinite(startT) && Number.isFinite(endT) && startT < endT)) return [];
    const horizonF = c => c.alt - HORIZON_RAD;
    const step = 120 / 3600;
    const points = [startT];
    for (let t = startT + step; t < endT; t += step) points.push(t);
    points.push(endT);
    const intervals = [];
    let activeStart = null;
    let lastT = points[0];
    let lastF = horizonF(circumstancesAt(row, observer, lastT));
    if (lastF >= 0) activeStart = lastT;
    for (let i = 1; i < points.length; i++) {
      const t = points[i];
      const f = horizonF(circumstancesAt(row, observer, t));
      if (lastF < 0 && f >= 0) {
        activeStart = bisect(row, observer, horizonF, lastT, t) ?? t;
      } else if (lastF >= 0 && f < 0 && activeStart !== null) {
        const e = bisect(row, observer, horizonF, lastT, t) ?? lastT;
        intervals.push([activeStart, e]);
        activeStart = null;
      }
      lastT = t; lastF = f;
    }
    if (activeStart !== null) intervals.push([activeStart, endT]);
    return intervals.filter(x => x[1] > x[0]);
  }

  function visiblePeakT(row, observer, intervals, geometricMidT) {
    if (!intervals.length) return null;
    for (const [a, b] of intervals) if (geometricMidT >= a && geometricMidT <= b) return geometricMidT;
    let bestT = intervals[0][0], bestMag = -Infinity;
    for (const [a, b] of intervals) {
      for (const t of [a, b]) {
        const g = geometryAtMid(circumstancesAt(row, observer, t));
        if (g.magnitude > bestMag) { bestMag = g.magnitude; bestT = t; }
      }
    }
    return bestT;
  }

  function calculateLocal(row, latitudeDeg, longitudeEastDeg, altitudeM = 0, utcOffset = 0) {
    const lat = Number(latitudeDeg), lon = Number(longitudeEastDeg), alt = Number(altitudeM || 0);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error('خط العرض يجب أن يكون بين -90 و +90 درجة.');
    if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('خط الطول يجب أن يكون بين -180 و +180 درجة.');
    const observer = prepareObserver(lat, lon, alt);
    const mid = findLocalMid(row, observer);
    const g = geometryAtMid(mid);
    const result = {
      eventDate: eventDate(row), globalType: row.eclipse_type, globalTypeAr: typeCodeToArabic(row.eclipse_type),
      localType: g.localType, localTypeAr: localTypeArabic(g.localType), visible: false,
      latitude: lat, longitude: lon, altitudeM: alt, utcOffset: Number(utcOffset || 0),
      magnitude: g.magnitude, obscuration: g.obscuration, moonSunRatio: g.ratio,
      globalMagnitude: n(row, 'magnitude'), globalGreatestUTC: globalGreatestUTC(row),
      globalGreatestLat: n(row, 'lat_dd_ge'), globalGreatestLon: n(row, 'lng_dd_ge'),
      c1T: null, c2T: null, maxT: mid.t, c3T: null, c4T: null,
      visibleStartT: null, visibleEndT: null, visibleMaxT: null,
      centralDurationSeconds: 0, visibleCentralDurationSeconds: 0,
      sunAltitudeDeg: mid.alt * RAD, sunAzimuthDeg: mid.az * RAD,
      deltaTSeconds: n(row, 'dt'), saros: row.saros, lunarNumber: row.luna_num,
      pathWidthKm: n(row, 'path_width'), globalCentralDuration: row.central_duration,
      engine: 'ALBAZ Besselian Local Engine 1.0', calendar: 'Julian ≤ 1582-10-04; Gregorian ≥ 1582-10-15'
    };

    if (!(g.magnitude > 0)) {
      result.localType = 'none'; result.localTypeAr = localTypeArabic('none');
      const emptyFields = ['c1','c2','c3','c4','visibleStart','visibleMax','visibleEnd'];
      for (const name of emptyFields) {
        result[`${name}UTC`] = '—';
        result[`${name}Local`] = '—';
      }
      result.maxUTC = formatT(row, mid.t); result.maxLocal = formatT(row, mid.t, utcOffset);
      result.visibleMagnitude = 0; result.visibleObscuration = 0;
      result.visibleSunAltitudeDeg = mid.alt * RAD; result.visibleSunAzimuthDeg = mid.az * RAD;
      return result;
    }

    const extFn = c => c.m - c.l1p;
    const c1 = rootFromMid(row, observer, mid.t, extFn, -1, 30);
    const c4 = rootFromMid(row, observer, mid.t, extFn, +1, 30);
    result.c1T = c1; result.c4T = c4;

    if (g.localType === 'total' || g.localType === 'annular') {
      const cenFn = c => c.m - Math.abs(c.l2p);
      const c2 = rootFromMid(row, observer, mid.t, cenFn, -1, 2);
      const c3 = rootFromMid(row, observer, mid.t, cenFn, +1, 2);
      result.c2T = c2; result.c3T = c3;
      if (c2 !== null && c3 !== null) result.centralDurationSeconds = Math.max(0, (c3 - c2) * 3600);
    }

    const intervals = (c1 !== null && c4 !== null) ? horizonIntervals(row, observer, c1, c4) : [];
    result.visible = intervals.length > 0;
    if (intervals.length) {
      // Eclipse visibility interval is the union of daytime intervals; for solar eclipses in a short window it is normally one.
      result.visibleStartT = intervals[0][0];
      result.visibleEndT = intervals[intervals.length - 1][1];
      result.visibleMaxT = visiblePeakT(row, observer, intervals, mid.t);
      const vc2 = result.c2T === null ? null : Math.max(result.c2T, result.visibleStartT);
      const vc3 = result.c3T === null ? null : Math.min(result.c3T, result.visibleEndT);
      if (vc2 !== null && vc3 !== null && vc3 > vc2) result.visibleCentralDurationSeconds = (vc3 - vc2) * 3600;
      const vc = circumstancesAt(row, observer, result.visibleMaxT);
      const vg = geometryAtMid(vc);
      result.visibleMagnitude = vg.magnitude;
      result.visibleObscuration = vg.obscuration;
      result.visibleSunAltitudeDeg = vc.alt * RAD;
      result.visibleSunAzimuthDeg = vc.az * RAD;
    } else {
      result.visibleMagnitude = 0; result.visibleObscuration = 0;
      result.visibleSunAltitudeDeg = mid.alt * RAD; result.visibleSunAzimuthDeg = mid.az * RAD;
    }

    const fields = [['c1', c1], ['c2', result.c2T], ['max', mid.t], ['c3', result.c3T], ['c4', c4],
                    ['visibleStart', result.visibleStartT], ['visibleMax', result.visibleMaxT], ['visibleEnd', result.visibleEndT]];
    for (const [name, t] of fields) {
      result[`${name}UTC`] = formatT(row, t, 0);
      result[`${name}Local`] = formatT(row, t, utcOffset);
      if (t !== null && Number.isFinite(t)) {
        const c = circumstancesAt(row, observer, t);
        result[`${name}SunAltitudeDeg`] = c.alt * RAD;
        result[`${name}SunAzimuthDeg`] = c.az * RAD;
      }
    }
    return result;
  }

  function eventSummary(row) {
    return {
      date: eventDate(row), type: row.eclipse_type, typeAr: typeCodeToArabic(row.eclipse_type),
      greatestUTC: globalGreatestUTC(row), magnitude: n(row, 'magnitude'), saros: row.saros,
      greatestLat: n(row, 'lat_dd_ge'), greatestLon: n(row, 'lng_dd_ge'),
      centralDuration: row.central_duration, pathWidthKm: n(row, 'path_width'), deltaTSeconds: n(row, 'dt')
    };
  }

  function solveCenterAtTime(row, t, seedLat, seedLon) {
    let lat = clamp(Number(seedLat), -89.5, 89.5), lon = normLon(Number(seedLon));
    const residual = (la, lo) => {
      const o = prepareObserver(la, lo, 0);
      const c = circumstancesAt(row, o, t);
      return { u: c.u, v: c.v, c };
    };
    for (let it = 0; it < 25; it++) {
      const r = residual(lat, lon);
      const norm = Math.hypot(r.u, r.v);
      if (norm < 2e-7) {
        if (r.c.zeta <= 0 || r.c.alt < HORIZON_RAD) return null;
        return { lat, lon, residual: norm, t };
      }
      const eps = 0.002;
      const rl = residual(lat + eps, lon), ro = residual(lat, lon + eps);
      const j11 = (rl.u - r.u) / eps, j21 = (rl.v - r.v) / eps;
      const j12 = (ro.u - r.u) / eps, j22 = (ro.v - r.v) / eps;
      const det = j11 * j22 - j12 * j21;
      if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null;
      let dlat = (-r.u * j22 + j12 * r.v) / det;
      let dlon = (-j11 * r.v + j21 * r.u) / det;
      const scale = Math.max(1, Math.abs(dlat) / 8, Math.abs(dlon) / 12);
      dlat /= scale; dlon /= scale;
      lat = clamp(lat + dlat, -89.8, 89.8);
      lon = normLon(lon + dlon);
    }
    const r = residual(lat, lon);
    if (Math.hypot(r.u, r.v) < 2e-4 && r.c.zeta > 0 && r.c.alt >= HORIZON_RAD) return { lat, lon, residual: Math.hypot(r.u, r.v), t };
    return null;
  }

  function calculatedCenterline(row, stepMinutes = 3) {
    if (!['A', 'T', 'H'].includes(baseType(row.eclipse_type))) return [];
    const tMin = n(row, 'tmin', -3), tMax = n(row, 'tmax', 3);
    const tGe = parseClockHours(row.td_ge) - n(row, 't0');
    const seedLat = n(row, 'lat_dd_ge'), seedLon = n(row, 'lng_dd_ge');
    const first = solveCenterAtTime(row, clamp(tGe, tMin, tMax), seedLat, seedLon);
    if (!first) return [];
    const step = Math.max(0.5, Number(stepMinutes)) / 60;
    const right = [first], left = [];
    let seed = first;
    for (let t = first.t + step; t <= tMax + 1e-9; t += step) {
      const p = solveCenterAtTime(row, t, seed.lat, seed.lon);
      if (!p) { if (right.length > 3) break; else continue; }
      const jump = Math.hypot(p.lat - seed.lat, normLon(p.lon - seed.lon));
      if (jump > 25) break;
      right.push(p); seed = p;
    }
    seed = first;
    for (let t = first.t - step; t >= tMin - 1e-9; t -= step) {
      const p = solveCenterAtTime(row, t, seed.lat, seed.lon);
      if (!p) { if (left.length > 3) break; else continue; }
      const jump = Math.hypot(p.lat - seed.lat, normLon(p.lon - seed.lon));
      if (jump > 25) break;
      left.push(p); seed = p;
    }
    return left.reverse().concat(right).map(p => ({ lon: p.lon, lat: p.lat, t: p.t }));
  }

  function buildRepository(csvText) {
    const rows = parseCsv(csvText);
    const byYear = new Map();
    for (const row of rows) {
      const y = Number(row.year);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(row);
    }
    for (const arr of byYear.values()) arr.sort((a, b) => Number(a.month) - Number(b.month) || Number(a.day) - Number(b.day));
    return {
      rows,
      years: Array.from(byYear.keys()).sort((a, b) => a - b),
      eventsForYear(year) { return byYear.get(Number(year)) || []; },
      findByDate(date) { return rows.find(r => eventDate(r) === date) || null; }
    };
  }

  global.AlbazEclipse = {
    parseCsv, buildRepository, eventDate, eventSummary, calculateLocal, calculatedCenterline,
    globalGreatestUTC, baseType, typeCodeToArabic, localTypeArabic, formatT,
    _internals: { prepareObserver, circumstancesAt, findLocalMid, geometryAtMid, solveCenterAtTime, jdnFromCivil, civilFromJdn, HORIZON_RAD }
  };
})(typeof window !== 'undefined' ? window : globalThis);

