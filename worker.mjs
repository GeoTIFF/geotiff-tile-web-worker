import expose from "microlink/esm/expose.js";
import { fromUrl } from "geotiff";
import QuickLRU from "quick-lru";
import create_geotiff_tile from "geotiff-tile";

const pick = (obj, keys) => {
  const result = {};
  keys.forEach(key => {
    result[key] = obj[key];
  });
  return result;
};

// log all events received
// self.addEventListener("message", evt => console.log("worker recv'd", evt));

const lru = new QuickLRU({ maxSize: 10 });

async function clear_cache({ debug_level = 0 } = {}) {
  if (debug_level >= 1) console.log("[geotiff-tile-web-worker/worker.mjs:_clear_cache] clearing cache");
  lru.clear();
}

async function create_tile(params) {
  const { debug_level } = params;
  try {
    // console.log("INSIDE WORKER, STARTING create_tile")
    const { url } = params;
    if (debug_level >= 1) console.log("[geotiff-tile-web-worker/worker.mjs:_create_tile] creating tile from " + url);

    if (lru.has(url)) {
      if (debug_level >= 1) console.log("[geotiff-tile-web-worker/worker.mjs:_create_tile] url in cache");
    } else {
      if (debug_level >= 1) console.log("[geotiff-tile-web-worker/worker.mjs:_create_tile] url not in cache so fetching geotiff metadata");
      lru.set(url, fromUrl(url));
    }
    const geotiff = await lru.get(url);
    if (debug_level >= 3) console.log("[geotiff-tile-web-worker/worker.mjs:_create_tile] geotiff:", geotiff);

    // clean params
    const cleaned_params = pick(params, [
      "bbox",
      "bbox_srs",
      "cutline",
      "cutline_srs",
      "debug_level",
      "expr",
      "geotiff_no_data",
      "geotiff_srs",
      "method",
      "pixel_depth",
      "round",
      "tile_array_types",
      "tile_height",
      "tile_no_data",
      "tile_srs",
      "tile_array_types_strategy",
      "tile_layout",
      "timed",
      "tile_width",
      "use_overview",
      "turbo"
    ]);

    if (cleaned_params.debug_level) cleaned_params.debug_level--;
    cleaned_params.geotiff = geotiff;

    if (debug_level >= 3) console.log("[geotiff-tile-web-worker:onmessage] cleaned_params:", cleaned_params);

    const result = await create_geotiff_tile(cleaned_params);
    if (debug_level >= 3) console.log("[geotiff-tile-web-worker:onmessage] create_geotiff_tile returned:", result);

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function set_max_cache_size({ debug_level = 0 } = {}) {
  if (debug_level >= 1) console.log("[geotiff-tile-web-worker/worker.mjs:_set_max_cache_size] resizing cache to", data);
  lru.resize(data);
}

try {
  const procedures = {
    clear_cache,
    create_tile,
    set_max_cache_size
  };
  expose(procedures, {
    batch_size: Infinity,
    batch_wait: 100
  });
} catch (error) {
  console.error(error);
}
