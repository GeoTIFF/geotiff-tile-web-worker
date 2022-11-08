const FrameWorker = require("frame-worker");
const workerString = require("./worker-string.js");
const { CREATED_TILE, CREATE_TILE_ERROR, REQUEST_TILE, SET_MAX_CACHE_SIZE, CLEAR_CACHE } = require("./constants.js");

function createWorker(options) {
  const useFrameWorker = typeof options === "object" && options.iframe === true;
  const WebWorker = useFrameWorker === false && typeof Worker === "function" ? Worker : FrameWorker;
  const maxTiles = typeof options === "object" && typeof options.maxTiles === "number" ? options.maxTiles : Infinity;

  const blob = new Blob([workerString], { type: "text/javascript" });
  const blobURL = URL.createObjectURL(blob);

  const worker = new WebWorker(blobURL);

  let tileCount = 0;

  const resolvers = {};

  worker.onmessage = function (evt) {
    const { type, data = {} } = evt.data;

    const { id } = data;

    if (!resolvers[id]) return;

    const [resolve, reject] = resolvers[id];

    if (type === CREATED_TILE) {
      const { tile, height, width } = data;
      resolve({ tile, height, width });
    } else if (type === CREATE_TILE_ERROR) {
      reject(data);
    } else {
      console.error("unknown type " + type);
    }
  }

  worker.clearCache = function() {
    worker.postMessage({ type: CLEAR_CACHE });
  };

  worker.setMaxCacheSize = function(maxCacheSize) {
    worker.postMessage({
      type: SET_MAX_CACHE_SIZE,
      data: maxCacheSize
    });
  };

  worker.createTile = function(params) {
    const { debug_level, timeout } = params;
    if (debug_level >= 1) console.log('[geotiff-tile-web-worker:createTile] starting with:', params);

    const id = Math.pow(Math.random(), Math.random()).toString().substring(2);
    if (debug_level >= 2) console.log('[geotiff-tile-web-worker:createTile] id:', id);

    return new Promise(function (resolve, reject) {
      try {
        resolvers[id] = [resolve, reject];
        const message = {
          type: REQUEST_TILE,
          data: {
            id,
            ...params
          }
        };
        if (debug_level >= 1) console.log('[geotiff-tile-web-worker:createTile] posting message to worker:', message);
        worker.postMessage(message);
        if (typeof timeout === "number") setTimeout(() => reject("timeout"), timeout);
      } catch (error) {
        console.error(error);
        reject(error);
      }
    });
  }

  return worker;
}

if (typeof define === "function" && define.amd) {
  define(function() { return { createWorker }; });
}

module.exports = { createWorker };

if (typeof self === "object") {
  self.geotiff_tile_web_worker = { createWorker };
}

if (typeof window === "object") {
  window.geotiff_tile_web_worker = { createWorker };
}