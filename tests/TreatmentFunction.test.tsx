import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SDK, type TreatmentProps } from "../src";
import { TreatmentFunction } from "../src/components/Treatment/TreatmentFunction";
import { mockedUseABSmartly, mocks } from "./mocks";

vi.mock("../src/hooks/useABSmartly");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe("TreatmentFunction Component", () => {
  it("should not render loading component when ready", async () => {
    const TestComponent0 = vi.fn();
    const TestComponent1 = vi.fn();
    const TestComponent2 = vi.fn();
    const TestLoadingComponent = vi.fn();

    const attributes = { attr1: 15, attr2: 50 };

    mocks.context.isReady.mockReturnValue(true);
    mocks.context.isFailed.mockReturnValue(false);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.ready.mockResolvedValue(true);

    render(
      <TreatmentFunction
        context={mocks.context}
        name="test_exp"
        attributes={attributes}
        loadingComponent={<TestLoadingComponent />}
      >
        {({ variant }: TreatmentProps) =>
          variant === 0 ? (
            <TestComponent0 />
          ) : variant === 1 ? (
            <TestComponent1 />
          ) : (
            <TestComponent2 />
          )
        }
      </TreatmentFunction>,
    );

    await waitFor(() => {
      expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
      expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
      expect(mocks.context.attributes).toHaveBeenCalledTimes(1);
      expect(mocks.context.attributes).toHaveBeenCalledWith(attributes);
      expect(TestLoadingComponent).not.toHaveBeenCalled();
      expect(TestComponent1).toHaveBeenCalledTimes(1);
    });
  });

  it("should render loading component when not ready", async () => {
    const TestLoadingComponent = vi.fn();
    const TestComponent = vi.fn();

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(false);

    const ready = Promise.resolve(true);

    mocks.context.ready.mockReturnValue(ready);

    render(
      <TreatmentFunction
        loadingComponent={<TestLoadingComponent />}
        context={mocks.context}
        name="test_exp"
      >
        {({ variant }: TreatmentProps) => variant === 0 && <TestComponent />}
      </TreatmentFunction>,
    );

    await waitFor(() => {
      expect(mocks.context.treatment).not.toHaveBeenCalled();
      expect(mocks.context.attributes).not.toHaveBeenCalled();
      expect(TestComponent).not.toHaveBeenCalled();
      expect(TestLoadingComponent).toHaveBeenCalledTimes(1);
    });

    const config = { a: 1, b: 2 };
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(1);

    ready.then(async () => {
      await waitFor(() => {
        expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
        expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
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

  it("Should render control variant when no loading component is provided", async () => {
    const TestComponent = vi.fn();
    const TestComponentThatShouldntRender = vi.fn();

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(false);

    const ready = Promise.resolve(true);
    mocks.context.ready.mockReturnValue(ready);

    const attributes = {
      attr1: 15,
      attr2: 50,
    };

    render(
      <TreatmentFunction context={mocks.context} name="test_exp">
        {({ variant }: TreatmentProps) =>
          variant === 0 ? (
            <TestComponent />
          ) : (
            <TestComponentThatShouldntRender />
          )
        }
      </TreatmentFunction>,
    );

    expect(mocks.context.treatment).not.toHaveBeenCalled();
    expect(mocks.context.attributes).not.toHaveBeenCalled();
    expect(TestComponent).toHaveBeenCalledTimes(1);
    expect(TestComponentThatShouldntRender).not.toHaveBeenCalled();

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
        expect(TestComponentThatShouldntRender).not.toHaveBeenCalled();
      });
    });
  });

  it.each([0, 1, 2, 3, 4])(
    "should render treatment component %i by variant (%s)",
    async (variant) => {
      const TestComponent = vi.fn();
      const TestLoadingComponent = vi.fn();

      mocks.context.isReady.mockReturnValue(true);
      mocks.context.isFailed.mockReturnValue(false);
      mocks.context.treatment.mockReturnValue(variant);

      render(
        <TreatmentFunction
          loadingComponent={<TestLoadingComponent />}
          context={mocks.context}
          name="test_exp"
        >
          {(choices: TreatmentProps) =>
            variant === choices.variant && <TestComponent />
          }
        </TreatmentFunction>,
      );

      await waitFor(() => {
        expect(TestComponent).toHaveBeenCalledTimes(1);
      });
    },
  );

  it("should accept a string as a child", async () => {
    mocks.context.treatment.mockReturnValue(1);

    render(
      <TreatmentFunction context={mocks.context} name="test_exp">
        {({ variant }: TreatmentProps) => variant === 1 && "Hello world"}
      </TreatmentFunction>,
    );
  });

  it("should use the default context if one is not passed in", async () => {
    mockedUseABSmartly.mockReturnValue({
      context: mocks.context,
      sdk: null as unknown as SDK,
      resetContext: async () => {},
    });

    const TestComponent = vi.fn();

    render(
      <TreatmentFunction name="test_exp">
        {({ variant }: TreatmentProps) => variant === 1 && <TestComponent />}
      </TreatmentFunction>,
    );

    expect(mockedUseABSmartly).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
      expect(TestComponent).toHaveBeenCalledTimes(1);
    });
  });
});
