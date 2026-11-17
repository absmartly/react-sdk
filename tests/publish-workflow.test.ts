import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const WORKFLOW = readFileSync(
  resolve(__dirname, "../.github/workflows/publish.yml"),
  "utf8",
);

// Returns the text of the step with the given name, up to the next step.
function step(name: string) {
  const start = WORKFLOW.indexOf(`- name: ${name}\n`);
  expect(start, `step "${name}"`).toBeGreaterThanOrEqual(0);
  const next = WORKFLOW.indexOf("\n      - name: ", start + 1);
  return WORKFLOW.slice(start, next === -1 ? undefined : next);
}

describe("publish workflow", () => {
  it("publishes only on tag pushes or non-dry manual runs of new versions", () => {
    const publish = step("Publish to npm");
    expect(publish).toContain(
      "steps.release.outputs.already_published != 'true' &&",
    );
    expect(publish).toContain(
      "(github.event_name == 'push' || inputs.dry_run == false)",
    );
  });

  it("requires a matching tag for every run that can publish", () => {
    expect(step("Check tag and resolve npm dist-tag")).toContain(
      "REQUIRE_TAG: ${{ github.event_name == 'push' || inputs.dry_run == false }}",
    );
  });

  it("publishes with provenance and the resolved dist-tag", () => {
    const publish = step("Publish to npm");
    expect(publish).toContain(
      "ARGS=(--provenance --access public --ignore-scripts)",
    );
    expect(publish).toContain(
      "DIST_TAG: ${{ steps.release.outputs.dist_tag }}",
    );
    expect(publish).toContain('ARGS+=(--tag "$DIST_TAG")');
    expect(publish).toContain('npm publish "${ARGS[@]}"');
  });

  it("never moves dist-tags", () => {
    expect(WORKFLOW).not.toMatch(/npm dist-tags? (add|rm|remove|set)\b/);
  });

  it("runs in the npm environment with OIDC permissions", () => {
    expect(WORKFLOW).toContain("    environment: npm\n");
    expect(WORKFLOW).toMatch(
      /permissions:\n {6}contents: read\n {6}id-token: write\n/,
    );
  });

  it("does not restore a dependency cache or run install scripts", () => {
    expect(WORKFLOW).not.toMatch(/^\s*cache:/m);
    expect(step("Install dependencies")).toContain(
      "yarn install --frozen-lockfile --ignore-scripts",
    );
  });
});
