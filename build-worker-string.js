const { readFileSync, writeFileSync } = require("fs");

let workerScript = readFileSync("./worker.min.js", "utf-8");

const APOSTROPHE = "APOSTROPHE";
const FORWARD_SLASH = "FORWARD_SLASH";
const NEW_LINE = "NEW_LINE";

if (workerScript.includes(NEW_LINE)) throw Error("ugh NEW_LINE");
if (workerScript.includes(APOSTROPHE)) throw Error("ugh APOSTROPHE");
if (workerScript.includes(FORWARD_SLASH)) throw Error("ugh FORWARD_SLASH");

const quoted = "'" + workerScript.replaceAll("\n", NEW_LINE).replaceAll("\\", FORWARD_SLASH).replaceAll("'", APOSTROPHE) + "'";

// test running quotes
eval(quoted);

const workerString = `module.exports = ${quoted}.replaceAll("NEW_LINE", "\\n").replaceAll("FORWARD_SLASH", "\\\\").replaceAll("APOSTROPHE", "'");`;

eval(workerString);

writeFileSync("./worker-string.js", workerString);
