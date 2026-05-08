import fs from "node:fs";
import zlib from "node:zlib";

const file = process.argv[2] ?? "main.js";
const maxBytes = 1.5 * 1024 * 1024;
const maxGzip = 400 * 1024;

if (!fs.existsSync(file)) {
  console.error(`File not found: ${file}`);
  process.exit(1);
}

const buf = fs.readFileSync(file);
const gz = zlib.gzipSync(buf);
const size = buf.byteLength;
const gzipSize = gz.byteLength;

console.log(`bundle bytes: ${size}`);
console.log(`bundle gzip bytes: ${gzipSize}`);

if (size > maxBytes || gzipSize > maxGzip) {
  console.error(`Bundle budget exceeded. max bytes=${maxBytes}, max gzip=${maxGzip}`);
  process.exit(1);
}

console.log("Bundle budget OK");
