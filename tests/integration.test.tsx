import { cleanup, render, screen, waitFor } from "@testing-library/react";
import React, { Suspense, Component, ReactNode } from "react";
import { afterEach, describe, expect, it, vi, MockedClass } from "vitest";

import { Context, SDK } from "@absmartly/javascript-sdk";

import { SDKProvider } from "../src/components/SDKProvider";
import { Treatment, TreatmentVariant, TreatmentFunction, TreatmentProps } from "../src";

vi.mock("@absmartly/javascript-sdk");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockContextData = {
  experiments: [],
};

const createMockContext = (treatment: number, isReady = true) => ({
  data: vi.fn().mockReturnValue(mockContextData),
  isReady: vi.fn().mockReturnValue(isReady),
  isFailed: vi.fn().mockReturnValue(false),
  treatment: vi.fn().mockReturnValue(treatment),
  ready: vi.fn().mockResolvedValue(undefined),
  attributes: vi.fn(),
  variableKeys: vi.fn().mockReturnValue({}),
  peekVariableValue: vi.fn(),
});

const mockCreateContext = vi.fn();

(SDK as MockedClass<typeof SDK>).mockImplementation(() => {
  return {
    createContext: mockCreateContext,
    createContextWith: vi.fn(),
  } as unknown as SDK;
});

const sdkOptions = {
  endpoint: "https://sandbox.absmartly.io/v1",
  apiKey: "test-api-key",
  application: "www",
  environment: "test",
};

const contextOptions = {
  units: {
    user_id: "test-user-id",
  },
};

describe("Integration Tests", () => {
  describe("Multiple Treatments in Tree", () => {
    it("should render multiple treatments correctly in a component tree", async () => {
      const context1 = createMockContext(1);
      const context2 = createMockContext(2);
      const context3 = createMockContext(0);

      render(
        <div>
          <Treatment name="header_experiment" context={context1 as unknown as Context}>
            <TreatmentVariant variant="0">
              <div data-testid="header-control">Header Control</div>
            </TreatmentVariant>
            <TreatmentVariant variant="1">
              <div data-testid="header-variant">Header Variant</div>
            </TreatmentVariant>
          </Treatment>

          <Treatment name="button_experiment" context={context2 as unknown as Context}>
            <TreatmentVariant variant="0">
              <button data-testid="button-control">Buy Now</button>
            </TreatmentVariant>
            <TreatmentVariant variant="1">
              <button data-testid="button-variant1">Add to Cart</button>
            </TreatmentVariant>
            <TreatmentVariant variant="2">
              <button data-testid="button-variant2">Get Started</button>
            </TreatmentVariant>
          </Treatment>

          <Treatment name="footer_experiment" context={context3 as unknown as Context}>
            <TreatmentVariant variant="0">
              <footer data-testid="footer-control">Simple Footer</footer>
            </TreatmentVariant>
            <TreatmentVariant variant="1">
              <footer data-testid="footer-variant">Extended Footer</footer>
            </TreatmentVariant>
          </Treatment>
        </div>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("header-variant")).toBeInTheDocument();
        expect(screen.getByTestId("button-variant2")).toBeInTheDocument();
        expect(screen.getByTestId("footer-control")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("header-control")).not.toBeInTheDocument();
      expect(screen.queryByTestId("button-control")).not.toBeInTheDocument();
      expect(screen.queryByTestId("footer-variant")).not.toBeInTheDocument();
    });

    it("should handle nested treatments correctly", async () => {
      const outerContext = createMockContext(1);
      const innerContext = createMockContext(0);

      render(
        <Treatment name="outer_experiment" context={outerContext as unknown as Context}>
          <TreatmentVariant variant="0">
            <div data-testid="outer-control">Outer Control</div>
          </TreatmentVariant>
          <TreatmentVariant variant="1">
            <div data-testid="outer-variant">
              <span>Outer Variant</span>
              <Treatment name="inner_experiment" context={innerContext as unknown as Context}>
                <TreatmentVariant variant="0">
                  <span data-testid="inner-control">Inner Control</span>
                </TreatmentVariant>
                <TreatmentVariant variant="1">
                  <span data-testid="inner-variant">Inner Variant</span>
                </TreatmentVariant>
              </Treatment>
            </div>
          </TreatmentVariant>
        </Treatment>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("outer-variant")).toBeInTheDocument();
        expect(screen.getByTestId("inner-control")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("outer-control")).not.toBeInTheDocument();
      expect(screen.queryByTestId("inner-variant")).not.toBeInTheDocument();
    });
  });

  describe("Treatment with Suspense", () => {
    it("should work correctly with React Suspense boundaries", async () => {
      const context = createMockContext(1);

      render(
        <Suspense fallback={<div data-testid="suspense-fallback">Loading...</div>}>
          <Treatment name="test_experiment" context={context as unknown as Context}>
            <TreatmentVariant variant="0">
              <div data-testid="control">Control Content</div>
            </TreatmentVariant>
            <TreatmentVariant variant="1">
              <div data-testid="variant">Variant Content</div>
            </TreatmentVariant>
          </Treatment>
        </Suspense>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("variant")).toBeInTheDocument();
      });
    });
  });

  describe("Treatment with Error Boundary", () => {
    class ErrorBoundary extends Component<
      { children: ReactNode; fallback: ReactNode },
      { hasError: boolean }
    > {
      constructor(props: { children: ReactNode; fallback: ReactNode }) {
        super(props);
        this.state = { hasError: false };
      }

      static getDerivedStateFromError() {
        return { hasError: true };
      }

      render() {
        if (this.state.hasError) {
          return this.props.fallback;
        }
        return this.props.children;
      }
    }

    it("should work correctly inside an error boundary", async () => {
      const context = createMockContext(1);

      render(
        <ErrorBoundary fallback={<div data-testid="error-fallback">Error occurred</div>}>
          <Treatment name="test_experiment" context={context as unknown as Context}>
            <TreatmentVariant variant="0">
              <div data-testid="control">Control</div>
            </TreatmentVariant>
            <TreatmentVariant variant="1">
              <div data-testid="variant">Variant</div>
            </TreatmentVariant>
          </Treatment>
        </ErrorBoundary>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("variant")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("error-fallback")).not.toBeInTheDocument();
    });
  });

  describe("TreatmentFunction integration", () => {
    it("should render correctly with function children pattern", async () => {
      const context = createMockContext(2);

      render(
        <TreatmentFunction name="pricing_experiment" context={context as unknown as Context}>
          {({ variant }: TreatmentProps) => (
            <div data-testid="pricing">
              {variant === 0 && <span>Basic: $9.99</span>}
              {variant === 1 && <span>Pro: $19.99</span>}
              {variant === 2 && <span>Enterprise: $49.99</span>}
            </div>
          )}
        </TreatmentFunction>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("pricing")).toHaveTextContent("Enterprise: $49.99");
      });
    });

    it("should pass variant and variables to render function", async () => {
      const context = createMockContext(1);

      render(
        <TreatmentFunction name="feature_experiment" context={context as unknown as Context}>
          {({ variant, variables }: TreatmentProps) => (
            <div>
              <span data-testid="variant-value">{variant}</span>
              <span data-testid="variables-type">{typeof variables}</span>
            </div>
          )}
        </TreatmentFunction>,
      );

      await waitFor(() => {
        expect(screen.getByTestId("variant-value")).toHaveTextContent("1");
        expect(screen.getByTestId("variables-type")).toHaveTextContent("object");
      });
    });
  });

  describe("Treatment with attributes", () => {
    it("should pass attributes to context correctly", async () => {
      const context = createMockContext(1);
      const attributes = { plan: "premium", country: "US" };

      render(
        <Treatment
          name="personalized_experiment"
          context={context as unknown as Context}
          attributes={attributes}
        >
          <TreatmentVariant variant="0">
            <div>Control</div>
          </TreatmentVariant>
          <TreatmentVariant variant="1">
            <div data-testid="personalized">Personalized Content</div>
          </TreatmentVariant>
        </Treatment>,
      );

      await waitFor(() => {
        expect(context.attributes).toHaveBeenCalledWith(attributes);
        expect(screen.getByTestId("personalized")).toBeInTheDocument();
      });
    });
  });
});
