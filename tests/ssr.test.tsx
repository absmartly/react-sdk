import { cleanup, renderHook } from "@testing-library/react";
import React, { FC, PropsWithChildren } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  MockedFunction,
} from "vitest";
import { renderToString } from "react-dom/server";

import { Context, SDK } from "@absmartly/javascript-sdk";
import { useABSmartly, useTreatment, Treatment, TreatmentVariant } from "../src";
import { SDKProvider } from "../src/components/SDKProvider";

vi.mock("../src/hooks/useABSmartly");

const mockedUseABSmartly = useABSmartly as MockedFunction<typeof useABSmartly>;

const createMockContext = (isReady = true) => ({
  ready: vi.fn().mockResolvedValue(undefined),
  peek: vi.fn().mockReturnValue(1),
  treatment: vi.fn().mockReturnValue(1),
  isReady: vi.fn().mockReturnValue(isReady),
  isFailed: vi.fn().mockReturnValue(false),
  attributes: vi.fn(),
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("SSR Support", () => {
  describe("useTreatment SSR behavior", () => {
    it("should return variant immediately when context is pre-ready (SSR scenario)", () => {
      const mockContext = createMockContext(true);
      mockContext.treatment.mockReturnValue(2);

      mockedUseABSmartly.mockReturnValue({
        context: mockContext as unknown as Context,
        sdk: null as unknown as SDK,
        resetContext: () => {},
      });

      const { result } = renderHook(() => useTreatment("experiment-name"));

      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(2);
      expect(result.current.error).toBe(null);
      expect(mockContext.ready).not.toHaveBeenCalled();
    });

    it("should support static rendering without async operations when context is ready", () => {
      const mockContext = createMockContext(true);
      mockContext.treatment.mockReturnValue(1);

      mockedUseABSmartly.mockReturnValue({
        context: mockContext as unknown as Context,
        sdk: null as unknown as SDK,
        resetContext: () => {},
      });

      const TestComponent = () => {
        const { variant, loading } = useTreatment("test-experiment");
        return (
          <div>
            {loading ? "Loading..." : `Variant: ${variant}`}
          </div>
        );
      };

      const wrapper: FC<PropsWithChildren> = ({ children }) => (
        <>{children}</>
      );

      const { result } = renderHook(() => useTreatment("test-experiment"), {
        wrapper,
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.variant).toBe(1);
    });
  });

  describe("Treatment component SSR behavior", () => {
    it("should render control variant during SSR when context is not ready", () => {
      const mockContext = createMockContext(false);

      mockedUseABSmartly.mockReturnValue({
        context: mockContext as unknown as Context,
        sdk: null as unknown as SDK,
        resetContext: () => {},
      });

      const html = renderToString(
        <Treatment name="test_exp" context={mockContext as unknown as Context}>
          <TreatmentVariant variant="0">
            <div>Control</div>
          </TreatmentVariant>
          <TreatmentVariant variant="1">
            <div>Variant 1</div>
          </TreatmentVariant>
        </Treatment>,
      );

      expect(html).toContain("Control");
      expect(html).not.toContain("Variant 1");
    });

    it("should render correct variant during SSR when context is ready", () => {
      const mockContext = createMockContext(true);
      mockContext.treatment.mockReturnValue(1);

      mockedUseABSmartly.mockReturnValue({
        context: mockContext as unknown as Context,
        sdk: null as unknown as SDK,
        resetContext: () => {},
      });

      const html = renderToString(
        <Treatment name="test_exp" context={mockContext as unknown as Context}>
          <TreatmentVariant variant="0">
            <div>Control</div>
          </TreatmentVariant>
          <TreatmentVariant variant="1">
            <div>Variant 1</div>
          </TreatmentVariant>
        </Treatment>,
      );

      expect(html).toContain("Variant 1");
      expect(html).not.toContain("Control");
    });

    it("should render loading component during SSR when provided and context not ready", () => {
      const mockContext = createMockContext(false);

      mockedUseABSmartly.mockReturnValue({
        context: mockContext as unknown as Context,
        sdk: null as unknown as SDK,
        resetContext: () => {},
      });

      const html = renderToString(
        <Treatment
          name="test_exp"
          context={mockContext as unknown as Context}
          loadingComponent={<div>Loading...</div>}
        >
          <TreatmentVariant variant="0">
            <div>Control</div>
          </TreatmentVariant>
          <TreatmentVariant variant="1">
            <div>Variant 1</div>
          </TreatmentVariant>
        </Treatment>,
      );

      expect(html).toContain("Loading...");
      expect(html).not.toContain("Control");
      expect(html).not.toContain("Variant 1");
    });
  });

  describe("Context serialization for SSR", () => {
    it("should allow context data to be accessed synchronously", () => {
      const mockContext = createMockContext(true);
      mockContext.treatment.mockReturnValue(0);

      mockedUseABSmartly.mockReturnValue({
        context: mockContext as unknown as Context,
        sdk: null as unknown as SDK,
        resetContext: () => {},
      });

      const { result } = renderHook(() => useTreatment("experiment"));

      expect(result.current.context).toBeDefined();
      expect(mockContext.treatment).toHaveBeenCalledWith("experiment");
    });
  });
});
