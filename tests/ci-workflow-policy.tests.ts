import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readWorkflow = (name: string): string =>
  readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), "utf8");

const ciWorkflow = readWorkflow("ci");
const cdWorkflow = readWorkflow("cd");
const releasePrepareWorkflow = readWorkflow("release-prepare");
const trustedProductionRunner =
  "runs-on: ${{ fromJSON(vars.CD_RUNNER_LABELS || '[\"self-hosted\",\"Linux\",\"X64\"]') }}";

describe("workflow trust boundaries", () => {
  it("validates pushes to main and pull requests targeting main", () => {
    expect(ciWorkflow).toMatch(/push:\s*\n\s+branches:\s*\[main\]/u);
    expect(ciWorkflow).toMatch(/pull_request:\s*\n\s+branches:\s*\[main\]/u);
  });

  it("never exposes the self-hosted runner to fork pull requests", () => {
    expect(ciWorkflow).toContain(
      "github.event.pull_request.head.repo.full_name == github.repository",
    );
    expect(ciWorkflow).not.toContain("pull_request_target:");
    expect(ciWorkflow).toMatch(/runs-on:\s*\[self-hosted,\s*Linux,\s*X64\]/u);
  });

  it("runs both production release jobs on the configurable trusted runner", () => {
    expect(cdWorkflow).toContain(trustedProductionRunner);
    expect(releasePrepareWorkflow).toContain(trustedProductionRunner);
    expect(releasePrepareWorkflow).not.toContain("runs-on: ubuntu-latest");
  });

  it("keeps production release workflows off pull-request triggers", () => {
    expect(cdWorkflow).toMatch(/on:\s*\n\s+workflow_dispatch:/u);
    expect(releasePrepareWorkflow).toMatch(/on:\s*\n\s+workflow_call:/u);
    expect(cdWorkflow).not.toMatch(/\n\s+pull_request(?:_target)?:/u);
    expect(releasePrepareWorkflow).not.toMatch(/\n\s+pull_request(?:_target)?:/u);
  });
});
