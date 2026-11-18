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

// Returns the command of a step's single-line `run:`.
function runLine(name: string) {
  const match = /\n {8}run: (?!\|)(.*)\n?/.exec(step(name));
  expect(match, `single-line run of "${name}"`).not.toBeNull();
  return match![1];
}

// Returns the shell script of a step's `run: |` block.
function runScript(name: string) {
  const lines = step(name).split("\n");
  const start = lines.findIndex((line) => line.trim() === "run: |");
  expect(start, `run block of "${name}"`).toBeGreaterThanOrEqual(0);
  const body = lines.slice(start + 1);
  const indent = body[0].length - body[0].trimStart().length;
  const end = body.findIndex(
    (line) =>
      line.trim() !== "" && line.length - line.trimStart().length < indent,
  );
  return body
    .slice(0, end === -1 ? undefined : end)
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
    writeFileSync(
      join(dir, "bin/npm"),
      [
        "#!/bin/sh",
        'case "$*" in',
        '  "view @absmartly/react-sdk dist-tags.latest") echo "$FAKE_LATEST" ;;',
        '  "view @absmartly/react-sdk versions --json") echo "$FAKE_VERSIONS"; exit "${FAKE_VERSIONS_EXIT:-0}" ;;',
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

  it("skips an already published version of a single-version package", () => {
    expect(
      release("1.4.2", { ...tagPush("v1.4.2"), FAKE_VERSIONS: '"1.4.2"' }),
    ).toMatchObject({ code: 0, outputs: { already_published: "true" } });
  });

  it("fails when npm cannot list the published versions", () => {
    const result = release("1.4.3", {
      ...tagPush("v1.4.3"),
      FAKE_VERSIONS_EXIT: "72",
    });
    expect(result.code).toBe(72);
    expect(result.outputs).toEqual({});
  });

  it.each(["", "not json", "{}", "null"])(
    "fails when npm lists the published versions as %j",
    (versions) => {
      const result = release("1.4.3", {
        ...tagPush("v1.4.3"),
        FAKE_VERSIONS: versions,
      });
      expect(result.code).not.toBe(0);
      expect(result.outputs).toEqual({});
    },
  );

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

describe("publish workflow preview and publish steps", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "publish-steps-"));
    mkdirSync(join(dir, "bin"));
    writeFileSync(
      join(dir, "bin/npm"),
      '#!/bin/sh\nprintf "%s\\n" "$*" >> "$NPM_CALLS"\n',
    );
    chmodSync(join(dir, "bin/npm"), 0o755);
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        main: "./lib/cjs/index.js",
        module: "./lib/esm/index.js",
        types: "./lib/esm/index.d.ts",
      }),
    );
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function run(name: string, env: Record<string, string> = {}) {
    writeFileSync(join(dir, "calls"), "");
    const result = spawnSync("bash", ["-c", runScript(name)], {
      cwd: dir,
      encoding: "utf8",
      env: {
        PATH: `${join(dir, "bin")}:${process.env.PATH ?? ""}`,
        NPM_CALLS: join(dir, "calls"),
        ...env,
      },
    });
    const calls = readFileSync(join(dir, "calls"), "utf8")
      .split("\n")
      .filter(Boolean);
    return { code: result.status, stderr: result.stderr, calls };
  }

  function build(files: string[]) {
    for (const file of files) {
      mkdirSync(join(dir, file, ".."), { recursive: true });
      writeFileSync(join(dir, file), "");
    }
  }

  it("previews the package when every entry point is built", () => {
    build(["lib/cjs/index.js", "lib/esm/index.js", "lib/esm/index.d.ts"]);
    expect(run("Preview package contents")).toMatchObject({
      code: 0,
      calls: ["pack --dry-run --ignore-scripts"],
    });
  });

  it.each(["lib/cjs/index.js", "lib/esm/index.js", "lib/esm/index.d.ts"])(
    "fails before npm pack when %s is missing",
    (missing) => {
      build(
        ["lib/cjs/index.js", "lib/esm/index.js", "lib/esm/index.d.ts"].filter(
          (file) => file !== missing,
        ),
      );
      const result = run("Preview package contents");
      expect(result.code).toBe(1);
      expect(result.stderr).toContain(
        `::error::Build output ./${missing} is missing`,
      );
      expect(result.calls).toEqual([]);
    },
  );

  it("publishes as latest when there is no dist-tag", () => {
    expect(run("Publish to npm", { DIST_TAG: "" })).toMatchObject({
      code: 0,
      calls: ["publish --provenance --access public --ignore-scripts"],
    });
  });

  it("publishes with the resolved dist-tag", () => {
    expect(run("Publish to npm", { DIST_TAG: "v1-latest" })).toMatchObject({
      code: 0,
      calls: [
        "publish --provenance --access public --ignore-scripts --tag v1-latest",
      ],
    });
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
      /^concurrency:\n {2}group: publish\n {2}cancel-in-progress: false\n(?: {2}#.*\n)? {2}queue: max\n/m,
    );
  });

  it("points npm at the public registry", () => {
    expect(step("Setup Node.js")).toContain(
      'registry-url: "https://registry.npmjs.org"',
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
    expect(runLine("Run tests")).toBe("yarn test --run");
    expect(runLine("Build")).toBe("yarn build");
  });

  it("requires npm >= 11.5.1", () => {
    expect(runScript("Update npm")).toBe(
      [
        "set -euo pipefail",
        "npm install -g npm@11",
        "NPM_VERSION=$(npm --version)",
        'node .github/scripts/publish-checks.mjs npm-version "$NPM_VERSION"',
        'echo "npm $NPM_VERSION"',
      ].join("\n"),
    );
  });

  it("runs the release checks exactly as tested above", () => {
    expect(runScript("Check tag and resolve npm dist-tag")).toBe(
      [
        "set -euo pipefail",
        "VERSION=$(node -p \"require('./package.json').version\")",
        "REPOSITORY=$(node -p \"JSON.stringify(require('./package.json').repository ?? null)\")",
        "LATEST_VERSION=$(npm view @absmartly/react-sdk dist-tags.latest)",
        'if [ -z "$LATEST_VERSION" ]; then',
        '  echo "::error::Could not read the current latest version from npm" >&2',
        "  exit 1",
        "fi",
        "# As in javascript-sdk: an already published version (e.g. a re-run)",
        "# is a green no-op rather than a failing publish.",
        "PUBLISHED_VERSIONS=$(npm view @absmartly/react-sdk versions --json)",
        'ALREADY_PUBLISHED=$(node .github/scripts/publish-checks.mjs published "$VERSION" "$PUBLISHED_VERSIONS")',
        'if [ "$ALREADY_PUBLISHED" = true ]; then',
        '  echo "::notice::@absmartly/react-sdk@${VERSION} is already on npm; publish will be skipped"',
        "fi",
        "export VERSION REPOSITORY LATEST_VERSION",
        "DIST_TAG=$(node .github/scripts/publish-checks.mjs)",
        'echo "Publishing ${VERSION} (npm latest: ${LATEST_VERSION}, dist-tag: ${DIST_TAG:-latest})"',
        'echo "version=${VERSION}" >> "$GITHUB_OUTPUT"',
        'echo "dist_tag=${DIST_TAG}" >> "$GITHUB_OUTPUT"',
        'echo "already_published=${ALREADY_PUBLISHED}" >> "$GITHUB_OUTPUT"',
      ].join("\n"),
    );
  });

  it("passes the ref name to the release checks", () => {
    expect(step("Check tag and resolve npm dist-tag")).toContain(
      "REF_NAME: ${{ github.ref_name }}",
    );
  });

  it("fails before publishing when the build output is missing", () => {
    expect(runScript("Preview package contents")).toBe(
      [
        "set -euo pipefail",
        "# package.json main, module and types must all exist after the build.",
        `for f in $(node -p "const p = require('./package.json'); [p.main, p.module, p.types].join(' ')"); do`,
        '  test -f "$f" || { echo "::error::Build output $f is missing" >&2; exit 1; }',
        "done",
        "npm pack --dry-run --ignore-scripts",
      ].join("\n"),
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
    expect(step("Publish to npm")).toContain(
      "DIST_TAG: ${{ steps.release.outputs.dist_tag }}",
    );
    expect(runScript("Publish to npm")).toBe(
      [
        "set -euo pipefail",
        "ARGS=(--provenance --access public --ignore-scripts)",
        'if [ -n "$DIST_TAG" ]; then',
        '  ARGS+=(--tag "$DIST_TAG")',
        "fi",
        'npm publish "${ARGS[@]}"',
      ].join("\n"),
    );
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
    expect(runLine("Install dependencies")).toBe(
      "yarn install --frozen-lockfile --ignore-scripts",
    );
  });
});
