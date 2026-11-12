import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SDK } from "@absmartly/javascript-sdk";

import { Treatment, TreatmentVariant } from "../src";

afterEach(() => {
  cleanup();
});

// A full-on experiment with Audience enforced and a condition on one of the
// configured system attributes. From javascript-sdk 1.14.0 the SDK always
// evaluates audiences with `application` and `environment`, so a matching
// unit gets the full-on variant instead of variant 0.
const strictAudienceContext = (filter: unknown) => {
  const sdk = new SDK({
    endpoint: "http://localhost",
    apiKey: "key",
    application: "website",
    environment: "production",
    publisher: { publish: vi.fn().mockResolvedValue(undefined) } as never,
  } as never);
  return sdk.createContextWith(
    { units: { session_id: "e791e240fcd3df7d238cfc285f475e8152fcc0ec" } },
    {
      experiments: [
        {
          id: 1,
          name: "exp_test_ab",
          iteration: 1,
          unitType: "session_id",
          seedHi: 3603515,
          seedLo: 233373850,
          split: [0.5, 0.5],
          trafficSeedHi: 449867249,
          trafficSeedLo: 455443629,
          trafficSplit: [0.0, 1.0],
          fullOnVariant: 1,
          audienceStrict: true,
          audience: JSON.stringify({ filter }),
          applications: [{ name: "website" }],
          variants: [
            { name: "A", config: null },
            { name: "B", config: null },
          ],
        },
      ],
    } as never,
    { publishDelay: -1, refreshPeriod: 0 },
  );
};

const renderTreatment = (filter: unknown) =>
  render(
    <Treatment name="exp_test_ab" context={strictAudienceContext(filter)}>
      <TreatmentVariant variant={0}>control</TreatmentVariant>
      <TreatmentVariant variant={1}>treatment</TreatmentVariant>
    </Treatment>,
  );

describe("strict audiences on system attributes", () => {
  it("match the configured environment", () => {
    renderTreatment([
      { eq: [{ var: "environment" }, { value: "production" }] },
    ]);
    expect(screen.getByText("treatment")).toBeTruthy();
  });

  it("match the configured application", () => {
    renderTreatment([{ eq: [{ var: "application" }, { value: "website" }] }]);
    expect(screen.getByText("treatment")).toBeTruthy();
  });

  it("give control when the audience names another environment", () => {
    renderTreatment([{ eq: [{ var: "environment" }, { value: "staging" }] }]);
    expect(screen.getByText("control")).toBeTruthy();
  });
});
