const { readFileSync, writeFileSync } = require("fs");

if (!process.env.WORKER_FILENAME) throw Error("missing WORKER_FILENAME");
if (!process.env.WORKER_STRING_FILENAME) throw Error("missing WORKER_STRING_FILENAME");

let workerScript = readFileSync(process.env.WORKER_FILENAME, "utf-8");

const stringified = JSON.stringify(workerScript);

const workerString = `module.exports = { workerString: ${stringified} };`;

eval(workerString);

writeFileSync(process.env.WORKER_STRING_FILENAME, workerString);

const required = require(process.env.WORKER_STRING_FILENAME);

if (typeof required.workerString !== "string") throw Error("uh oh");
