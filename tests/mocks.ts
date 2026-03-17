import { Context } from "@absmartly/javascript-sdk";
import { vi, type Mocked, type MockedFunction } from "vitest";
import { useABSmartly } from "../src/hooks/useABSmartly";

export const mocks = {
  context: {
    treatment: vi.fn(),
    experimentConfig: vi.fn(),
    attributes: vi.fn(),
    ready: vi.fn(),
    isReady: vi.fn(),
    isFailed: vi.fn(),
    variableKeys: vi.fn().mockReturnValue({ "button.color": "red" }),
    peekVariableValue: vi.fn(),
  } as unknown as Mocked<Context>,
};

export const mockedUseABSmartly = useABSmartly as MockedFunction<
  typeof useABSmartly
>;
