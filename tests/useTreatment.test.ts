import {
  expect,
  describe,
  beforeEach,
  afterEach,
  it,
  vi,
  MockedFunction,
} from "vitest";
import { Context, SDK } from "@absmartly/javascript-sdk";
import { useABSmartly, useTreatment } from "../src";

import { cleanup, renderHook, waitFor } from "@testing-library/react";

vi.mock("../src/hooks/useABSmartly");

const mockedUseABSmartly = useABSmartly as MockedFunction<typeof useABSmartly>;

const mockContext = {
  ready: vi.fn(),
  peek: vi.fn(),
  treatment: vi.fn(),
  isReady: vi.fn(),
};

beforeEach(() => {
  mockedUseABSmartly.mockReturnValue({
    context: mockContext as unknown as Context,
    sdk: null as unknown as SDK,
    resetContext: () => {},
  });
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe("useTreatment", () => {
  it("should return variant after context is ready", async () => {
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

  it("should handle errors correctly", async () => {
    const error = new Error("Test error");
    mockContext.ready.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useTreatment("experiment-name"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(null);
      expect(result.current.error).toBe(error);
    });
  });

  it("should use peek when specified", async () => {
    mockContext.ready.mockResolvedValueOnce(undefined);
    mockContext.peek.mockReturnValueOnce(2);

    const { result } = renderHook(() => useTreatment("experiment-name", true));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(2);
      expect(result.current.error).toBe(null);
    });
  });

  it("should handle non-error objects in catch", async () => {
    mockContext.ready.mockRejectedValueOnce("Test error");

    const { result } = renderHook(() => useTreatment("experiment-name"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(null);
      expect(result.current.error?.message).toBe("Test error");
    });
  });
});
