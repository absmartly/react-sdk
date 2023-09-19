import React from "react";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";

import { Context, SDK } from "@absmartly/javascript-sdk";

import ABSmartlyProvider, { useABSmartly } from "../src/";

const mockContextData = {
  experiments: [],
};

const mockSDK = new SDK({
  apiKey: "salkjdhclkjsdbca",
  application: "www",
  environment: "Environment 5",
  endpoint: "https://sandbox.absmartly.io/v1",
});

const mockContext = new Context(
  new SDK({
    apiKey: "salkjdhclkjsdbca",
    application: "www",
    environment: "Environment 5",
    endpoint: "https://sandbox.absmartly.io/v1",
  }),
  {
    refreshPeriod: 5000,
    publishDelay: 5000,
    publisher: {
      publish: jest.fn(),
    },
  },
  {
    units: {
      user_id: "sdchjbaiclrbkj",
      anonymous_id: "sdchjbaiclrbkj",
    },
  },
  mockContextData
);

const mockCreateContext = jest.fn().mockImplementation(() => {
  return {
    ...mockContext,
    data: jest.fn().mockReturnValue(mockContextData),
  };
});

const mockCreateContextWith = jest
  .fn()
  .mockImplementation((sdk, contextOptions, contextParams, promise) => {
    return new Context(sdk, contextOptions, contextParams, promise);
  });

jest.mock("@absmartly/javascript-sdk", () => ({
  ...jest.requireActual("@absmartly/javascript-sdk"),
  SDK: jest.fn().mockImplementation(() => {
    return {
      createContext: mockCreateContext,
      createContextWith: mockCreateContextWith,
      attributes: jest.fn().mockImplementation(),
      overrides: jest.fn().mockImplementation(),
      getContextPublisher: jest.fn().mockImplementation(),
      getContextDataProvider: jest.fn().mockImplementation(),
      getEventLogger: jest.fn().mockImplementation(),
      publisher: {},
    };
  }),
  Context: jest.fn().mockImplementation(() => ({
    ready: jest.fn().mockImplementation(() => Promise.resolve(true)),
    _sdk: mockSDK,
    finalize: jest.fn().mockImplementation(() => Promise.resolve(true)),
    data: jest.fn().mockReturnValue(mockContextData),
  })),
}));

describe("ABSmartlyProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  test("Whether it renders JSX.Elements", async () => {
    render(
      <ABSmartlyProvider
        sdkOptions={sdkOptions}
        contextOptions={contextOptions}
      >
        <div>Test</div>
      </ABSmartlyProvider>
    );

    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  test("Whether it creates an instance of the ABSmartly JS-SDK and an ABSmartly Context", async () => {
    render(
      <ABSmartlyProvider
        sdkOptions={sdkOptions}
        contextOptions={contextOptions}
      >
        <TestComponent />
      </ABSmartlyProvider>
    );

    expect(SDK).toBeCalledTimes(1);
    expect(SDK).toHaveBeenLastCalledWith(sdkOptions);

    expect(mockCreateContext).toBeCalledTimes(1);
    expect(mockCreateContext).toHaveBeenLastCalledWith(contextOptions);
  });

  test("Whether it will create an SDK instance with a context that has prefetched context data", async () => {
    render(
      <ABSmartlyProvider context={mockContext}>
        <TestComponent />
      </ABSmartlyProvider>
    );

    expect(SDK).not.toBeCalled();
    expect(mockCreateContext).not.toBeCalled();
  });

  test("Whether useABSmartly hook works", async () => {
    const { result } = renderHook(() => useABSmartly());

    expect(result.current.context).toBeUndefined();
    expect(result.current.sdk).toBeUndefined();
  });

  test("resetContext function works as expected", async () => {
    const TestComponent = () => {
      const { resetContext } = useABSmartly();
      return (
        <button
          onClick={() => {
            resetContext(
              { units: { user_id: "newUserID" } },
              { publishDelay: 5000, refreshPeriod: 5000 }
            );
          }}
        >
          Reset Context
        </button>
      );
    };

    render(
      <ABSmartlyProvider
        sdkOptions={sdkOptions}
        contextOptions={contextOptions}
      >
        <TestComponent />
      </ABSmartlyProvider>
    );

    const button = screen.getByText("Reset Context");
    await act(async () => {
      fireEvent.click(button);
    });

    expect(SDK).toHaveBeenCalledTimes(1);
    expect(mockCreateContextWith).toHaveBeenCalledTimes(1);
    expect(mockCreateContextWith).toHaveBeenCalledWith(
      { units: { user_id: "newUserID" } },
      mockContextData,
      {
        publishDelay: 5000,
        refreshPeriod: 5000,
      }
    );
  });
});
