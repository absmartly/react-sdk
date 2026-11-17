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
  it("runs on v* tag pushes and manual runs that default to a dry run", () => {
    expect(WORKFLOW).toMatch(
      /^on:\n {2}push:\n {4}tags:\n {6}- "v\*"\n {2}workflow_dispatch:\n {4}inputs:\n {6}dry_run:\n(?: {8}.*\n)*? {8}type: boolean\n {8}default: true\n/m,
    );
    expect(WORKFLOW).not.toMatch(/^\s+branches:/m);
  });

  it("runs one release at a time across all refs", () => {
    expect(WORKFLOW).toMatch(
      /^concurrency:\n {2}group: publish\n {2}cancel-in-progress: false\n/m,
    );
  });

  it("uses Node 22 or newer", () => {
    const version = /node-version: "(\d+)"/.exec(step("Setup Node.js"));
    expect(Number(version?.[1])).toBeGreaterThanOrEqual(22);
  });

  it("does not leave the GitHub token in the checkout", () => {
    expect(step("Checkout code")).toContain("persist-credentials: false");
  });

  it("tests and builds before checking, previewing and publishing", () => {
    const order = [
      "Update npm",
      "Install dependencies",
      "Run tests",
      "Build",
      "Check tag and resolve npm dist-tag",
      "Preview package contents",
      "Publish to npm",
    ].map((name) => WORKFLOW.indexOf(`- name: ${name}\n`));
    expect(order.every((index) => index >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(step("Run tests")).toContain("run: yarn test --run");
    expect(step("Build")).toContain("run: yarn build");
  });

  it("requires npm >= 11.5.1", () => {
    const update = step("Update npm");
    expect(update).toContain("npm install -g npm@latest");
    expect(update).toContain(
      "if (a < 11 || (a === 11 && (b < 5 || (b === 5 && c < 1)))) {",
    );
    expect(update).toMatch(/older than 11\.5\.1.*\n\s*process\.exit\(1\);/);
  });

  it("compares against npm latest and detects published versions", () => {
    const release = step("Check tag and resolve npm dist-tag");
    expect(release).toContain("REF_NAME: ${{ github.ref_name }}");
    expect(release).toContain(
      `REPOSITORY=$(node -p "JSON.stringify(require('./package.json').repository ?? null)")`,
    );
    expect(release).toContain("export VERSION REPOSITORY LATEST_VERSION\n");
    expect(release).toContain(
      "LATEST_VERSION=$(npm view @absmartly/react-sdk dist-tags.latest)",
    );
    expect(release).toMatch(
      /if \[ -z "\$LATEST_VERSION" \]; then\n.*\n\s*exit 1/,
    );
    expect(release).toContain(
      `npm view @absmartly/react-sdk versions --json | jq -e --arg v "$VERSION" 'index($v) != null'`,
    );
    expect(release).toMatch(/then\n\s*ALREADY_PUBLISHED=true\n/);
    expect(release).toContain(
      'echo "already_published=${ALREADY_PUBLISHED}" >> "$GITHUB_OUTPUT"',
    );
    expect(release).toContain(
      'echo "dist_tag=${DIST_TAG}" >> "$GITHUB_OUTPUT"',
    );
    expect(release).toContain(
      "DIST_TAG=$(node .github/scripts/publish-checks.mjs)",
    );
  });

  it("fails before publishing when the build output is missing", () => {
    const preview = step("Preview package contents");
    expect(preview).toContain("[p.main, p.module, p.types]");
    expect(preview).toContain('test -f "$f" || {');
  });

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
