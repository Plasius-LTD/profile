#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const requiredAssets = [
  "Pages/Settings/Settings.module.css",
  "components/avatar-upload-panel/AvatarUploadPanel.module.css",
  "components/token-overview-panel/TokenOverviewPanel.css",
];

function regularBytes(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0) | fs.constants.O_NONBLOCK);
  try {
    if (!fs.fstatSync(fd).isFile()) throw new Error(`CSS is not a regular file: ${file}`);
    return fs.readFileSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}

function cssFiles(directory) {
  const assets = [];
  function visit(relative) {
    for (const entry of fs.readdirSync(path.join(directory, relative), { withFileTypes: true })) {
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

function cssAssets(root) {
  for (const asset of requiredAssets) regularBytes(path.join(root, "src", asset));
  return cssFiles(path.join(root, "src"));
}

function verifyCssAssets(root, packedPaths) {
  const assets = cssAssets(root);
  for (const output of ["dist", "dist-cjs"]) {
    if (JSON.stringify(cssFiles(path.join(root, output))) !== JSON.stringify(assets)) {
      throw new Error(`Built CSS inventory differs from source: ${output}`);
    }
    const expectedPaths = assets.map(asset => `${output}/${asset}`);
    const actualPaths = packedPaths.filter(name => name.startsWith(`${output}/`) && name.endsWith(".css")).sort();
    if (JSON.stringify(actualPaths) !== JSON.stringify([...expectedPaths].sort())) {
      throw new Error(`npm pack CSS inventory differs from source: ${output}`);
    }
    for (const asset of assets) {
      const name = `${output}/${asset}`;
      if (!regularBytes(path.join(root, name)).equals(regularBytes(path.join(root, "src", asset)))) {
        throw new Error(`Built CSS differs from source: ${name}`);
      }
    }
  }
}

function copyCssAssets(root, output) {
  if (!["dist", "dist-cjs"].includes(output)) throw new Error("Expected dist or dist-cjs output");
  const assets = cssAssets(root);
  for (const asset of assets) {
    const target = path.join(root, output, asset);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const bytes = regularBytes(path.join(root, "src", asset));
    const fd = fs.openSync(target, fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_TRUNC | (fs.constants.O_NOFOLLOW || 0) | fs.constants.O_NONBLOCK);
    try {
      if (!fs.fstatSync(fd).isFile()) throw new Error(`CSS destination is not a regular file: ${output}/${asset}`);
      fs.writeFileSync(fd, bytes);
    } finally {
      fs.closeSync(fd);
    }
    if (!regularBytes(target).equals(bytes)) {
      throw new Error(`CSS copy verification failed: ${output}/${asset}`);
    }
  }
}

if (require.main === module) copyCssAssets(process.cwd(), process.argv[2]);
module.exports = { copyCssAssets, verifyCssAssets };
