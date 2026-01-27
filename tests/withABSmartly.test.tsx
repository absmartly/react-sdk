import { cleanup, render, screen } from "@testing-library/react";
import React, { forwardRef, ComponentType } from "react";
import { afterEach, describe, expect, it, vi, MockedClass } from "vitest";

import { Context, SDK } from "@absmartly/javascript-sdk";
import { SDKProvider } from "../src/components/SDKProvider";
import { withABSmartly } from "../src/hooks/HOCs/withABSmartly";
import { ABSmartly } from "../src/types";

vi.mock("@absmartly/javascript-sdk");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const mockContextData = {
  experiments: [],
};

const mockCreateContext = vi.fn().mockImplementation(() => {
  return {
    ...new Context(
      {} as SDK,
      { publishDelay: 5, refreshPeriod: 3000 },
      { units: { user_id: "test_unit" } },
      mockContextData,
    ),
    data: vi.fn().mockReturnValue(mockContextData),
    isReady: vi.fn().mockReturnValue(true),
    treatment: vi.fn().mockReturnValue(1),
  };
});

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

describe("withABSmartly HOC", () => {
  it("should properly wrap a component and pass absmartly prop", () => {
    interface TestComponentProps {
      absmartly: ABSmartly;
      testProp?: string;
    }

    const TestComponent = ({ absmartly, testProp }: TestComponentProps) => {
      return (
        <div data-testid="test-component">
          <span data-testid="has-sdk">{absmartly.sdk ? "yes" : "no"}</span>
          <span data-testid="has-context">
            {absmartly.context ? "yes" : "no"}
          </span>
          <span data-testid="test-prop">{testProp || "none"}</span>
        </div>
      );
    };

    const WrappedComponent = withABSmartly(TestComponent);

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <WrappedComponent testProp="hello" />
      </SDKProvider>,
    );

    expect(screen.getByTestId("test-component")).toBeInTheDocument();
    expect(screen.getByTestId("has-sdk")).toHaveTextContent("yes");
    expect(screen.getByTestId("has-context")).toHaveTextContent("yes");
  });

  it("should pass through additional props correctly", () => {
    interface TestComponentProps {
      absmartly: ABSmartly;
      message: string;
      count: number;
      items: string[];
    }

    const TestComponent = ({
      message,
      count,
      items,
    }: TestComponentProps) => {
      return (
        <div>
          <span data-testid="message">{message}</span>
          <span data-testid="count">{count}</span>
          <span data-testid="items">{items.join(",")}</span>
        </div>
      );
    };

    const WrappedComponent = withABSmartly(TestComponent);

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <WrappedComponent
          message="test message"
          count={42}
          items={["a", "b", "c"]}
        />
      </SDKProvider>,
    );

    expect(screen.getByTestId("message")).toHaveTextContent("test message");
    expect(screen.getByTestId("count")).toHaveTextContent("42");
    expect(screen.getByTestId("items")).toHaveTextContent("a,b,c");
  });

  it("should provide access to context methods via absmartly prop", () => {
    interface TestComponentProps {
      absmartly: ABSmartly;
    }

    const TestComponent = ({ absmartly }: TestComponentProps) => {
      const treatment = absmartly.context.treatment("test_exp");
      return (
        <div>
          <span data-testid="treatment">{treatment}</span>
          <span data-testid="has-reset">
            {typeof absmartly.resetContext === "function" ? "yes" : "no"}
          </span>
        </div>
      );
    };

    const WrappedComponent = withABSmartly(TestComponent);

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <WrappedComponent />
      </SDKProvider>,
    );

    expect(screen.getByTestId("treatment")).toHaveTextContent("1");
    expect(screen.getByTestId("has-reset")).toHaveTextContent("yes");
  });

  it("should set correct displayName for wrapped component", () => {
    interface TestComponentProps {
      absmartly: ABSmartly;
    }

    const NamedComponent = ({ absmartly }: TestComponentProps) => {
      return <div>{absmartly ? "wrapped" : "not wrapped"}</div>;
    };

    const WrappedComponent = withABSmartly(NamedComponent);

    expect(WrappedComponent.displayName).toBe("withABSmartly(NamedComponent)");
  });

  it("should use Component fallback for displayName when component has no name", () => {
    interface TestComponentProps {
      absmartly: ABSmartly;
    }

    const WrappedComponent = withABSmartly(
      (({ absmartly }: TestComponentProps) => (
        <div>{absmartly ? "wrapped" : "not wrapped"}</div>
      )) as ComponentType<TestComponentProps>,
    );

    expect(WrappedComponent.displayName).toBe("withABSmartly(Component)");
  });

  it("should work with components that have displayName property", () => {
    interface TestComponentProps {
      absmartly: ABSmartly;
    }

    const TestComponent = ({ absmartly }: TestComponentProps) => {
      return <div>{absmartly ? "wrapped" : "not wrapped"}</div>;
    };
    TestComponent.displayName = "CustomDisplayName";

    const WrappedComponent = withABSmartly(TestComponent);

    expect(WrappedComponent.displayName).toBe(
      "withABSmartly(CustomDisplayName)",
    );
  });

  it("should work with class components", () => {
    interface TestComponentProps {
      absmartly: ABSmartly;
      title: string;
    }

    class ClassComponent extends React.Component<TestComponentProps> {
      render() {
        const { absmartly, title } = this.props;
        return (
          <div>
            <span data-testid="title">{title}</span>
            <span data-testid="has-context">
              {absmartly.context ? "yes" : "no"}
            </span>
          </div>
        );
      }
    }

    const WrappedComponent = withABSmartly(ClassComponent);

    render(
      <SDKProvider sdkOptions={sdkOptions} contextOptions={contextOptions}>
        <WrappedComponent title="Test Title" />
      </SDKProvider>,
    );

    expect(screen.getByTestId("title")).toHaveTextContent("Test Title");
    expect(screen.getByTestId("has-context")).toHaveTextContent("yes");
  });
});
