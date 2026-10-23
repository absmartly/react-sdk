import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
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
  mocks.context.isFailed.mockReturnValue(false);
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
      expect.stringContaining("No context available"),
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
      ),
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
      expect.stringContaining("No context available"),
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
      ),
    ).not.toThrow();
  });
});

describe("Fix #3: useContextReady calls onReady when initially ready", () => {
  it("should call treatment when context is ready on mount", async () => {
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.peek.mockReturnValue(1);

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
    mocks.context.peek.mockReturnValue(1);

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
      expect(alert).not.toBeNull();
      expect(alert!.textContent).not.toContain("Secret API error");
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
      expect(alert).not.toBeNull();
      expect(alert!.textContent).toContain("Debug error info");
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
      expect(alert).not.toBeNull();
      expect(alert!.textContent).not.toContain("Secret error");
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
      expect(customError).not.toBeNull();
      expect(customError!.textContent).toBe("Custom Error UI");
    });
  });
});

describe("Fix #10: childrenInfo memoized in Treatment", () => {
  it("should render correct variant with memoized childrenInfo", async () => {
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(2);
    mocks.context.peek.mockReturnValue(2);

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
    mocks.context.peek.mockReturnValue(0);

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

describe("Treatment rerender while context is finalizing", () => {
  it("does not evaluate a finalizing context when children change", async () => {
    let finalizing = false;
    const ctx = {
      isReady: vi.fn().mockReturnValue(true),
      isFailed: vi.fn().mockReturnValue(false),
      isFinalizing: vi.fn(() => finalizing),
      isFinalized: vi.fn().mockReturnValue(false),
      ready: vi.fn().mockResolvedValue(undefined),
      attributes: vi.fn(),
      treatment: vi.fn().mockReturnValue(0),
      peek: vi.fn(() => {
        if (finalizing) throw new Error("ABsmartly Context is finalizing.");
        return 0;
      }),
    } as unknown as Context;

    vi.spyOn(console, "error").mockImplementation(() => {});

    const renderTree = (label: string) => (
      <ErrorBoundary fallback={<p>Boundary fallback</p>}>
        <Treatment context={ctx} name="test_exp">
          <TreatmentVariant variant="0">
            <p>{label}</p>
          </TreatmentVariant>
        </Treatment>
      </ErrorBoundary>
    );

    const { rerender } = render(renderTree("Control A"));
    await waitFor(() => expect(screen.getByText("Control A")).toBeTruthy());

    finalizing = true;
    rerender(renderTree("Control B"));

    await waitFor(() => expect(screen.getByText("Control B")).toBeTruthy());
    expect(screen.queryByText("Boundary fallback")).toBeNull();
  });
});

describe("Declarative treatments during reset", () => {
  const makeFinalizingContext = () => {
    let finalizing = false;
    const fail = () => {
      if (finalizing) throw new Error("ABsmartly Context is finalizing.");
      return 0;
    };
    const ctx = {
      isReady: vi.fn().mockReturnValue(true),
      isFailed: vi.fn().mockReturnValue(false),
      isFinalizing: vi.fn(() => finalizing),
      isFinalized: vi.fn().mockReturnValue(false),
      ready: vi.fn().mockResolvedValue(undefined),
      attributes: vi.fn(),
      treatment: vi.fn(fail),
      peek: vi.fn(fail),
      variableKeys: vi.fn(() => {
        fail();
        return {};
      }),
      peekVariableValue: vi.fn(),
    } as unknown as Context;
    return { ctx, startFinalizing: () => (finalizing = true) };
  };

  it("Treatment name change while finalizing reports an error instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ctx, startFinalizing } = makeFinalizingContext();
    const tree = (name: string) => (
      <ErrorBoundary fallback={<p>Boundary fallback</p>}>
        <Treatment context={ctx} name={name}>
          <TreatmentVariant variant="0">
            <p>Control</p>
          </TreatmentVariant>
        </Treatment>
      </ErrorBoundary>
    );

    const { rerender } = render(tree("exp_a"));
    await waitFor(() => expect(screen.getByText("Control")).toBeTruthy());

    startFinalizing();
    rerender(tree("exp_b"));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Boundary fallback")).toBeNull();
  });

  it("TreatmentFunction name change while finalizing reports an error instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ctx, startFinalizing } = makeFinalizingContext();
    const tree = (name: string) => (
      <ErrorBoundary fallback={<p>Boundary fallback</p>}>
        <TreatmentFunction context={ctx} name={name}>
          {({ variant }: TreatmentProps) => <p>Variant {variant}</p>}
        </TreatmentFunction>
      </ErrorBoundary>
    );

    const { rerender } = render(tree("exp_a"));
    await waitFor(() => expect(screen.getByText("Variant 0")).toBeTruthy());

    startFinalizing();
    rerender(tree("exp_b"));

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Boundary fallback")).toBeNull();
  });

  it("Treatment mounted while finalizing reports an error instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ctx, startFinalizing } = makeFinalizingContext();
    startFinalizing();

    render(
      <ErrorBoundary fallback={<p>Boundary fallback</p>}>
        <Treatment context={ctx} name="exp_a">
          <TreatmentVariant variant="0">
            <p>Control</p>
          </TreatmentVariant>
        </Treatment>
      </ErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Boundary fallback")).toBeNull();
  });

  it("TreatmentFunction mounted while finalizing reports an error instead of throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { ctx, startFinalizing } = makeFinalizingContext();
    startFinalizing();

    render(
      <ErrorBoundary fallback={<p>Boundary fallback</p>}>
        <TreatmentFunction context={ctx} name="exp_a">
          {({ variant }: TreatmentProps) => <p>Variant {variant}</p>}
        </TreatmentFunction>
      </ErrorBoundary>,
    );

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    expect(screen.queryByText("Boundary fallback")).toBeNull();
  });
});
