#!/usr/bin/env node
const { execFileSync, execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function main() {
  const cacheDir = path.resolve(process.cwd(), ".npm-cache", "packcheck");
  const output = execSync(
    `npm pack --dry-run --json --ignore-scripts --cache "${cacheDir}"`,
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  const parsed = parseNpmPackJson(output);
  const files = Array.isArray(parsed) && parsed[0]?.files ? parsed[0].files : [];
  const paths = files.map((entry) => entry.path);

  verifyCjsMetadata();
  verifyTokenSubpathMetadata();
  verifyTokenRuntimeEntrypoints();
  ensureTarballIncludes(paths, "dist-cjs/package.json");
  ensureTarballIncludes(paths, "dist/tokens.js");
  ensureTarballIncludes(paths, "dist/tokens.d.ts");
  ensureTarballIncludes(paths, "dist-cjs/tokens.js");
  ensureTarballIncludes(
    paths,
    "dist/components/token-overview-panel/TokenOverviewPanel.css"
  );

  const forbiddenTarballPathPatterns = [
    {
      label: "private monorepo path",
      regex: /(?:^|\/)plasius-ltd-site(?:\/|$)/i,
    },
    {
      label: "private app runtime path",
      regex: /(?:^|\/)(frontend|backend|dashboard|infra)(?:\/|$)/i,
    },
    {
      label: "local settings artifact",
      regex: /(?:^|\/)local\.settings(?:\.[^/]+)?\.json$/i,
    },
    {
      label: "azure host artifact",
      regex: /(?:^|\/)host\.json$/i,
    },
    {
      label: "generated tsp artifact",
      regex: /(?:^|\/)tsp-output(?:\/|$)/i,
    },
  ];

  const forbiddenPaths = paths.filter((filePath) =>
    forbiddenTarballPathPatterns.some(({ regex }) => regex.test(filePath))
  );

  if (forbiddenPaths.length > 0) {
    console.error("Public package check failed. Forbidden publish paths found:");
    for (const filePath of forbiddenPaths) {
      console.error(`- ${filePath}`);
    }
    process.exit(1);
  }

  const forbiddenCodeReferencePatterns = [
    {
      label: "private monorepo reference",
      regex: /\bplasius-ltd-site\b/i,
    },
    {
      label: "Plasius Ltd private reference",
      regex: /\bplasius(?:\s+|-)ltd\b/i,
    },
    {
      label: "proprietary PGP artifact reference",
      regex: /\bpgp[-_a-z0-9]*\b/i,
    },
    {
      label: "proprietary Lunari artifact reference",
      regex: /\blunari\b/i,
    },
    {
      label: "proprietary Pixelverse artifact reference",
      regex: /\bpixelverse\b/i,
    },
  ];

  const codeRoots = ["src", "tests", "demo"];
  const codeExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json"]);
  const violations = scanCodeReferences(
    codeRoots,
    codeExtensions,
    forbiddenCodeReferencePatterns
  );

  if (violations.length > 0) {
    console.error(
      "Public package check failed. Forbidden private/product code references found:"
    );
    for (const violation of violations) {
      console.error(`- ${violation.file}:${violation.line} (${violation.label})`);
    }
    process.exit(1);
  }

  console.log("Public package check passed.");
}


function verifyCjsMetadata() {
  const distCjsPackageJsonPath = path.resolve(process.cwd(), "dist-cjs/package.json");
  if (!fs.existsSync(distCjsPackageJsonPath)) {
    console.error(
      "Public package check failed. Missing dist-cjs/package.json for CommonJS runtime metadata."
    );
    process.exit(1);
  }

  const rawDistCjsPackageJson = fs.readFileSync(distCjsPackageJsonPath, "utf8");
  let parsedDistCjsPackageJson;
  try {
    parsedDistCjsPackageJson = JSON.parse(rawDistCjsPackageJson);
  } catch {
    console.error("Public package check failed. dist-cjs/package.json is not valid JSON.");
    process.exit(1);
  }

  if (parsedDistCjsPackageJson.type !== "commonjs") {
    console.error(
      "Public package check failed. dist-cjs/package.json must set {\"type\":\"commonjs\"}."
    );
    process.exit(1);
  }
}

function verifyTokenSubpathMetadata() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), "package.json"), "utf8")
  );
  const tokenExport = packageJson.exports?.["./tokens"];

  if (
    tokenExport?.types !== "./dist/tokens.d.ts" ||
    tokenExport?.import !== "./dist/tokens.js" ||
    tokenExport?.require !== "./dist-cjs/tokens.js" ||
    packageJson.exports?.["./tokens.css"] !==
      "./dist/components/token-overview-panel/TokenOverviewPanel.css"
  ) {
    console.error(
      "Public package check failed. The ./tokens export must map ESM, CJS, and types."
    );
    process.exit(1);
  }
}

function verifyTokenRuntimeEntrypoints() {
  const requiredExports = [
    "TokenOverviewPanel",
    "createTokenEconomyPresentation",
    "createProfileTranslationResolver",
  ];
  const assertion = `
    const missing = ${JSON.stringify(requiredExports)}.filter(
      (name) => typeof moduleUnderTest[name] !== "function"
    );
    if (missing.length > 0) throw new Error("Missing exports: " + missing.join(", "));
  `;

  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `const moduleUnderTest = await import("@plasius/profile/tokens");${assertion}`,
    ],
    { cwd: process.cwd(), stdio: "pipe" }
  );
  execFileSync(
    process.execPath,
    [
      "--eval",
      `const moduleUnderTest = require("@plasius/profile/tokens");${assertion}`,
    ],
    { cwd: process.cwd(), stdio: "pipe" }
  );
}

function ensureTarballIncludes(paths, requiredPath) {
  if (!paths.includes(requiredPath)) {
    console.error(`Public package check failed. npm pack output is missing ${requiredPath}.`);
    process.exit(1);
  }
}
function parseNpmPackJson(rawOutput) {
  const start = rawOutput.indexOf("[");
  const end = rawOutput.lastIndexOf("]");

  if (start < 0 || end < start) {
    throw new Error("Could not find npm pack JSON payload in command output.");
  }

  const jsonSlice = rawOutput.slice(start, end + 1);
  return JSON.parse(jsonSlice);
}

function scanCodeReferences(roots, extensions, patterns) {
  const allFiles = [];
  for (const root of roots) {
    allFiles.push(...collectFiles(path.resolve(process.cwd(), root), extensions));
  }

  const violations = [];
  for (const file of allFiles) {
    const contents = fs.readFileSync(file, "utf8");

    for (const pattern of patterns) {
      const matchIndex = contents.search(pattern.regex);
      if (matchIndex < 0) {
        continue;
      }

      const beforeMatch = contents.slice(0, matchIndex);
      const line = beforeMatch.split(/\r?\n/u).length;
      violations.push({
        file: path.relative(process.cwd(), file),
        line,
        label: pattern.label,
      });
      break;
    }
  }

  return violations;
}

function collectFiles(root, extensions) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "dist-cjs") {
        continue;
      }
      files.push(...collectFiles(fullPath, extensions));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

main();
