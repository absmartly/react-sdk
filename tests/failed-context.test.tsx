import { cleanup, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SDK } from "@absmartly/javascript-sdk";

import { Treatment, TreatmentVariant, TreatmentFunction } from "../src";

afterEach(() => {
  cleanup();
});

// A real JavaScript SDK context whose initial load failed. The SDK leaves it
// ready and failed with empty data: reads return control and still log an
// exposure. The components must behave the same instead of showing an error.
const failedContext = async () => {
  const exposures: unknown[] = [];
  const sdk = new SDK({
    endpoint: "http://localhost",
    apiKey: "key",
    application: "www",
    environment: "test",
    eventLogger: (_ctx, eventName, data) => {
      if (eventName === "exposure") exposures.push(data);
    },
    publisher: { publish: vi.fn().mockResolvedValue(undefined) } as never,
  } as never);
  const load = Promise.reject(new Error("load failed"));
  load.catch(() => {});
  const context = sdk.createContextWith({ units: { user_id: "u1" } }, load, {
    publishDelay: -1,
    refreshPeriod: 0,
  });
  await context.ready();
  expect(context.isFailed()).toBe(true);
  return { context, exposures };
};

describe("components on a context whose initial load failed", () => {
  it("Treatment renders control and records the exposure", async () => {
    const { context, exposures } = await failedContext();

    render(
      <Treatment name="exp" context={context} errorComponent={<div>error</div>}>
        <TreatmentVariant variant={0}>control</TreatmentVariant>
        <TreatmentVariant variant={1}>treatment</TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => expect(exposures).toHaveLength(1));
    expect(screen.getByText("control")).toBeTruthy();
    expect(screen.queryByText("error")).toBeNull();
  });

  it("TreatmentFunction renders control and records the exposure", async () => {
    const { context, exposures } = await failedContext();

    render(
      <TreatmentFunction name="exp" context={context}>
        {({ variant }) => <div>variant {variant}</div>}
      </TreatmentFunction>,
    );

    await waitFor(() => expect(exposures).toHaveLength(1));
    expect(screen.getByText("variant 0")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
