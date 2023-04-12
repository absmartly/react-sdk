import React from "react";
import "@testing-library/jest-dom";
import { screen, act, fireEvent, render, renderHook } from "@testing-library/react";

import { Context, SDK } from "@absmartly/javascript-sdk";

import { SDKProvider, useABSmartly } from "../src/components/SDKProvider";

jest.mock("@absmartly/javascript-sdk");

const mockContextData = {
    experiments: [],
};

const mockCreateContext = jest.fn().mockImplementation(() => {
    return {
        ...new Context(),
        data: jest.fn().mockReturnValue(mockContextData),
    };
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
            </SDKProvider>
        );

        expect(SDK).toBeCalledTimes(1);
        expect(SDK).toHaveBeenLastCalledWith(sdkOptions);

        expect(mockCreateContext).toBeCalledTimes(1);
        expect(mockCreateContext).toHaveBeenLastCalledWith(contextOptions);
    });

    test("Whether it will create an SDK instance with a context that has prefetched context data", async () => {
        render(
            <SDKProvider context={mockContextData}>
                <TestComponent />
            </SDKProvider>
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
                        resetContext({ units: { user_id: "newUserID" } }, { publishDelay: 5000, refreshPeriod: 5000 });
                    }}
                >
                    Reset Context
                </button>
            );
        };

        render(
            <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
                <TestComponent />
            </SDKProvider>
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
                refreshPeriod: 5000
            }
        );
    });
});
