
/*
 * Runtime city database selector.
 * Android v0.1.9 uses bundled WORLD_CITIES_SPATIAL_FINAL SQLite. A generated full JS build
 * can replace this file without changing the application engine.
 */
window.ALBAZ_WORLD_CITIES = window.ALBAZ_WORLD_CITIES || window.ALBAZ_CORE_CITIES || [];
window.ALBAZ_CITY_DB_META = window.ALBAZ_CITY_DB_META || {
  source: 'ALBAZ curated core fallback',
  mode: 'core-fallback',
  spatialIndex: '2deg-runtime',
  count: window.ALBAZ_WORLD_CITIES.length,
  license: 'Project fallback dataset; replace with generated GeoNames CC BY 4.0 dataset for full world coverage.'
};

