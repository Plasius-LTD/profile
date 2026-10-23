import { spawnSync } from "node:child_process";
import {
  chmodSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const metadata = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const assets = [
  "Pages/Settings/Settings.module.css",
  "components/avatar-upload-panel/AvatarUploadPanel.module.css",
  "components/token-overview-panel/TokenOverviewPanel.css",
];
const outputs = ["dist", "dist-cjs"];
const fixtures: string[] = [];

afterEach(() => {
  for (const dir of fixtures.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function put(dir: string, name: string, value: string) {
  mkdirSync(dirname(join(dir, name)), { recursive: true });
  writeFileSync(join(dir, name), value);
}

function fixture() {
  const dir = mkdtempSync(join(tmpdir(), "profile-css-"));
  fixtures.push(dir);
  put(dir, "package.json", JSON.stringify(metadata));
  mkdirSync(join(dir, "scripts"));
  for (const name of readdirSync(join(root, "scripts"))) {
    symlinkSync(join(root, "scripts", name), join(dir, "scripts", name));
  }
  for (const asset of assets) put(dir, `src/${asset}`, `/* ${asset} */\n.test { color: red; }\n`);
  // The compiler is isolated: these tests exercise the actual npm build chain
  // and copier, while the full suite separately checks real TypeScript output.
  put(dir, "node_modules/.bin/tsc", `#!${process.execPath}\nprocess.exit(Number(process.env.CSS_TEST_TSC_EXIT || 0));\n`);
  chmodSync(join(dir, "node_modules/.bin/tsc"), 0o755);
  return dir;
}

function run(dir: string, script: string, extraEnv: Record<string, string> = {}) {
  const result = spawnSync("npm", ["run", script], {
    cwd: dir, encoding: "utf8", timeout: 15000,
    env: { ...process.env, npm_config_cache: join(dir, ".npm-cache"), ...extraEnv },
  });
  expect(result.error).toBeUndefined();
  return result;
}

function packedFixture() {
  const dir = fixture();
  for (const output of outputs) {
    for (const asset of assets) put(dir, `${output}/${asset}`, readFileSync(join(dir, "src", asset), "utf8"));
  }
  put(dir, "dist-cjs/package.json", '{"type":"commonjs"}');
  const names = ["TokenOverviewPanel", "createTokenEconomyPresentation", "createTokenPortfolioEconomyPresentation", "createProfileTranslationResolver"];
  put(dir, "dist/tokens.js", names.map(name => `export function ${name}() {}`).join("\n"));
  put(dir, "dist-cjs/tokens.js", names.map(name => `exports.${name} = function() {};`).join("\n"));
  put(dir, "dist/tokens.d.ts", names.map(name => `export declare function ${name}(): void;`).join("\n"));
  return dir;
}

describe("CSS build and package integrity", () => {
  it("keeps build and package validation blocking in CI and read-only CD", () => {
    const ci = readFileSync(join(root, ".github/workflows/ci.yml"), "utf8");
    const cd = readFileSync(join(root, ".github/workflows/cd.yml"), "utf8");
    expect(ci).toMatch(/run: npm run build[^\n]*\n[\s\S]*?run: npm run pack:check/u);
    expect(cd).toMatch(/if has_script build; then npm run build; fi[\s\S]*?if has_script pack:check; then npm run pack:check; fi/u);
  });
  it("builds byte-identical source-relative CSS in both formats, including future CSS files", () => {
    const dir = fixture();
    put(dir, "src/nested/new.css", ".new { content: '✓'; }\n");
    const result = run(dir, "build");
    expect(result.status, result.stderr).toBe(0);
    for (const output of outputs) {
      for (const asset of [...assets, "nested/new.css"]) {
        expect(readFileSync(join(dir, output, asset))).toEqual(readFileSync(join(dir, "src", asset)));
      }
    }
  });

  for (const asset of assets) {
    it(`rejects a missing source ${asset} even when stale output exists`, () => {
      const dir = packedFixture();
      rmSync(join(dir, "src", asset));
      expect(run(dir, "build").status).not.toBe(0);
    });
  }

  for (const output of outputs) {
    it(`propagates a copy failure in ${output}`, () => {
      const dir = fixture();
      put(dir, output, "a file blocks the destination directory");
      expect(run(dir, "build").status).not.toBe(0);
    });
  }

  for (const script of ["build", "build:cjs"]) {
    it(`${script} propagates a compiler failure`, () => {
      expect(run(fixture(), script, { CSS_TEST_TSC_EXIT: "17" }).status).not.toBe(0);
    });
  }

  it("build:cjs independently rejects missing required CSS", () => {
    const dir = fixture();
    rmSync(join(dir, "src", assets[0]!));
    expect(run(dir, "build:cjs").status).not.toBe(0);
  });

  it("accepts a complete package", () => {
    const result = run(packedFixture(), "pack:check");
    expect(result.status, result.stderr).toBe(0);
  });

  for (const output of outputs) {
    for (const asset of assets) {
      it(`rejects missing ${output}/${asset}`, () => {
        const dir = packedFixture();
        rmSync(join(dir, output, asset));
        expect(run(dir, "pack:check").status).not.toBe(0);
      });

      it(`rejects stale bytes in ${output}/${asset}`, () => {
        const dir = packedFixture();
        put(dir, `${output}/${asset}`, "stale CSS");
        expect(run(dir, "pack:check").status).not.toBe(0);
      });

      it(`rejects tarball omission of ${output}/${asset} even when the file exists`, () => {
        const dir = packedFixture();
        const files = ["dist-cjs/package.json", "dist/tokens.js", "dist/tokens.d.ts", "dist-cjs/tokens.js", ...outputs.flatMap(o => assets.map(a => `${o}/${a}`))];
        put(dir, "package.json", JSON.stringify({ ...metadata, files: files.filter(file => file !== `${output}/${asset}`) }));
        expect(run(dir, "pack:check").status).not.toBe(0);
      });
    }
  }
});
