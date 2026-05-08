import esbuild from "esbuild";
import process from "node:process";

const isProd = process.argv[2] === "production";

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "cjs",
  target: "es2020",
  outfile: "main.js",
  minify: isProd,
  sourcemap: isProd ? false : "inline",
  metafile: true,
  treeShaking: true,
  external: ["obsidian"],
});
