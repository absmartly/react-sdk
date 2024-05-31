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

const mockCreateContext = vi.fn().mockImplementation(() => {
  return {
    ...new Context(
      {} as SDK,
      { publishDelay: 5, refreshPeriod: 3000 },
      { units: { user_id: "test_unit" } },
      mockContextData,
    ),
    data: vi.fn().mockReturnValue(mockContextData),
  };
});

const mockCreateContextWith = vi.fn().mockImplementation(() => {
  return new Context(
    {} as SDK,
    { publishDelay: 5, refreshPeriod: 3000 },
    { units: { user_id: "test_unit" } },
    mockContextData,
  );
});

(SDK as MockedClass<typeof SDK>).mockImplementation(() => {
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
});
