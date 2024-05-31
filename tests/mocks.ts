import { Context } from "@absmartly/javascript-sdk";
import { useABSmartly } from "../src/hooks/useABSmartly";

export const mocks = {
  context: {
    treatment: jest.fn(),
    experimentConfig: jest.fn(),
    attributes: jest.fn(),
    ready: jest.fn(),
    isReady: jest.fn(),
    isFailed: jest.fn(),
    variableKeys: jest.fn().mockReturnValue({ "button.color": "red" }),
    peekVariableValue: jest.fn(),
  } as unknown as jest.Mocked<Context>,
};

export const mockedUseABSmartly = useABSmartly as jest.MockedFunction<
  typeof useABSmartly
>;
