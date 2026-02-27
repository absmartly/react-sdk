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

const createMockContext = () => ({
  ready: vi.fn(),
  peek: vi.fn(),
  treatment: vi.fn(),
  isReady: vi.fn().mockReturnValue(false),
});

let mockContext = createMockContext();

beforeEach(() => {
  mockContext = createMockContext();
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

  it("should return context object for direct access", async () => {
    mockContext.ready.mockResolvedValueOnce(undefined);
    mockContext.treatment.mockReturnValueOnce(1);

    const { result } = renderHook(() => useTreatment("experiment-name"));

    await waitFor(() => {
      expect(result.current.context).toBeDefined();
      expect(result.current.context).toBe(mockContext);
    });
  });

  it("should return variant immediately when context is already ready", () => {
    mockContext.isReady.mockReturnValue(true);
    mockContext.treatment.mockReturnValue(2);

    const { result } = renderHook(() => useTreatment("experiment-name"));

    expect(result.current.loading).toBe(false);
    expect(result.current.variant).toBe(2);
    expect(result.current.error).toBe(null);
    expect(mockContext.ready).not.toHaveBeenCalled();
  });

  it("should use peek immediately when context is already ready and peek is true", () => {
    mockContext.isReady.mockReturnValue(true);
    mockContext.peek.mockReturnValue(3);

    const { result } = renderHook(() => useTreatment("experiment-name", true));

    expect(result.current.loading).toBe(false);
    expect(result.current.variant).toBe(3);
    expect(mockContext.peek).toHaveBeenCalledWith("experiment-name");
    expect(mockContext.treatment).not.toHaveBeenCalled();
  });

  it("should update variant when experiment name changes", async () => {
    mockContext.ready.mockResolvedValue(undefined);
    mockContext.treatment
      .mockReturnValueOnce(1)
      .mockReturnValueOnce(2);

    const { result, rerender } = renderHook(
      ({ name }) => useTreatment(name),
      { initialProps: { name: "experiment-1" } },
    );

    await waitFor(() => {
      expect(result.current.variant).toBe(1);
    });

    rerender({ name: "experiment-2" });

    await waitFor(() => {
      expect(result.current.variant).toBe(2);
    });
  });

  it("should handle variant 0 correctly (falsy but valid)", async () => {
    mockContext.ready.mockResolvedValueOnce(undefined);
    mockContext.treatment.mockReturnValueOnce(0);

    const { result } = renderHook(() => useTreatment("experiment-name"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(0);
      expect(result.current.error).toBe(null);
    });
  });

  it("should not skip effect when context changes but isReady is still false", async () => {
    const firstContext = createMockContext();
    const secondContext = createMockContext();

    firstContext.ready.mockResolvedValue(undefined);
    firstContext.treatment.mockReturnValue(1);
    secondContext.ready.mockResolvedValue(undefined);
    secondContext.treatment.mockReturnValue(2);

    mockedUseABSmartly.mockReturnValue({
      context: firstContext as unknown as Context,
      sdk: null as unknown as SDK,
      resetContext: () => {},
    });

    const { result, rerender } = renderHook(() => useTreatment("experiment-name"));

    await waitFor(() => {
      expect(result.current.variant).toBe(1);
    });

    mockedUseABSmartly.mockReturnValue({
      context: secondContext as unknown as Context,
      sdk: null as unknown as SDK,
      resetContext: () => {},
    });

    rerender();

    await waitFor(() => {
      expect(result.current.variant).toBe(2);
    });
  });
});
