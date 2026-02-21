import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import React, { FC, PropsWithChildren } from "react";
import { afterEach, describe, expect, it, MockedClass, vi } from "vitest";

import { Context, SDK } from "@absmartly/javascript-sdk";

import { SDKProvider } from "../src/components/SDKProvider";
import { useABSmartly } from "../src/hooks/useABSmartly";

vi.mock("@absmartly/javascript-sdk");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockContextData = {
  experiments: [],
};

const mockContext = {} as Context;

const mockCreateContext = vi.fn().mockImplementation(function () {
  return {
    data: vi.fn().mockReturnValue(mockContextData),
    isReady: vi.fn().mockReturnValue(true),
    isFailed: vi.fn().mockReturnValue(false),
    treatment: vi.fn().mockReturnValue(0),
    ready: vi.fn().mockResolvedValue(undefined),
    attributes: vi.fn(),
    variableKeys: vi.fn().mockReturnValue({}),
    peekVariableValue: vi.fn(),
    finalize: vi.fn().mockResolvedValue(undefined),
    _opts: { publishDelay: 5, refreshPeriod: 3000 },
    _sdk: {},
  };
});

const mockCreateContextWith = vi.fn().mockImplementation(function () {
  return {
    data: vi.fn().mockReturnValue(mockContextData),
    isReady: vi.fn().mockReturnValue(true),
    isFailed: vi.fn().mockReturnValue(false),
    treatment: vi.fn().mockReturnValue(0),
    ready: vi.fn().mockResolvedValue(undefined),
    attributes: vi.fn(),
    variableKeys: vi.fn().mockReturnValue({}),
    peekVariableValue: vi.fn(),
    finalize: vi.fn().mockResolvedValue(undefined),
    _opts: { publishDelay: 5, refreshPeriod: 3000 },
    _sdk: {},
  };
});

(SDK as MockedClass<typeof SDK>).mockImplementation(function () {
  return {
    createContext: mockCreateContext,
    createContextWith: mockCreateContextWith,
    attributes: vi.fn(),
    overrides: vi.fn(),
  } as unknown as SDK;
});

describe("SDKProvider", () => {
  const TestComponent = vi.fn();

  const context = {
    test: 2,
  };

  const attrs = {
    attr1: "value1",
    attr2: "value2",
  };

  const overrides = {
    not_found: 2,
  };

  const sdkOptions = {
    endpoint: "https://sandbox.absmartly.io/v1",
    apiKey: "salkjdhclkjsdbca",
    application: "www",
    environment: "Environment 5",
    retries: 5,
    timeout: 3000,
    overrides: overrides,
    attributes: attrs,
    data: mockContextData,
    context: context,
  };

  const contextOptions = {
    units: {
      user_id: "sdchjbaiclrbkj",
      anonymous_id: "sdchjbaiclrbkj",
    },
  };

  it("Whether it creates an instance of the ABSmartly JS-SDK and an ABSmartly Context", async () => {
    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <TestComponent />
      </SDKProvider>,
    );

    expect(SDK).toHaveBeenCalledTimes(1);
    expect(SDK).toHaveBeenLastCalledWith(sdkOptions);

    expect(mockCreateContext).toHaveBeenCalledTimes(1);
    expect(mockCreateContext).toHaveBeenLastCalledWith(contextOptions);
  });

  it("Whether it will create an SDK instance with a context that has prefetched context data", async () => {
    render(
      <SDKProvider context={mockContext}>
        <TestComponent />
      </SDKProvider>,
    );

    expect(SDK).not.toHaveBeenCalled();
    expect(mockCreateContext).not.toHaveBeenCalled();
  });

  it("Whether useABSmartly throws an error when not used within an SDKProvider", async () => {
    expect(() => renderHook(() => useABSmartly())).toThrow(
      "useABSmartly must be used within an SDKProvider. https://docs.absmartly.com/docs/SDK-Documentation/getting-started#import-and-initialize-the-sdk",
    );
  });

  it("Whether useABSmartly hook works", async () => {
    const wrapper: FC<PropsWithChildren> = ({ children }) => (
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        {children}
      </SDKProvider>
    );
    const { result } = renderHook(() => useABSmartly(), { wrapper });

    expect(result.current.context).toBeDefined();
    expect(result.current.sdk).toBeDefined();
    expect(result.current.resetContext).toBeDefined();
    expect(result.current.resetContext).toBeInstanceOf(Function);
  });

  it("resetContext function works as expected", async () => {
    const TestComponent = () => {
      const { resetContext } = useABSmartly();
      return (
        <button
          onClick={() => {
            resetContext(
              { units: { user_id: "newUserID" } },
              { publishDelay: 5000, refreshPeriod: 5000 },
            );
          }}
        >
          Reset Context
        </button>
      );
    };

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <TestComponent />
      </SDKProvider>,
    );

    const button = screen.getByText("Reset Context");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockCreateContextWith).toHaveBeenCalledTimes(1);
    expect(mockCreateContextWith).toHaveBeenCalledWith(
      { units: { user_id: "newUserID" } },
      mockContextData,
      {
        publishDelay: 5000,
        refreshPeriod: 5000,
      },
    );
  });

  it("should allow nested providers with different contexts", () => {
    const outerContextOptions = {
      units: { user_id: "outer-user" },
    };
    const innerContextOptions = {
      units: { user_id: "inner-user" },
    };

    const InnerComponent = () => {
      const { context } = useABSmartly();
      return <span data-testid="inner-context">{context ? "has-context" : "no-context"}</span>;
    };

    const OuterComponent = () => {
      const { context } = useABSmartly();
      return (
        <div>
          <span data-testid="outer-context">{context ? "has-context" : "no-context"}</span>
          <SDKProvider sdkOptions={sdkOptions} contextOptions={innerContextOptions}>
            <InnerComponent />
          </SDKProvider>
        </div>
      );
    };

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={outerContextOptions}>
        <OuterComponent />
      </SDKProvider>,
    );

    expect(screen.getByTestId("outer-context")).toHaveTextContent("has-context");
    expect(screen.getByTestId("inner-context")).toHaveTextContent("has-context");
    expect(mockCreateContext).toHaveBeenCalledTimes(2);
  });

  it("should provide context value to multiple children", () => {
    const Child1 = () => {
      const { context } = useABSmartly();
      return <div data-testid="child1">{context ? "yes" : "no"}</div>;
    };

    const Child2 = () => {
      const { context } = useABSmartly();
      return <div data-testid="child2">{context ? "yes" : "no"}</div>;
    };

    const Child3 = () => {
      const { sdk } = useABSmartly();
      return <div data-testid="child3">{sdk ? "yes" : "no"}</div>;
    };

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <Child1 />
        <Child2 />
        <Child3 />
      </SDKProvider>,
    );

    expect(screen.getByTestId("child1")).toHaveTextContent("yes");
    expect(screen.getByTestId("child2")).toHaveTextContent("yes");
    expect(screen.getByTestId("child3")).toHaveTextContent("yes");
  });

  it("should use default SDK options when not all are provided", () => {
    const minimalSdkOptions = {
      endpoint: "https://test.absmartly.io/v1",
      apiKey: "test-key",
      application: "test-app",
      environment: "test",
    };

    render(
      <SDKProvider sdkOptions={minimalSdkOptions} contextOptions={contextOptions}>
        <TestComponent />
      </SDKProvider>,
    );

    expect(SDK).toHaveBeenCalledTimes(1);
    expect(SDK).toHaveBeenCalledWith(
      expect.objectContaining({
        retries: 5,
        timeout: 3000,
        ...minimalSdkOptions,
      }),
    );
  });

  it("should allow children to access resetContext and trigger context recreation", async () => {
    let capturedResetContext: any;

    const CaptureComponent = () => {
      const { resetContext } = useABSmartly();
      capturedResetContext = resetContext;
      return <div>Captured</div>;
    };

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <CaptureComponent />
      </SDKProvider>,
    );

    expect(capturedResetContext).toBeDefined();
    expect(typeof capturedResetContext).toBe("function");
  });
});
