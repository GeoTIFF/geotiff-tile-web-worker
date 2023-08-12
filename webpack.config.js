const path = require("path");
const webpack = require("webpack");
const envisage = require("envisage");
const TerserPlugin = require("terser-webpack-plugin");

const config = {
  target: "web",
  mode: null,
  entry: null,
  devtool: false, // "source-map"
  output: {
    path: null,
    filename: null,
    // globalObject: `(typeof window !== 'undefined' ? window : typeof self !== 'undefined' ? self : typeof global !== 'undefined' ? global : typeof this !== 'undefined' ? this : undefined)`,
    libraryTarget: "umd"
    // umdNamedDefine: true
  },
  resolve: {
    modules: [path.join(__dirname, "src"), "node_modules"],
    extensions: [".js", ".json"],
    alias: {
      // "geotiff": path.resolve(__dirname, './node_modules/geotiff/dist-module/geotiff.js'),
      // "geotiff-tile": path.resolve(__dirname, './node_modules/geotiff-tile/dist/web/geotiff-tile.min.js'),
    }
  },
  module: {
    rules: [
      {
        test: /\.js/,
        loader: "babel-loader",
        exclude: modulePath => {
          const excluded =
            /node_modules/.test(modulePath) &&
            !/node_modules\/webpack-dev-server/.test(modulePath) &&
            !/node_modules\/map-obj/.test(modulePath) &&
            !modulePath.includes("microlink");
          // if (excluded) console.log("excluding:", modulePath);
          return excluded;
        },
        options: {
          presets: [
            [
              "@babel/preset-env",
              {
                targets: {
                  ie: 11
                }
              }
            ]
          ],
          plugins: ["@babel/plugin-transform-runtime", "@babel/plugin-proposal-nullish-coalescing-operator", "@babel/plugin-proposal-optional-chaining"],
          // prevent https://github.com/babel/babel/issues/12731
          sourceType: "unambiguous"
        }
      },
      {
        test: path.resolve(__dirname, "node_modules/node-fetch/browser.js"),
        use: "null-loader"
      }
    ].filter(Boolean)
  },
  stats: {
    colors: true,
    chunks: true
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    })
  ],
  node: {},
  optimization: {
    minimizer: [new TerserPlugin({ extractComments: false })]
  }
};

// inject environmental variables
envisage.assign({ prefix: "WEBPACK", target: config });

if (!config.entry) throw new Error("no entry");
if (!config.mode) throw new Error("no mode");
if (!config.output.filename) throw new Error("no output.filename");
if (!config.output.path) throw new Error("no output.path");

module.exports = config;
