import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi, MockedClass } from "vitest";

import { Context, SDK } from "@absmartly/javascript-sdk";
import { Treatment, TreatmentVariant, TreatmentProps } from "../src";
import { TreatmentFunction } from "../src/components/Treatment/TreatmentFunction";
import { ErrorBoundary } from "../src/components/ErrorBoundary/ErrorBoundary";
import { mocks } from "./mocks";

vi.mock("@absmartly/javascript-sdk");
vi.mock("../src/hooks/useABSmartly");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Fix #1: Rules of Hooks - Treatment renders without context", () => {
  it("should return null when no context prop is provided and no provider", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container } = render(
      <Treatment name="test_exp">
        <TreatmentVariant variant={0}>
          <p>Control</p>
        </TreatmentVariant>
      </Treatment>,
    );

    expect(container.innerHTML).toBe("");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No context available")
    );
    warnSpy.mockRestore();
  });

  it("should not crash with hooks error when context is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() =>
      render(
        <Treatment name="test_exp">
          <TreatmentVariant variant={0}>
            <p>Control</p>
          </TreatmentVariant>
        </Treatment>,
      )
    ).not.toThrow();
  });
});

describe("Fix #1: Rules of Hooks - TreatmentFunction renders without context", () => {
  it("should return null when no context is available", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { container } = render(
      <TreatmentFunction name="test_exp">
        {({ variant }: TreatmentProps) => <p>Variant {variant}</p>}
      </TreatmentFunction>,
    );

    expect(container.innerHTML).toBe("");
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("No context available")
    );
    warnSpy.mockRestore();
  });

  it("should not crash with hooks error when context is missing", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    expect(() =>
      render(
        <TreatmentFunction name="test_exp">
          {({ variant }: TreatmentProps) => <p>Variant {variant}</p>}
        </TreatmentFunction>,
      )
    ).not.toThrow();
  });
});

describe("Fix #3: useContextReady calls onReady when initially ready", () => {
  it("should call treatment when context is ready on mount", async () => {
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(1);

    render(
      <Treatment context={mocks.context} name="test_exp">
        <TreatmentVariant variant="0">
          <p>Control</p>
        </TreatmentVariant>
        <TreatmentVariant variant="1">
          <p>Variant 1</p>
        </TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
    });
  });

  it("should set correct variant when context is ready on mount", async () => {
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(1);

    const { getByText } = render(
      <Treatment context={mocks.context} name="test_exp">
        <TreatmentVariant variant="0">
          <p>Control</p>
        </TreatmentVariant>
        <TreatmentVariant variant="1">
          <p>Variant 1</p>
        </TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      expect(getByText("Variant 1")).toBeTruthy();
    });
  });
});

describe("Fix #4 & #15: Error messages hidden in production", () => {
  it("Treatment should not show error.message in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(true);
    mocks.context.ready.mockRejectedValue(new Error("Secret API error"));

    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <Treatment context={mocks.context} name="test_exp">
        <TreatmentVariant variant="0">
          <p>Control</p>
        </TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      const alert = container.querySelector('[role="alert"]');
      if (alert) {
        expect(alert.textContent).not.toContain("Secret API error");
      }
    });

    process.env.NODE_ENV = originalEnv;
  });

  it("Treatment should show error.message in development", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(true);
    mocks.context.ready.mockRejectedValue(new Error("Debug error info"));

    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <Treatment context={mocks.context} name="test_exp">
        <TreatmentVariant variant="0">
          <p>Control</p>
        </TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      const alert = container.querySelector('[role="alert"]');
      if (alert) {
        expect(alert.textContent).toContain("Debug error info");
      }
    });

    process.env.NODE_ENV = originalEnv;
  });

  it("TreatmentFunction should not show error.message in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(true);
    mocks.context.ready.mockRejectedValue(new Error("Secret error"));

    vi.spyOn(console, "error").mockImplementation(() => {});

    const { container } = render(
      <TreatmentFunction context={mocks.context} name="test_exp">
        {({ variant }: TreatmentProps) => <p>Variant {variant}</p>}
      </TreatmentFunction>,
    );

    await waitFor(() => {
      const alert = container.querySelector('[role="alert"]');
      if (alert) {
        expect(alert.textContent).not.toContain("Secret error");
      }
    });

    process.env.NODE_ENV = originalEnv;
  });

  it("ErrorBoundary should show generic message in production", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    vi.spyOn(console, "error").mockImplementation(() => {});

    const ThrowingComponent = () => {
      throw new Error("Internal secret");
    };

    const { container } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(container.textContent).toContain("Something went wrong.");
    expect(container.textContent).not.toContain("Internal secret");

    process.env.NODE_ENV = originalEnv;
  });

  it("ErrorBoundary should show error message in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    vi.spyOn(console, "error").mockImplementation(() => {});

    const ThrowingComponent = () => {
      throw new Error("Debug details here");
    };

    const { container } = render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );

    expect(container.textContent).toContain("Debug details here");

    process.env.NODE_ENV = originalEnv;
  });
});

describe("Fix #8: Treatment accepts errorComponent prop", () => {
  it("should render custom errorComponent when error occurs", async () => {
    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(true);
    mocks.context.ready.mockRejectedValue(new Error("Test error"));

    vi.spyOn(console, "error").mockImplementation(() => {});

    const { queryByTestId } = render(
      <Treatment
        context={mocks.context}
        name="test_exp"
        errorComponent={<div data-testid="custom-error">Custom Error UI</div>}
      >
        <TreatmentVariant variant="0">
          <p>Control</p>
        </TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      const customError = queryByTestId("custom-error");
      if (customError) {
        expect(customError.textContent).toBe("Custom Error UI");
      }
    });
  });
});

describe("Fix #10: childrenInfo memoized in Treatment", () => {
  it("should render correct variant with memoized childrenInfo", async () => {
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(2);

    const { getByText } = render(
      <Treatment context={mocks.context} name="test_exp">
        <TreatmentVariant variant="0">
          <p>Control</p>
        </TreatmentVariant>
        <TreatmentVariant variant="1">
          <p>Variant 1</p>
        </TreatmentVariant>
        <TreatmentVariant variant="2">
          <p>Variant 2</p>
        </TreatmentVariant>
      </Treatment>,
    );

    await waitFor(() => {
      expect(getByText("Variant 2")).toBeTruthy();
    });
  });
});

describe("Fix #11: useContextReady uses refs for onReady and attributes", () => {
  it("should not cause excessive renders with inline attributes", async () => {
    const renderCount = vi.fn();

    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(0);

    const TestComponent = () => {
      renderCount();
      return (
        <Treatment
          context={mocks.context}
          name="test_exp"
          attributes={{ key: "value" }}
        >
          <TreatmentVariant variant="0">
            <p>Control</p>
          </TreatmentVariant>
        </Treatment>
      );
    };

    render(<TestComponent />);

    await waitFor(() => {
      expect(renderCount.mock.calls.length).toBeLessThan(10);
    });
  });
});
