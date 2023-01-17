if (typeof window !== "object") self.window = self;

const getDepth = require("get-depth");
const GeoTIFF = require("./node_modules/geotiff/dist-module/geotiff.js");
const { default: QuickLRU } = require("quick-lru");
const { default: createTile } = require("geotiff-tile");

const { CLEAR_CACHE, SET_MAX_CACHE_SIZE, REQUEST_TILE, CREATE_TILE_ERROR, CREATED_TILE } = require("./constants.js");

const lru = new QuickLRU({ maxSize: 10 });

function pick(obj, keys) {
  const result = {};
  keys.forEach(key => {
    result[key] = obj[key];
  });
  return result;
}

function getTransferList(data) {
  const depth = getDepth(data);
  if (depth === 1) {
    if (!data.buffer) return [];
    return [data.buffer];
  }

  if (depth === 2) {
    if (!data[0].buffer) return [];
    return data.map(band => band.buffer);
  }

  if (depth === 3) {
    if (!data[0][0].buffer) return [];
    const transferList = [];
    data.forEach(arr1 => {
      arr1.forEach(arr2 => {
        transferList.push(arr2.buffer);
      });
    });
    return transferList;
  }

  return [];
}

self.onmessage = async function onmessage(evt) {
  if (typeof evt.data !== "object") return;

  const { type, data } = evt.data;

  const { debug_level = 0, id } = data;

  if (debug_level >= 1) console.log("[geotiff-tile-web-worker:onmessage] id:", id);
  if (debug_level >= 1) console.log("[geotiff-tile-web-worker:onmessage] type:", type);
  if (debug_level >= 1) console.log("[geotiff-tile-web-worker:onmessage] data:", data);

  if (type === CLEAR_CACHE) {
    if (debug_level >= 1) console.log("[geotiff-tile-web-worker:onmessage] clearing cache");
    lru.clear();
  } else if (type === SET_MAX_CACHE_SIZE) {
    if (debug_level >= 1) console.log("[geotiff-tile-web-worker:onmessage] resizing cache to", data);
    lru.resize(data);
  } else if (type === REQUEST_TILE) {
    try {
      const { url } = data;
      if (debug_level >= 1) console.log("[geotiff-tile-web-worker:onmessage] creating tile from " + url);

      if (lru.has(url)) {
        if (debug_level >= 1) console.log("[geotiff-tile-web-worker:onmessage] url in cache");
      } else {
        if (debug_level >= 1) console.log("[geotiff-tile-web-worker:onmessage] url not in cache so fetching geotiff metadata");
        lru.set(url, GeoTIFF.fromUrl(url));
      }
      const geotiff = await lru.get(url);
      if (debug_level >= 3) console.log("[geotiff-tile-web-worker:onmessage] geotiff:", geotiff);

      const createTileOptions = pick(data, [
        "bbox",
        "bbox_srs",
        "cutline",
        "cutline_srs",
        "debug_level",
        "method",
        "pixel_depth",
        "round",
        "tile_array_types",
        "tile_height",
        "tile_srs",
        "tile_array_types_strategy",
        "tile_layout",
        "timed",
        "tile_width",
        "use_overview"
      ]);
      createTileOptions.geotiff = geotiff;
      if (debug_level >= 3) console.log("[geotiff-tile-web-worker:onmessage] createTileOptions:", createTileOptions);

      const { tile, height, width } = await createTile(createTileOptions);

      if (debug_level >= 3) console.log("[geotiff-tile-web-worker:onmessage] tile:", tile);

      const transferList = getTransferList(tile);

      if (debug_level >= 3) console.log("[geotiff-tile-web-worker:onmessage] transferList:", transferList);

      const message = { type: CREATED_TILE, data: { id, tile, height, width } };
      postMessage(message, transferList);
      if (debug_level >= 3) console.log("[geotiff-tile-web-worker:onmessage] posted message:", message);
    } catch (error) {
      if (debug_level >= 1) console.error(error);
      postMessage({ type: CREATE_TILE_ERROR, id, data: error });
    }
  }
};
