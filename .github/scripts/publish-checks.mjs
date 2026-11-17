// Release checks for .github/workflows/publish.yml.
// Pure helpers are exported for tests; the CLI prints the npm dist-tag to use.

import { pathToFileURL } from "node:url";

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export function parseVersion(version) {
  const match = SEMVER.exec(version ?? "");
  if (!match) throw new Error(`Invalid semver version: "${version}"`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

// The pushed tag must be exactly "v" + package.json version.
export function assertTagMatchesVersion(tag, version) {
  parseVersion(version);
  if (tag !== `v${version}`) {
    throw new Error(
      `Tag "${tag}" does not match package.json version "${version}" (expected "v${version}")`,
    );
  }
}

function compareRelease(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

// Returns the dist-tag to pass to `npm publish --tag`, or "" to use npm's default ("latest").
// - Stable release not older than latest: "" (becomes latest).
// - Stable release on an older major than latest: "v<major>", so a 1.x patch never becomes latest.
// - Stable release on latest's major but older than latest: "v<major>.<minor>".
// - Prerelease: its first identifier (e.g. "beta"), prefixed "v<major>-" when on an older major.
export function resolveDistTag(version, latestVersion) {
  const current = parseVersion(version);
  const latest = parseVersion(latestVersion);
  const olderMajor = current.major < latest.major;
  if (current.prerelease.length > 0) {
    const first = current.prerelease[0];
    const id = /^[A-Za-z][0-9A-Za-z-]*$/.test(first) ? first : "next";
    return olderMajor ? `v${current.major}-${id}` : id;
  }
  if (olderMajor) return `v${current.major}`;
  if (compareRelease(current, latest) < 0) {
    return `v${current.major}.${current.minor}`;
  }
  return "";
}

function main() {
  const { VERSION, REF_TYPE, REF_NAME, LATEST_VERSION, REQUIRE_TAG } =
    process.env;
  if (REF_TYPE === "tag") {
    assertTagMatchesVersion(REF_NAME, VERSION);
  } else if (REQUIRE_TAG === "true") {
    throw new Error(
      `Publishing requires a v* tag ref, got ${REF_TYPE} "${REF_NAME}"`,
    );
  } else {
    console.error(
      `::notice::Not a tag ref (${REF_TYPE} "${REF_NAME}"); tag/version check skipped for dry run`,
    );
  }
  process.stdout.write(resolveDistTag(VERSION, LATEST_VERSION));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(`::error::${error.message}`);
    process.exit(1);
  }
}
