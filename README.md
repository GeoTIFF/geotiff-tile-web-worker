# geotiff-tile-web-worker
Create a GeoTIFF Tile using an Inline Web Worker

## install
### via script tag
```html
<script src="https://unpkg.com/geotiff-tile-web-worker"></script>
```
### via terminal
```
npm install geotiff-tile-web-worker
```

## basic usage
```js
import { createWorker } from "geotiff-tile-web-worker";

const worker = createWorker();

const result = await worker.createTile({
  // url to a geotiff
  url: "https://storage.googleapis.com/pdd-stac/disasters/hurricane-harvey/0831/20170831_172754_101c_3b_Visual.tif",

  // bounding box of tile in format [xmin, ymin, xmax, ymax]
  bbox: [-95.976562, 29.535232, -95.888671, 29.611673]
});

// result is
{
  height: 256,
  width: 256,
  tile: [
    Uint8Array[...], // first band
    Uint8Array[...], // second band
    Uint8Array[...], // third band
  ]
}
```

## advanced usage
```js
import { createWorker } from "geotiff-tile-web-worker";

const worker = createWorker();

worker.createTile({
  // url to a GeoTIFF file
  url: "https://storage.googleapis.com/pdd-stac/disasters/hurricane-harvey/0831/20170831_172754_101c_3b_Visual.tif",

  // bounding box of tile in format [xmin, ymin, xmax, ymax]
  bbox: [-96.01226806640625, 29.616445727622548, -96.01089477539062, 29.61763959537609],

  /*** ALL PARAMETERS BELOW ARE OPTIONAL */

  // spatial reference system of the bounding box as an EPSG Code number
  // default is 4326
  bbox_srs: 4326,

  // geometry to clip by in GeoJSON format
  cutline: geojson,

  // spatial reference system of cutline
  // default is 4326
  cutline_srs: 4326,

  // set to higher number to increase logging
  // default is 0
  debug_level: 0,

  // resampling method
  // default is "near"
  method: "max",

  // round pixel values to integers
  // default is false
  round: true,

  // override default nested tile array types
  tile_array_types: ["Array", "Uint8ClampedArray"],

  // if tile_array_types is not specified, choose the strategy for deciding which type of arrays:
  // auto - safest and default option, only uses typed array if it's sure there won't be any clamping
  // geotiff - use the same array types that geotiff.js uses (good if not stretching min or max)
  // untyped - use only untyped arrays
  // undefined - same as auto
  tile_array_types_strategy: "untyped",

  // layout using xdim layout syntax: https://github.com/danieljdufour/xdim
  tile_layout: "[band][row,column]",

  // projection of the tile as an EPSG code
  // default is 3857
  tile_srs: 3857,

  // tile height in pixel
  // default is 256
  tile_height: 512,

  // width of tile in pixels
  // default is 256
  tile_width: 512,

  // whether to use overviews if available
  // default is true
  use_overview: false
})

// stop web worker
worker.terminate();
```
