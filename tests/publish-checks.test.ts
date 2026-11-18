import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertNpmVersion,
  assertPublishableVersion,
  assertRepositoryMatches,
  assertTagMatchesVersion,
  assertValidDistTag,
  isPublished,
  parseVersion,
  resolveDistTag,
} from "../.github/scripts/publish-checks.mjs";

const SCRIPT = resolve(__dirname, "../.github/scripts/publish-checks.mjs");

const REPO_ENV = {
  REPOSITORY: JSON.stringify({
    type: "git",
    url: "git+https://github.com/absmartly/react-sdk.git",
  }),
  GITHUB_REPOSITORY: "absmartly/react-sdk",
};

function runScript(env: Record<string, string>) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      env: { PATH: process.env.PATH ?? "", ...REPO_ENV, ...env },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { code: 0, stdout, stderr: "" };
  } catch (error: any) {
    return {
      code: error.status,
      stdout: String(error.stdout),
      stderr: String(error.stderr),
    };
  }
}

describe("parseVersion", () => {
  it("parses stable and prerelease versions", () => {
    expect(parseVersion("1.4.2")).toEqual({
      major: 1,
      minor: 4,
      patch: 2,
      prerelease: [],
    });
    expect(parseVersion("2.0.0-beta.1+build.5")).toEqual({
      major: 2,
      minor: 0,
      patch: 0,
      prerelease: ["beta", "1"],
    });
  });

  it("accepts numeric and alphanumeric prerelease identifiers", () => {
    for (const version of [
      "1.4.3-beta.0",
      "1.4.3-beta.10",
      "1.4.3-0",
      "1.4.3-01a",
      "1.4.3-rc-1",
      "1.4.3-beta.1+001",
    ]) {
      expect(() => parseVersion(version)).not.toThrow();
    }
  });

  it.each([
    "",
    "v1.4.2",
    "1.4",
    "1.4.2.0",
    "01.4.2",
    "1.4.2-",
    "1.4.3-beta.01",
    "1.4.3-00",
    "1.4.3-beta..1",
    undefined,
  ])("rejects %s", (version) => {
    expect(() => parseVersion(version)).toThrow(/Invalid semver/);
  });
});

describe("assertTagMatchesVersion", () => {
  it("accepts v + version", () => {
    expect(() => assertTagMatchesVersion("v1.4.2", "1.4.2")).not.toThrow();
    expect(() =>
      assertTagMatchesVersion("v2.0.0-beta.1", "2.0.0-beta.1"),
    ).not.toThrow();
  });

  it("rejects an invalid version even when the tag matches it", () => {
    expect(() => assertTagMatchesVersion("vfoo", "foo")).toThrow(
      /Invalid semver/,
    );
  });

  it("rejects a version with build metadata", () => {
    expect(() =>
      assertTagMatchesVersion("v1.4.3+build.1", "1.4.3+build.1"),
    ).toThrow(/build metadata/);
  });

  it.each([
    ["v1.4.3", "1.4.2"],
    ["1.4.2", "1.4.2"],
    ["v1.4.2-beta.1", "1.4.2"],
    ["v1.4.2", "1.4.2-beta.1"],
    ["v1.4.2 ", "1.4.2"],
  ])("rejects tag %s for version %s", (tag, version) => {
    expect(() => assertTagMatchesVersion(tag, version)).toThrow(
      /does not match/,
    );
  });
});

describe("assertPublishableVersion", () => {
  it.each(["1.4.3", "2.0.0-beta.1"])("accepts %s", (version) => {
    expect(() => assertPublishableVersion(version)).not.toThrow();
  });

  it("rejects build metadata", () => {
    expect(() => assertPublishableVersion("1.4.3+build.1")).toThrow(
      /build metadata/,
    );
  });

  it("rejects an invalid version", () => {
    expect(() => assertPublishableVersion("1.4")).toThrow(/Invalid semver/);
  });
});

describe("isPublished", () => {
  it("finds the version in npm's array output", () => {
    expect(isPublished('["1.4.1","1.4.2"]', "1.4.2")).toBe(true);
    expect(isPublished('["1.4.1","1.4.2"]', "1.4.3")).toBe(false);
    expect(isPublished("[]", "1.4.3")).toBe(false);
  });

  it("accepts npm's bare string output for a single version", () => {
    expect(isPublished('"1.4.2"', "1.4.2")).toBe(true);
    expect(isPublished('"1.4.2"', "1.4.3")).toBe(false);
  });

  it.each([
    "",
    "not json",
    "{}",
    "null",
    "1",
    "[null]",
    '["1.4.2",1]',
    undefined,
  ])("rejects %j", (output) => {
    expect(() => isPublished(output, "1.4.3")).toThrow(
      /Unexpected npm versions output/,
    );
  });
});

describe("assertNpmVersion", () => {
  it.each(["11.5.1", "11.5.2", "11.6.0", "11.6.0-pre.0", "12.0.0", "12.2.2"])(
    "accepts %s",
    (version) => {
      expect(() => assertNpmVersion(version)).not.toThrow();
    },
  );

  it.each(["11.5.0", "11.4.9", "10.9.9", "9.2.0", "11.5.1-pre.0", "", "11.5"])(
    "rejects %s",
    (version) => {
      expect(() => assertNpmVersion(version)).toThrow(
        /older than 11\.5\.1|Invalid semver/,
      );
    },
  );
});

describe("assertRepositoryMatches", () => {
  it.each([
    [{ type: "git", url: "git+https://github.com/absmartly/react-sdk.git" }],
    [{ url: "https://github.com/absmartly/react-sdk" }],
    ["https://github.com/Absmartly/React-SDK.git"],
  ])("accepts %j", (repository) => {
    expect(() =>
      assertRepositoryMatches(repository, "absmartly/react-sdk"),
    ).not.toThrow();
  });

  it.each([
    [undefined],
    [null],
    [{}],
    [""],
    [{ url: "git+https://github.com/absmartly/javascript-sdk.git" }],
    [{ url: "git+https://github.com/absmartly/react-sdk-fork.git" }],
    [{ url: "git+https://gitlab.com/absmartly/react-sdk.git" }],
    [{ url: "http://github.com/absmartly/react-sdk.git" }],
  ])("rejects %j", (repository) => {
    expect(() =>
      assertRepositoryMatches(repository, "absmartly/react-sdk"),
    ).toThrow(/must be https:\/\/github.com\/absmartly\/react-sdk/);
  });

  it("matches this package.json", () => {
    expect(() =>
      assertRepositoryMatches(
        JSON.parse(readFileSync(resolve(__dirname, "../package.json"), "utf8"))
          .repository,
        "absmartly/react-sdk",
      ),
    ).not.toThrow();
  });
});

describe("assertValidDistTag", () => {
  it.each(["v1", "v1.4", "1", "1.4.2", "v1.x", "=1", "x", "X", "*", "x.x"])(
    "rejects %s",
    (tag) => {
      expect(() => assertValidDistTag(tag)).toThrow(/semver range/);
    },
  );

  it.each(["latest", "beta", "v1-latest", "v1.4-latest", "v1-beta", "next"])(
    "accepts %s",
    (tag) => {
      expect(() => assertValidDistTag(tag)).not.toThrow();
    },
  );
});

describe("resolveDistTag", () => {
  it.each([
    // stable, becomes latest
    ["1.4.3", "1.4.2", ""],
    ["1.5.0", "1.4.2", ""],
    ["2.0.0", "1.4.2", ""],
    ["1.4.2", "1.4.2", ""],
    // older major never becomes latest
    ["1.4.3", "2.0.0", "v1-latest"],
    ["1.99.99", "2.0.0", "v1-latest"],
    ["1.4.3", "10.0.0", "v1-latest"],
    ["9.0.0", "10.0.0", "v9-latest"],
    // older release on latest's major never becomes latest
    ["1.3.9", "1.4.2", "v1.3-latest"],
    ["1.4.1", "1.4.2", "v1.4-latest"],
    // prereleases
    ["1.4.3-beta.1", "1.4.2", "beta"],
    ["2.0.0-alpha.0", "1.4.2", "alpha"],
    ["2.0.0-rc.1", "1.4.2", "rc"],
    ["1.5.0-beta.0", "2.0.0", "v1-beta"],
    ["1.4.3-0", "1.4.2", "next"],
    ["2.0.0-latest.1", "1.4.2", "next"],
    ["1.5.0-latest", "2.0.0", "v1-next"],
    ["1.3.9-beta.0", "1.4.2", "v1.3-beta"],
    ["1.4.2-beta.1", "1.4.2", "v1.4-beta"],
    ["1.4.1-0", "1.4.2", "v1.4-next"],
    ["1.4.3-beta.0", "1.4.3-beta.1", "beta"],
  ])("version %s with latest %s -> %j", (version, latest, expected) => {
    expect(resolveDistTag(version, latest)).toBe(expected);
  });

  it("never returns a dist-tag npm rejects as a semver range", () => {
    for (const [version, latest] of [
      ["1.4.3", "2.0.0"],
      ["1.3.9", "1.4.2"],
      ["1.5.0-beta.0", "2.0.0"],
      ["1.3.9-beta.0", "1.4.2"],
    ]) {
      expect(resolveDistTag(version, latest)).not.toMatch(/^v?\d+(\.\d+)*$/);
    }
  });

  it.each([
    ["1.4.3-x.1", "1.4.2", "next"],
    ["1.5.0-X", "1.4.2", "next"],
    ["1.5.0-v1", "1.4.2", "next"],
    ["1.3.9-x", "1.4.2", "v1.3-x"],
    ["1.5.0-x", "2.0.0", "v1-x"],
  ])(
    "uses next for an unprefixed prerelease id npm would read as a range: %s with latest %s -> %j",
    (version, latest, expected) => {
      expect(resolveDistTag(version, latest)).toBe(expected);
    },
  );

  it("rejects an invalid latest version", () => {
    expect(() => resolveDistTag("1.4.3", "")).toThrow(/Invalid semver/);
  });
});

describe("publish-checks CLI", () => {
  it("prints nothing for a tag push that becomes latest", () => {
    const result = runScript({
      VERSION: "1.4.3",
      LATEST_VERSION: "1.4.2",
      REF_TYPE: "tag",
      REF_NAME: "v1.4.3",
      REQUIRE_TAG: "true",
    });
    expect(result).toMatchObject({ code: 0, stdout: "" });
  });

  it("prints v1-latest for a 1.x patch when latest is 2.x", () => {
    const result = runScript({
      VERSION: "1.4.3",
      LATEST_VERSION: "2.0.0",
      REF_TYPE: "tag",
      REF_NAME: "v1.4.3",
      REQUIRE_TAG: "true",
    });
    expect(result).toMatchObject({ code: 0, stdout: "v1-latest" });
  });

  it("fails when the tag does not match package.json", () => {
    const result = runScript({
      VERSION: "1.4.2",
      LATEST_VERSION: "1.4.2",
      REF_TYPE: "tag",
      REF_NAME: "v1.4.3",
      REQUIRE_TAG: "true",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/::error::Tag "v1.4.3" does not match/);
  });

  it("fails a dry run on a tag that does not match package.json", () => {
    const result = runScript({
      VERSION: "1.4.2",
      LATEST_VERSION: "1.4.2",
      REF_TYPE: "tag",
      REF_NAME: "v1.4.3",
      REQUIRE_TAG: "false",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/does not match/);
  });

  it("fails a real publish from a branch ref", () => {
    const result = runScript({
      VERSION: "1.4.3",
      LATEST_VERSION: "1.4.2",
      REF_TYPE: "branch",
      REF_NAME: "main",
      REQUIRE_TAG: "true",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/requires a v\* tag ref/);
  });

  it("allows a dry run from a branch ref", () => {
    const result = runScript({
      VERSION: "1.4.3",
      LATEST_VERSION: "1.4.2",
      REF_TYPE: "branch",
      REF_NAME: "main",
      REQUIRE_TAG: "false",
    });
    expect(result).toMatchObject({ code: 0, stdout: "" });
  });

  it("fails a branch dry run of a version with build metadata", () => {
    const result = runScript({
      VERSION: "1.4.3+build.1",
      LATEST_VERSION: "1.4.2",
      REF_TYPE: "branch",
      REF_NAME: "main",
      REQUIRE_TAG: "false",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/::error::.*must not contain build metadata/);
  });

  it("checks whether the version is published", () => {
    const published = (versions: string) =>
      spawnSync(process.execPath, [SCRIPT, "published", "1.4.2", versions], {
        encoding: "utf8",
      });
    expect(published('["1.4.1","1.4.2"]')).toMatchObject({
      status: 0,
      stdout: "true",
    });
    expect(published('["1.4.1"]')).toMatchObject({
      status: 0,
      stdout: "false",
    });
    const failed = published("{}");
    expect(failed.status).toBe(1);
    expect(failed.stderr).toMatch(/::error::Unexpected npm versions output/);
  });

  it("checks the npm version", () => {
    const ok = spawnSync(process.execPath, [SCRIPT, "npm-version", "11.5.1"], {
      encoding: "utf8",
    });
    expect(ok.status).toBe(0);
    const old = spawnSync(process.execPath, [SCRIPT, "npm-version", "11.5.0"], {
      encoding: "utf8",
    });
    expect(old.status).toBe(1);
    expect(old.stderr).toMatch(/::error::npm 11\.5\.0 is older than 11\.5\.1/);
  });

  it("fails when package.json has no repository", () => {
    const result = runScript({
      VERSION: "1.4.3",
      LATEST_VERSION: "1.4.2",
      REF_TYPE: "branch",
      REF_NAME: "main",
      REQUIRE_TAG: "false",
      REPOSITORY: "",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/repository.url "" must be/);
  });

  it("fails when the version is invalid", () => {
    const result = runScript({
      VERSION: "not-a-version",
      LATEST_VERSION: "1.4.2",
      REF_TYPE: "branch",
      REF_NAME: "main",
      REQUIRE_TAG: "false",
    });
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/Invalid semver/);
  });
});
