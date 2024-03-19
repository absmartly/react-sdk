import React, { FC, PropsWithChildren } from "react";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";

import { Context, SDK } from "@absmartly/javascript-sdk";

import { SDKProvider, useABSmartly } from "../src/components/SDKProvider";

jest.mock("@absmartly/javascript-sdk");

const mockContextData = {
  experiments: [],
};

const mockContext = {} as Context;

const mockCreateContext = jest.fn().mockImplementation(() => {
  return {
    ...new Context(
      {} as SDK,
      { publishDelay: 5, refreshPeriod: 3000 },
      { units: { user_id: "test_unit" } },
      mockContextData,
    ),
    data: jest.fn().mockReturnValue(mockContextData),
  };
});

const mockCreateContextWith = jest.fn().mockImplementation(() => {
  return new Context(
    {} as SDK,
    { publishDelay: 5, refreshPeriod: 3000 },
    { units: { user_id: "test_unit" } },
    mockContextData,
  );
});

(SDK as jest.MockedClass<typeof SDK>).mockImplementation(() => {
  return {
    createContext: mockCreateContext,
    createContextWith: mockCreateContextWith,
    attributes: jest.fn().mockImplementation(),
    overrides: jest.fn().mockImplementation(),
  } as unknown as SDK;
});

describe("SDKProvider", () => {
  const TestComponent = jest.fn();

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

  test("Whether it creates an instance of the ABSmartly JS-SDK and an ABSmartly Context", async () => {
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

  test("Whether it will create an SDK instance with a context that has prefetched context data", async () => {
    render(
      <SDKProvider context={mockContext}>
        <TestComponent />
      </SDKProvider>,
    );

    expect(SDK).not.toHaveBeenCalled();
    expect(mockCreateContext).not.toHaveBeenCalled();
  });

  test("Whether useABSmartly throws an error when not used within an SDKProvider", async () => {
    expect(() => renderHook(() => useABSmartly())).toThrow(
      "useABSmartly must be used within an SDKProvider. https://docs.absmartly.com/docs/SDK-Documentation/getting-started#import-and-initialize-the-sdk",
    );
  });

  test("Whether useABSmartly hook works", async () => {
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

  test("resetContext function works as expected", async () => {
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
