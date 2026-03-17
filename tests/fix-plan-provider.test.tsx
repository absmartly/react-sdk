import {
  act,
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi, MockedClass } from "vitest";

import { Context, SDK } from "@absmartly/javascript-sdk";
import { SDKProvider } from "../src/components/SDKProvider";
import { useABSmartly } from "../src/hooks/useABSmartly";
import { withABSmartly } from "../src/hooks/HOCs/withABSmartly";
import { ABSmartly } from "../src/types";

vi.mock("@absmartly/javascript-sdk");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockContextData = { experiments: [] };
const mockContextOptions = { publishDelay: 5, refreshPeriod: 3000 };

const mockCreateContext = vi.fn().mockImplementation(() => ({
  data: vi.fn().mockReturnValue(mockContextData),
  isReady: vi.fn().mockReturnValue(true),
  isFailed: vi.fn().mockReturnValue(false),
  treatment: vi.fn().mockReturnValue(0),
  ready: vi.fn().mockResolvedValue(undefined),
  attributes: vi.fn(),
  variableKeys: vi.fn().mockReturnValue({}),
  peekVariableValue: vi.fn(),
  finalize: vi.fn().mockResolvedValue(undefined),
  getOptions: vi.fn().mockReturnValue(mockContextOptions),
  getSDK: vi.fn().mockReturnValue({}),
}));

const mockCreateContextWith = vi.fn().mockImplementation(() => ({
  data: vi.fn().mockReturnValue(mockContextData),
  isReady: vi.fn().mockReturnValue(true),
  isFailed: vi.fn().mockReturnValue(false),
  treatment: vi.fn().mockReturnValue(0),
  ready: vi.fn().mockResolvedValue(undefined),
  attributes: vi.fn(),
  variableKeys: vi.fn().mockReturnValue({}),
  peekVariableValue: vi.fn(),
  finalize: vi.fn().mockResolvedValue(undefined),
  getOptions: vi.fn().mockReturnValue(mockContextOptions),
  getSDK: vi.fn().mockReturnValue({}),
}));

(SDK as MockedClass<typeof SDK>).mockImplementation(function () {
  return {
    createContext: mockCreateContext,
    createContextWith: mockCreateContextWith,
    attributes: vi.fn(),
    overrides: vi.fn(),
  } as unknown as SDK;
});

const sdkOptions = {
  endpoint: "https://sandbox.absmartly.io/v1",
  apiKey: "test-key",
  application: "www",
  environment: "test",
};

const contextOptions = {
  units: { user_id: "test-user" },
};

describe("Fix #2: Stale closure in resetContext (uses ref)", () => {
  it("resetContext should work after multiple calls without stale closure", async () => {
    const TestComponent = () => {
      const { resetContext } = useABSmartly();
      return (
        <button onClick={() => resetContext({ units: { user_id: "new-user" } })}>
          Reset
        </button>
      );
    };

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <TestComponent />
      </SDKProvider>,
    );

    const button = screen.getByText("Reset");
    await act(async () => {
      button.click();
    });

    expect(mockCreateContextWith).toHaveBeenCalledTimes(1);

    await act(async () => {
      button.click();
    });

    expect(mockCreateContextWith).toHaveBeenCalledTimes(2);
  });
});

describe("Fix #13: withABSmartly HOC null guard", () => {
  it("should throw when rendered outside SDKProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    interface TestProps {
      absmartly: ABSmartly;
    }

    const TestComponent = ({ absmartly }: TestProps) => (
      <div>{absmartly ? "has-context" : "no-context"}</div>
    );

    const WrappedComponent = withABSmartly(TestComponent);

    expect(() => render(<WrappedComponent />)).toThrow(
      "withABSmartly must be used within an SDKProvider"
    );
  });

  it("should work correctly when inside SDKProvider", () => {
    interface TestProps {
      absmartly: ABSmartly;
    }

    const TestComponent = ({ absmartly }: TestProps) => (
      <div data-testid="result">{absmartly ? "has-context" : "no-context"}</div>
    );

    const WrappedComponent = withABSmartly(TestComponent);

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <WrappedComponent />
      </SDKProvider>,
    );

    expect(screen.getByTestId("result")).toHaveTextContent("has-context");
  });
});

describe("Fix #14: resetContext returns Promise<void>", () => {
  it("resetContext should return a promise that can be awaited", async () => {
    let capturedResetContext: any;

    const CaptureComponent = () => {
      const { resetContext } = useABSmartly();
      capturedResetContext = resetContext;
      return <div>test</div>;
    };

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <CaptureComponent />
      </SDKProvider>,
    );

    const result = capturedResetContext({ units: { user_id: "new" } });
    expect(result).toBeInstanceOf(Promise);
    await result;
  });
});
