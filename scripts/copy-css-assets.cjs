#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const requiredAssets = [
  "Pages/Settings/Settings.module.css",
  "components/avatar-upload-panel/AvatarUploadPanel.module.css",
  "components/token-overview-panel/TokenOverviewPanel.css",
];

function cssAssets(root) {
  const source = path.join(root, "src");
  for (const asset of requiredAssets) {
    if (!fs.lstatSync(path.join(source, asset)).isFile()) {
      throw new Error(`Required CSS source is not a regular file: ${asset}`);
    }
  }
  const assets = [];
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(source, relative), { withFileTypes: true })) {
      const name = path.posix.join(relative, entry.name);
      if (entry.isDirectory()) visit(name);
      else if (entry.name.endsWith(".css")) {
        if (!entry.isFile()) throw new Error(`CSS source is not a regular file: ${name}`);
        assets.push(name);
      }
    }
  }
  visit("");
  return assets.sort();
}

function verifyCssAssets(root, packedPaths) {
  for (const asset of cssAssets(root)) {
    const source = fs.readFileSync(path.join(root, "src", asset));
    for (const output of ["dist", "dist-cjs"]) {
      const name = `${output}/${asset}`;
      const target = path.join(root, name);
      if (!fs.lstatSync(target).isFile() || !fs.readFileSync(target).equals(source)) {
        throw new Error(`Built CSS differs from source: ${name}`);
      }
      if (!packedPaths.includes(name)) throw new Error(`npm pack output is missing ${name}`);
    }
  }
}

function copyCssAssets(root, output) {
  if (!["dist", "dist-cjs"].includes(output)) throw new Error("Expected dist or dist-cjs output");
  const assets = cssAssets(root);
  for (const asset of assets) {
    const target = path.join(root, output, asset);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    if (fs.existsSync(target) && !fs.lstatSync(target).isFile()) {
      throw new Error(`CSS destination is not a regular file: ${output}/${asset}`);
    }
    fs.copyFileSync(path.join(root, "src", asset), target);
    if (!fs.readFileSync(target).equals(fs.readFileSync(path.join(root, "src", asset)))) {
      throw new Error(`CSS copy verification failed: ${output}/${asset}`);
    }
  }
}

if (require.main === module) copyCssAssets(process.cwd(), process.argv[2]);
module.exports = { copyCssAssets, verifyCssAssets };
