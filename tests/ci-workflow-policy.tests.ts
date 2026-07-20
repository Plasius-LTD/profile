import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

describe("CI workflow trust boundary", () => {
  it("validates pushes to main and pull requests targeting main", () => {
    expect(workflow).toMatch(/push:\s*\n\s+branches:\s*\[main\]/u);
    expect(workflow).toMatch(/pull_request:\s*\n\s+branches:\s*\[main\]/u);
  });

  it("never exposes the self-hosted runner to fork pull requests", () => {
    expect(workflow).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository",
    );
    expect(workflow).toMatch(/runs-on:\s*\[self-hosted,\s*Linux,\s*X64\]/u);
  });
});
