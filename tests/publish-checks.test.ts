import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
  assertTagMatchesVersion,
  parseVersion,
  resolveDistTag,
} from "../.github/scripts/publish-checks.mjs";

const SCRIPT = resolve(__dirname, "../.github/scripts/publish-checks.mjs");

function runScript(env: Record<string, string>) {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], {
      env: { PATH: process.env.PATH ?? "", ...env },
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

  it.each(["", "v1.4.2", "1.4", "1.4.2.0", "01.4.2", "1.4.2-", undefined])(
    "rejects %s",
    (version) => {
      expect(() => parseVersion(version)).toThrow(/Invalid semver/);
    },
  );
});

describe("assertTagMatchesVersion", () => {
  it("accepts v + version", () => {
    expect(() => assertTagMatchesVersion("v1.4.2", "1.4.2")).not.toThrow();
    expect(() =>
      assertTagMatchesVersion("v2.0.0-beta.1", "2.0.0-beta.1"),
    ).not.toThrow();
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

describe("resolveDistTag", () => {
  it.each([
    // stable, becomes latest
    ["1.4.3", "1.4.2", ""],
    ["1.5.0", "1.4.2", ""],
    ["2.0.0", "1.4.2", ""],
    ["1.4.2", "1.4.2", ""],
    // older major never becomes latest
    ["1.4.3", "2.0.0", "v1"],
    ["1.99.99", "2.0.0", "v1"],
    ["1.4.3", "10.0.0", "v1"],
    ["9.0.0", "10.0.0", "v9"],
    // older release on latest's major never becomes latest
    ["1.3.9", "1.4.2", "v1.3"],
    ["1.4.1", "1.4.2", "v1.4"],
    // prereleases
    ["1.4.3-beta.1", "1.4.2", "beta"],
    ["2.0.0-alpha.0", "1.4.2", "alpha"],
    ["2.0.0-rc.1", "1.4.2", "rc"],
    ["1.5.0-beta.0", "2.0.0", "v1-beta"],
    ["1.4.3-0", "1.4.2", "next"],
  ])("version %s with latest %s -> %j", (version, latest, expected) => {
    expect(resolveDistTag(version, latest)).toBe(expected);
  });

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

  it("prints v1 for a 1.x patch when latest is 2.x", () => {
    const result = runScript({
      VERSION: "1.4.3",
      LATEST_VERSION: "2.0.0",
      REF_TYPE: "tag",
      REF_NAME: "v1.4.3",
      REQUIRE_TAG: "true",
    });
    expect(result).toMatchObject({ code: 0, stdout: "v1" });
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
