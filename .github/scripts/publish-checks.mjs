import { pathToFileURL } from "node:url";

// Numeric prerelease identifiers must not have leading zeroes ("beta.01"):
// npm would normalise the version and no longer match the tag.
const PRERELEASE_ID = "(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)";
const SEMVER = new RegExp(
  "^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)" +
    `(?:-(${PRERELEASE_ID}(?:\\.${PRERELEASE_ID})*))?` +
    "(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$",
);

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

// Trusted Publishing requires npm >= 11.5.1.
export function assertNpmVersion(npmVersion) {
  const npm = parseVersion(npmVersion);
  const order = compareRelease(npm, { major: 11, minor: 5, patch: 1 });
  if (order < 0 || (order === 0 && npm.prerelease.length > 0)) {
    throw new Error(
      `npm ${npmVersion} is older than 11.5.1, required for Trusted Publishing`,
    );
  }
}

// npm drops build metadata ("+build.1") on publish, so a re-run would not be
// seen as published.
export function assertPublishableVersion(version) {
  parseVersion(version);
  if (version.includes("+")) {
    throw new Error(
      `package.json version "${version}" must not contain build metadata: npm drops it`,
    );
  }
}

// The pushed tag must be exactly "v" + package.json version.
export function assertTagMatchesVersion(tag, version) {
  assertPublishableVersion(version);
  if (tag !== `v${version}`) {
    throw new Error(
      `Tag "${tag}" does not match package.json version "${version}" (expected "v${version}")`,
    );
  }
}

// Provenance and Trusted Publishing require package.json repository.url to
// point at the GitHub repository running the workflow.
export function assertRepositoryMatches(repository, githubRepository) {
  const url = typeof repository === "string" ? repository : repository?.url;
  const match = /^(?:git\+)?https:\/\/github\.com\/([^/]+\/[^/]+?)(?:\.git)?$/.exec(
    url ?? "",
  );
  if (!match || match[1].toLowerCase() !== githubRepository?.toLowerCase()) {
    throw new Error(
      `package.json repository.url "${url ?? ""}" must be https://github.com/${githubRepository}`,
    );
  }
}

// `npm view <pkg> versions --json` prints an array, or a bare string when only
// one version exists. Anything else is a failed lookup, not "not published".
export function isPublished(versionsJson, version) {
  let versions;
  try {
    versions = JSON.parse(versionsJson);
  } catch {
    versions = undefined;
  }
  if (typeof versions === "string") versions = [versions];
  if (!Array.isArray(versions)) {
    throw new Error(`Unexpected npm versions output: "${versionsJson}"`);
  }
  return versions.includes(version);
}

function compareRelease(a, b) {
  return a.major - b.major || a.minor - b.minor || a.patch - b.patch;
}

// npm rejects dist-tags that are valid semver ranges ("v1", "1.4", "v1.4.x",
// "x", "*"), so tags are always suffixed, e.g. "v1-latest".
const SEMVER_RANGE_LIKE = /^[v=]?(?:\d+|[xX*])(?:\.(?:\d+|[xX*]))*$/;

export function assertValidDistTag(tag) {
  if (SEMVER_RANGE_LIKE.test(tag)) {
    throw new Error(`npm dist-tag "${tag}" must not be a semver range`);
  }
}

// Returns the dist-tag to pass to `npm publish --tag`, or "" to use npm's default ("latest").
// - Stable release not older than latest: "" (becomes latest).
// - Stable release on an older major than latest: "v<major>-latest", so a 1.x patch never becomes latest.
// - Stable release on latest's major but older than latest: "v<major>.<minor>-latest".
// - Prerelease: its first identifier (e.g. "beta"), prefixed "v<major>-" when on an older major,
//   or "v<major>.<minor>-" when below latest on its major, so a shared channel never moves back.
export function resolveDistTag(version, latestVersion) {
  const tag = distTagFor(version, latestVersion);
  if (tag) assertValidDistTag(tag);
  return tag;
}

function distTagFor(version, latestVersion) {
  const current = parseVersion(version);
  const latest = parseVersion(latestVersion);
  const olderMajor = current.major < latest.major;
  if (current.prerelease.length > 0) {
    const first = current.prerelease[0];
    const id =
      /^[A-Za-z][0-9A-Za-z-]*$/.test(first) && first !== "latest"
        ? first
        : "next";
    if (olderMajor) return `v${current.major}-${id}`;
    // A prerelease of a stable latest's own release ("1.4.2-beta.1") is also below it.
    const order = compareRelease(current, latest);
    if (order < 0 || (order === 0 && latest.prerelease.length === 0)) {
      return `v${current.major}.${current.minor}-${id}`;
    }
    return id;
  }
  if (olderMajor) return `v${current.major}-latest`;
  if (compareRelease(current, latest) < 0) {
    return `v${current.major}.${current.minor}-latest`;
  }
  return "";
}

function main() {
  if (process.argv[2] === "npm-version") {
    assertNpmVersion(process.argv[3]);
    return;
  }
  if (process.argv[2] === "published") {
    process.stdout.write(String(isPublished(process.argv[4], process.argv[3])));
    return;
  }
  const {
    VERSION,
    REPOSITORY,
    GITHUB_REPOSITORY,
    REF_TYPE,
    REF_NAME,
    LATEST_VERSION,
    REQUIRE_TAG,
  } = process.env;
  assertRepositoryMatches(JSON.parse(REPOSITORY || "null"), GITHUB_REPOSITORY);
  assertPublishableVersion(VERSION);
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
