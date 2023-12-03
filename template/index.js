const wrap = require("microlink/esm/wrap.js").default;
const FrameWorker = require("frame-worker");
const { prepareData, prepareUpdate } = require("xdim");
const { workerString } = require(REPLACE_ME);

const DEFAULT_TILE_LAYOUT = "[band][row,column]";

const absolutify = url => {
  if (url.startsWith("/")) {
    return location.origin + url;
  } else if (url.startsWith("./")) {
    return location.href.split("/").slice(0, -1).join("/") + "/" + url.replace(/^\.\//, "");
  } else {
    return url;
  }
};

async function createWorker(options) {
  const debug_level = typeof options === "object" && typeof options.debug_level === "number" ? options.debug_level : 0;
  const useFrameWorker = typeof options === "object" && options.iframe === true;
  if (debug_level >= 1) console.log("[geotiff-tile-web-worker:createWorker] useFrameWorker is " + useFrameWorker);
  const WebWorker = useFrameWorker === false && typeof Worker === "function" ? Worker : FrameWorker;
  if (debug_level >= 1) console.log("[geotiff-tile-web-worker:createWorker] WebWorker:", WebWorker);
  const maxTiles = typeof options === "object" && typeof options.maxTiles === "number" ? options.maxTiles : Infinity;
  if (debug_level >= 1) console.log("[geotiff-tile-web-worker:createWorker] debug level is " + debug_level);

  const blob = new Blob([workerString], { type: "text/javascript" });
  if (debug_level >= 2) console.log("[geotiff-tile-web-worker/index.js:createWorker] created blob from worker string:", blob);

  const blobURL = URL.createObjectURL(blob);
  const worker = new WebWorker(blobURL);
  if (debug_level >= 2) console.log("[geotiff-tile-web-worker/index.js:createWorker] worker:", worker);

  const wrapfn = wrap.default || wrap;
  if (debug_level >= 2) console.log("[geotiff-tile-web-worker/index.js:createWorker] wrapfn:", wrapfn);
  const obj = await wrapfn(worker, { debug_level: debug_level - 1 });
  if (debug_level >= 2) console.log("[geotiff-tile-web-worker/index.js:createWorker] obj:", obj);

  worker.clearCache = obj.clear_cache;
  worker.setMaxCacheSize = obj.set_max_cache_size;

  worker.createTile = async function ({ url, ...rest }) {
    // intercept expr and apply in current thread
    if (typeof rest.expr === "function") {
      const { debug_level, tile_layout = DEFAULT_TILE_LAYOUT, expr, tile_array_types } = rest;

      const time_before_create_tile = performance.now();
      let {
        tile: temp_tile,
        height,
        width,
        extra
      } = await obj.create_tile({
        url: absolutify(url),
        ...rest,
        expr: undefined,
        tile_layout: "[row][column][band]",
        tile_array_types: undefined
      });
      const time_after_create_time = performance.now();
      if (debug_level >= 2) {
        console.log(
          "[geotiff-tile-web-worker] creating initial tile (before applying expr) took " + Math.round(time_after_create_time - time_before_create_tile) + " ms"
        );
      }

      const time_expr_start = performance.now();

      const sizes = {
        band: extra.out_bands.length,
        row: height,
        column: width
      };

      const { data: tile } = prepareData({
        layout: tile_layout,
        sizes,
        arrayTypes: tile_array_types
      });

      const update = prepareUpdate({
        data: tile,
        layout: tile_layout,
        sizes
      });

      const num_bands = sizes.band;
      for (let row = 0; row < height; row++) {
        for (let column = 0; column < width; column++) {
          const pixel = temp_tile[row][column];
          const values = expr({ pixel });
          for (let band = 0; band < num_bands; band++) {
            update({
              point: {
                band,
                row,
                column
              },
              value: values[band]
            });
          }
        }
      }
      const time_expr_end = performance.now();
      if (debug_level >= 2) console.log("[geotiff-tile-web-worker] applying expr took " + Math.round(time_expr_end - time_expr_start) + " ms");

      return { tile, height, layout: tile_layout, width };
    } else {
      const result = obj.create_tile({ url: absolutify(url), ...rest });
      if (result === undefined) throw new Error("[geotiff-tile-web-worker] create_tile returned undefined");
      return result;
    }
  };

  if (debug_level >= 2) console.log("[geotiff-tile-web-worker/index.js:createWorker] wrapped worker:", worker);

  return worker;
}

if (typeof define === "function" && define.amd) {
  define(function () {
    return { createWorker };
  });
}

if (typeof module === "object") {
  module.exports = { createWorker };
}

if (typeof self === "object") {
  self.geotiff_tile_web_worker = { createWorker };
}

if (typeof window === "object") {
  window.geotiff_tile_web_worker = { createWorker };
}
