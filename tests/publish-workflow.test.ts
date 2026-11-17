import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

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

// Returns the shell script of a step's `run: |` block.
function runScript(name: string) {
  const lines = step(name).split("\n");
  const start = lines.findIndex((line) => line.trim() === "run: |");
  expect(start, `run block of "${name}"`).toBeGreaterThanOrEqual(0);
  const body = lines.slice(start + 1);
  const indent = body[0].length - body[0].trimStart().length;
  return body
    .filter((line) => line.trim() !== "")
    .map((line) => line.slice(indent))
    .join("\n");
}

describe("publish workflow release step", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "publish-release-"));
    mkdirSync(join(dir, "bin"));
    mkdirSync(join(dir, ".github/scripts"), { recursive: true });
    copyFileSync(
      resolve(__dirname, "../.github/scripts/publish-checks.mjs"),
      join(dir, ".github/scripts/publish-checks.mjs"),
    );
    // Fake npm answering the two registry queries of the release step.
    writeFileSync(
      join(dir, "bin/npm"),
      [
        "#!/bin/sh",
        'case "$*" in',
        '  "view @absmartly/react-sdk dist-tags.latest") echo "$FAKE_LATEST" ;;',
        '  "view @absmartly/react-sdk versions --json") echo "$FAKE_VERSIONS" ;;',
        '  *) echo "unexpected npm $*" >&2; exit 2 ;;',
        "esac",
      ].join("\n"),
    );
    chmodSync(join(dir, "bin/npm"), 0o755);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function release(version: string, env: Record<string, string>) {
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        version,
        repository: {
          type: "git",
          url: "git+https://github.com/absmartly/react-sdk.git",
        },
      }),
    );
    writeFileSync(join(dir, "output"), "");
    const result = spawnSync(
      "bash",
      ["-c", runScript("Check tag and resolve npm dist-tag")],
      {
        cwd: dir,
        encoding: "utf8",
        env: {
          PATH: `${join(dir, "bin")}:${process.env.PATH ?? ""}`,
          GITHUB_OUTPUT: join(dir, "output"),
          GITHUB_REPOSITORY: "absmartly/react-sdk",
          FAKE_LATEST: "1.4.2",
          FAKE_VERSIONS: '["1.4.1","1.4.2"]',
          ...env,
        },
      },
    );
    const outputs = Object.fromEntries(
      readFileSync(join(dir, "output"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((line) => line.split(/=(.*)/s).slice(0, 2)),
    );
    return { code: result.status, stderr: result.stderr, outputs };
  }

  const tagPush = (tag: string) => ({
    REF_TYPE: "tag",
    REF_NAME: tag,
    REQUIRE_TAG: "true",
  });

  it("publishes a new version as latest", () => {
    expect(release("1.4.3", tagPush("v1.4.3"))).toMatchObject({
      code: 0,
      outputs: { version: "1.4.3", dist_tag: "", already_published: "false" },
    });
  });

  it("keeps a 1.x patch off latest when npm latest is 2.x", () => {
    expect(
      release("1.4.3", { ...tagPush("v1.4.3"), FAKE_LATEST: "2.0.0" }),
    ).toMatchObject({
      code: 0,
      outputs: { dist_tag: "v1-latest", already_published: "false" },
    });
  });

  it("skips an already published version", () => {
    expect(release("1.4.2", tagPush("v1.4.2"))).toMatchObject({
      code: 0,
      outputs: { already_published: "true" },
    });
  });

  it("fails when the tag does not match package.json", () => {
    const result = release("1.4.3", tagPush("v1.4.4"));
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/does not match/);
  });

  it("fails when npm returns no latest version", () => {
    const result = release("1.4.3", { ...tagPush("v1.4.3"), FAKE_LATEST: "" });
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/Could not read the current latest version/);
  });

  it("allows a dry run from a branch", () => {
    expect(
      release("1.4.3", {
        REF_TYPE: "branch",
        REF_NAME: "main",
        REQUIRE_TAG: "false",
      }),
    ).toMatchObject({ code: 0, outputs: { already_published: "false" } });
  });

  it("fails a real publish from a branch", () => {
    const result = release("1.4.3", {
      REF_TYPE: "branch",
      REF_NAME: "main",
      REQUIRE_TAG: "true",
    });
    expect(result.code).not.toBe(0);
    expect(result.stderr).toMatch(/requires a v\* tag ref/);
  });
});

describe("publish workflow", () => {
  it("runs on v* tag pushes and manual runs that default to a dry run", () => {
    expect(WORKFLOW).toMatch(
      /^on:\n {2}push:\n {4}tags:\n {6}- "v\*"\n {2}workflow_dispatch:\n {4}inputs:\n {6}dry_run:\n(?: {8}.*\n)*? {8}type: boolean\n {8}default: true\n/m,
    );
    expect(WORKFLOW).not.toMatch(/^\s+branches:/m);
  });

  it("runs one release at a time across all refs", () => {
    expect(WORKFLOW).toMatch(
      /^concurrency:\n {2}group: publish\n {2}cancel-in-progress: false\n {2}queue: max\n/m,
    );
  });

  it("uses Node 22 or newer", () => {
    const version = /node-version: "(\d+)"/.exec(step("Setup Node.js"));
    expect(Number(version?.[1])).toBeGreaterThanOrEqual(22);
  });

  it("defines NODE_AUTH_TOKEN for Yarn and sets the secret only on publish", () => {
    expect(WORKFLOW).toMatch(
      /\n {4}env:\n(?: {6}#.*\n)* {6}NODE_AUTH_TOKEN: ""\n/,
    );
    expect(WORKFLOW.match(/secrets\.NPM_TOKEN/g)).toHaveLength(1);
    expect(step("Publish to npm")).toContain(
      "NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}",
    );
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
    expect(update).toMatch(
      /node -e '\n\s*const \[a, b, c\] = process\.argv\[1\]\.split\("\."\)\.map\(Number\);\n\s*if \(a < 11 \|\| \(a === 11 && \(b < 5 \|\| \(b === 5 && c < 1\)\)\)\) \{\n/,
    );
    expect(update).toContain(`' "$NPM_VERSION"`);
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
    expect(preview).toContain(
      'test -f "$f" || { echo "::error::Build output $f is missing" >&2; exit 1; }',
    );
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
