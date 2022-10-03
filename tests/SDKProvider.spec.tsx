import React from "react";
import "@testing-library/jest-dom";
import { render } from "@testing-library/react";

import { Context, SDK } from "@absmartly/javascript-sdk";

import { SDKProvider, useABSmartly } from "../src/components/SDKProvider";

jest.mock("@absmartly/javascript-sdk");

const mockCreateContext = jest.fn().mockImplementation(() => {
  return new Context();
});

const mockCreateContextWith = jest.fn().mockImplementation(() => {
  return new Context();
});

SDK.mockImplementation(() => {
  return {
    createContext: mockCreateContext,
    createContextWith: mockCreateContextWith,
    attributes: jest.fn().mockImplementation(),
    overrides: jest.fn().mockImplementation(),
  };
});

describe("SDKProvider", () => {
  const TestComponent = jest.fn();

  const context = {
    test: 2,
  };

  const data = {
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
    endpoint: "sandbox.absmartly.com",
    apiKey: "salkjdhclkjsdbca",
    application: "www",
    environment: "Environment 5",
    retries: 5,
    timeout: 3000,
    overrides: overrides,
    attributes: attrs,
    data: data,
    context: context,
  };

  const CreateContextComponent = () => {
    const sdk = useABSmartly();
    sdk.createContext();

    return <TestComponent />;
  };

  test("Whether it creates an instance of the ABSmartly JS-SDK", async () => {
    render(<SDKProvider sdkOptions={sdkOptions} />);

    expect(SDK).toBeCalledTimes(1);
    expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
  });

  test("Whether a context is created with default options", async () => {
    render(
      <SDKProvider sdkOptions={sdkOptions}>
        <CreateContextComponent />
      </SDKProvider>
    );

    expect(SDK).toBeCalledTimes(1);
    expect(SDK).toHaveBeenLastCalledWith(sdkOptions);
    expect(mockCreateContext).toBeCalledTimes(1);
    expect(mockCreateContext).toBeCalledWith();
  });
});
