import { Context, SDK } from "@absmartly/javascript-sdk";
import { useABSmartly, useTreatment } from "../src";

import { renderHook, waitFor } from "@testing-library/react";

jest.mock("../src/components/SDKProvider");

const mockedUseABSmartly = useABSmartly as jest.MockedFunction<
  typeof useABSmartly
>;

describe("useTreatment", () => {
  const mockContext = {
    ready: jest.fn(),
    peek: jest.fn(),
    treatment: jest.fn(),
  };

  beforeEach(() => {
    mockedUseABSmartly.mockReturnValue({
      context: mockContext as unknown as Context,
      sdk: null as unknown as SDK,
      resetContext: () => {},
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("should return variant after context is ready", async () => {
    mockContext.ready.mockResolvedValueOnce(undefined);
    mockContext.treatment.mockReturnValueOnce(1);

    const { result } = renderHook(() => useTreatment("experiment-name"));

    expect(result.current.loading).toBe(true);
    expect(result.current.variant).toBe(null);
    expect(result.current.error).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(1);
      expect(result.current.error).toBe(null);
    });
  });

  test("should handle errors correctly", async () => {
    const error = new Error("Test error");
    mockContext.ready.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useTreatment("experiment-name"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(null);
      expect(result.current.error).toBe(error);
    });
  });

  test("should use peek when specified", async () => {
    mockContext.ready.mockResolvedValueOnce(undefined);
    mockContext.peek.mockReturnValueOnce(2);

    const { result } = renderHook(() => useTreatment("experiment-name", true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(2);
      expect(result.current.error).toBe(null);
    });
  });

  test("should handle non-error objects in catch", async () => {
    mockContext.ready.mockRejectedValueOnce("Test error");

    const { result } = renderHook(() => useTreatment("experiment-name"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(null);
      expect(result.current.error?.message).toBe("Test error");
    });
  });
});
