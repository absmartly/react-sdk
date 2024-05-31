import { cleanup, render, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SDK } from "@absmartly/javascript-sdk";
import { Treatment, TreatmentVariant } from "../src";
import { Char } from "../src/types";
import { mockedUseABSmartly, mocks } from "./mocks";

vi.mock("@absmartly/javascript-sdk");
vi.mock("../src/hooks/useABSmartly");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Treatment Component (TreatmentVariants as children)", () => {
  it("should not render loading component when ready", async () => {
    const TestComponent = vi.fn();
    const TestLoadingComponent = vi.fn();

    const attributes = { attr1: 15, attr2: 50 };

    mocks.context.isReady.mockReturnValue(true);
    mocks.context.isFailed.mockReturnValue(false);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.ready.mockResolvedValue(true);

    render(
      <Treatment
        context={mocks.context}
        name="test_exp"
        attributes={attributes}
        loadingComponent={<TestLoadingComponent />}
      >
        <TreatmentVariant variant="0">
          <p>Hello 1</p>
        </TreatmentVariant>
        <TreatmentVariant variant="1">
          <TestComponent />
        </TreatmentVariant>
        <TreatmentVariant variant="2">
          <p>Hello 2</p>
        </TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
      expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
      expect(mocks.context.attributes).toHaveBeenCalledTimes(1);
      expect(mocks.context.attributes).toHaveBeenCalledWith(attributes);
      expect(TestLoadingComponent).not.toHaveBeenCalled();
      expect(TestComponent).toHaveBeenCalledTimes(1);
    });
  });

  it("should render loading component when not ready", async () => {
    const TestLoadingComponent = vi.fn();
    const TestTreatmentVariant = vi.fn();

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(false);

    mocks.context.ready.mockResolvedValue(true);

    render(
      <Treatment
        context={mocks.context}
        name="test_exp"
        loadingComponent={<TestLoadingComponent />}
      >
        <TestTreatmentVariant variant={0}>
          <p>Hello 0</p>
        </TestTreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      expect(mocks.context.treatment).not.toHaveBeenCalled();
      expect(mocks.context.attributes).not.toHaveBeenCalled();
      expect(TestTreatmentVariant).not.toHaveBeenCalled();
      expect(TestLoadingComponent).toHaveBeenCalledTimes(1);
    });
  });

  it("Should render control variant when no loading component is provided", async () => {
    const TestComponent = vi.fn();

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(false);

    const ready = Promise.resolve(true);
    mocks.context.ready.mockReturnValue(ready);

    const attributes = {
      attr1: 15,
      attr2: 50,
    };

    render(
      <Treatment context={mocks.context} name="test_exp">
        <TestComponent variant="0">
          <p>Hello World 0!</p>
        </TestComponent>
        <TreatmentVariant variant="1">
          <p>Hello World 1!</p>
        </TreatmentVariant>
      </Treatment>,
    );

    expect(mocks.context.treatment).not.toHaveBeenCalled();
    expect(mocks.context.attributes).not.toHaveBeenCalled();
    expect(TestComponent).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      TestComponent.mockClear();
    });

    const config = { a: 1, b: 2 };
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(1);

    ready.then(async () => {
      await waitFor(() => {
        expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
        expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
        expect(mocks.context.attributes).toHaveBeenCalledTimes(1);
        expect(mocks.context.attributes).toHaveBeenCalledWith(attributes);
        expect(TestComponent).toHaveBeenCalledTimes(1);
        expect(TestComponent).toHaveBeenCalledWith({
          ready: true,
          failed: false,
          treatment: 1,
          config,
        });
      });
    });
  });

  it.each([
    [0, "0"],
    [1, "1"],
    [2, "2"],
    [3, "3"],
    [4, "4"],
  ])(
    "should render treatment component %i by variant (%s)",
    async (variant, component) => {
      const TestComponent = vi.fn();
      const ControlComponent = vi.fn();
      const TestLoadingComponent = vi.fn();

      mocks.context.isReady.mockReturnValue(true);
      mocks.context.isFailed.mockReturnValue(false);
      mocks.context.treatment.mockReturnValue(variant);

      render(
        <Treatment
          loadingComponent={<TestLoadingComponent />}
          context={mocks.context}
          name="test_exp"
        >
          <TreatmentVariant variant="Z">
            <ControlComponent />
          </TreatmentVariant>
          <TreatmentVariant variant={component as number | Char}>
            <TestComponent />
          </TreatmentVariant>
        </Treatment>,
      );

      await waitFor(() => {
        expect(ControlComponent).toHaveBeenCalledTimes(0);
        expect(TestComponent).toHaveBeenCalledTimes(1);
      });
    },
  );

  it.each([
    [0, "A"],
    [1, "B"],
    [2, "C"],
    [3, "D"],
    [4, "E"],
  ])(
    "should render treatment component %i by alpha (%s)",
    async (variant, component) => {
      const TestComponent = vi.fn();
      const TestLoadingComponent = vi.fn();

      mocks.context.isReady.mockReturnValue(true);
      mocks.context.isFailed.mockReturnValue(false);
      mocks.context.treatment.mockReturnValue(variant);

      render(
        <Treatment
          loadingComponent={<TestLoadingComponent />}
          context={mocks.context}
          name="test_exp"
        >
          <TreatmentVariant variant="Z" />
          <TreatmentVariant variant={component as number | Char}>
            <TestComponent />
          </TreatmentVariant>
        </Treatment>,
      );

      await waitFor(() => {
        expect(TestComponent).toHaveBeenCalledTimes(1);
      });
    },
  );

  it("should not call context.attributes with no attribute property", async () => {
    const TestComponent = vi.fn();
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.isFailed.mockReturnValue(false);
    mocks.context.treatment.mockReturnValue(1);

    render(
      <Treatment context={mocks.context} name="test_exp">
        <TreatmentVariant variant="0"></TreatmentVariant>
        <TreatmentVariant variant="1">
          <TestComponent></TestComponent>
        </TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
      expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
      expect(mocks.context.attributes).not.toHaveBeenCalledWith();
      expect(TestComponent).toHaveBeenCalledTimes(1);
    });
  });

  it("should accept strings as TreatmentVariant children", async () => {
    mocks.context.treatment.mockReturnValue(0);

    render(
      <Treatment name="test_exp" context={mocks.context}>
        <TreatmentVariant variant={0}>Hello world</TreatmentVariant>
      </Treatment>,
    );
  });

  it("should use the default context if one is not passed in", async () => {
    mockedUseABSmartly.mockReturnValue({
      context: mocks.context,
      sdk: null as unknown as SDK,
      resetContext: () => {},
    });

    const TestComponent = vi.fn();

    render(
      <Treatment name="test_exp">
        <TreatmentVariant variant={0}>
          <TestComponent />
        </TreatmentVariant>
      </Treatment>,
    );

    expect(mockedUseABSmartly).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
      expect(TestComponent).toHaveBeenCalledTimes(1);
    });
  });
});
