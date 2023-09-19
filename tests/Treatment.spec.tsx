import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";

import { Treatment, TreatmentFunction, TreatmentVariant } from "../src";
import { Char, TreatmentProps } from "../src/types";
import { Context } from "@absmartly/javascript-sdk";

jest.mock("@absmartly/javascript-sdk");

const baseMockContext: Partial<InstanceType<typeof Context>> = {
  treatment: jest.fn().mockReturnValue(1),
  attributes: jest.fn(),
  ready: jest.fn().mockResolvedValue(true),
  isReady: jest.fn().mockReturnValue(true),
  isFailed: jest.fn().mockReturnValue(false),
  variableKeys: jest.fn().mockReturnValue({ "button.color": "red" }),
  peekVariableValue: jest.fn(),
};

const mockContext = baseMockContext as InstanceType<typeof Context>;

afterEach(cleanup);

const mocks = {
  context: mockContext,
};

describe("Treatment Component (TreatmentVariants as children)", () => {
  it("should not render loading component when ready", async () => {
    const TestComponent = jest.fn();
    const TestLoadingComponent = jest.fn();

    const attributes = { attr1: 15, attr2: 50 };

    render(
      <Treatment
        context={mocks.context}
        name="test_exp"
        attributes={attributes}
        loadingComponent={<TestLoadingComponent />}
      >
        <TreatmentVariant variant="0">
          <p>Hello 1</p>
        </TreatmentVariant>
        <TreatmentVariant variant="1">
          <TestComponent />
        </TreatmentVariant>
        <TreatmentVariant variant="2">
          <p>Hello 2</p>
        </TreatmentVariant>
      </Treatment>
    );

    await waitFor(() => {
      expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
      expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
      expect(mocks.context.attributes).toHaveBeenCalledTimes(1);
      expect(mocks.context.attributes).toHaveBeenCalledWith(attributes);
      expect(TestLoadingComponent).not.toHaveBeenCalled();
      expect(TestComponent).toHaveBeenCalledTimes(1);
    });
  });

  it("should render loading component when not ready", async () => {
    const TestLoadingComponent = jest.fn();
    const TestTreatmentVariant = jest.fn();

    const context = {
      ...mocks.context,
      ready: jest.fn().mockResolvedValue(true),
      isReady: jest.fn().mockReturnValue(false),
      isFailed: jest.fn().mockReturnValue(false),
    } as unknown as InstanceType<typeof Context>;

    render(
      <Treatment
        context={context}
        name="test_exp"
        loadingComponent={<TestLoadingComponent />}
      >
        <TestTreatmentVariant variant={0}>
          <p>Hello 0</p>
        </TestTreatmentVariant>
      </Treatment>
    );

    await waitFor(() => {
      expect(context.treatment).not.toHaveBeenCalled();
      expect(context.attributes).not.toHaveBeenCalled();
      expect(TestTreatmentVariant).not.toHaveBeenCalled();
      expect(TestLoadingComponent).toHaveBeenCalledTimes(1);
    });
  });

  it("Should render control variant when no loading component is provided", async () => {
    const TestComponent = jest.fn();

    const ready = Promise.resolve(true);

    const context = {
      ...mocks.context,
      ready: jest.fn().mockReturnValue(ready),
      isReady: jest.fn().mockReturnValue(false),
      isFailed: jest.fn().mockReturnValue(false),
    } as unknown as InstanceType<typeof Context>;

    const attributes = {
      attr1: 15,
      attr2: 50,
    };

    render(
      <Treatment context={context} name="test_exp">
        <TestComponent variant="0">
          <p>Hello World 0!</p>
        </TestComponent>
        <TreatmentVariant variant="1">
          <p>Hello World 1!</p>
        </TreatmentVariant>
      </Treatment>
    );

    expect(context.treatment).not.toHaveBeenCalled();
    expect(context.attributes).not.toHaveBeenCalled();
    expect(TestComponent).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      TestComponent.mockClear();
    });

    const context2 = {
      ...context,
      isReady: jest.fn().mockReturnValue(true),
      treatment: jest.fn().mockReturnValue(1),
      attributes: jest.fn().mockReturnValue(attributes),
    };

    ready.then(async () => {
      await waitFor(() => {
        expect(context2.treatment).toHaveBeenCalledTimes(1);
        expect(context2.treatment).toHaveBeenCalledWith("test_exp");
        expect(context2.attributes).toHaveBeenCalledTimes(1);
        expect(context2.attributes).toHaveBeenCalledWith(attributes);
        expect(TestComponent).toHaveBeenCalledTimes(1);
        expect(TestComponent).toHaveBeenCalledWith({
          ready: true,
          failed: false,
          treatment: 1,
        });
      });
    });
  });

  it.each([
    [0, "0"],
    [1, "1"],
    [2, "2"],
    [3, "3"],
    [4, "4"],
  ])(
    "should render treatment component %i by variant (%s)",
    async (variant, component) => {
      const TestComponent = jest.fn();
      const ControlComponent = jest.fn();
      const TestLoadingComponent = jest.fn();

      const context = {
        ...mocks.context,
        isReady: jest.fn().mockReturnValue(true),
        isFailed: jest.fn().mockReturnValue(false),
        treatment: jest.fn().mockReturnValue(variant),
      } as unknown as InstanceType<typeof Context>;

      render(
        <Treatment
          loadingComponent={<TestLoadingComponent />}
          context={context}
          name="test_exp"
        >
          <TreatmentVariant variant="Z">
            <ControlComponent />
          </TreatmentVariant>
          <TreatmentVariant variant={component as number | Char}>
            <TestComponent />
          </TreatmentVariant>
        </Treatment>
      );

      await waitFor(() => {
        expect(ControlComponent).toHaveBeenCalledTimes(0);
        expect(TestComponent).toHaveBeenCalledTimes(1);
      });
    }
  );

  it.each([
    [0, "A"],
    [1, "B"],
    [2, "C"],
    [3, "D"],
    [4, "E"],
  ])(
    "should render treatment component %i by alpha (%s)",
    async (variant, component) => {
      const TestComponent = jest.fn();
      const TestLoadingComponent = jest.fn();

      const context = {
        ...mocks.context,
        isReady: jest.fn().mockReturnValue(true),
        isFailed: jest.fn().mockReturnValue(false),
        treatment: jest.fn().mockReturnValue(variant),
      } as unknown as InstanceType<typeof Context>;

      render(
        <Treatment
          loadingComponent={<TestLoadingComponent />}
          context={context}
          name="test_exp"
        >
          <TreatmentVariant variant="Z" />
          <TreatmentVariant variant={component as number | Char}>
            <TestComponent />
          </TreatmentVariant>
        </Treatment>
      );

      await waitFor(() => {
        expect(TestComponent).toHaveBeenCalledTimes(1);
      });
    }
  );

  it("should not call context.attributes with no attribute property", async () => {
    const TestComponent = jest.fn();
    const context = {
      ...mocks.context,
      isReady: jest.fn().mockReturnValue(true),
      isFailed: jest.fn().mockReturnValue(false),
      treatment: jest.fn().mockReturnValue(1),
    } as unknown as InstanceType<typeof Context>;

    render(
      <Treatment context={context} name="test_exp">
        <TreatmentVariant variant="0"></TreatmentVariant>
        <TreatmentVariant variant="1">
          <TestComponent></TestComponent>
        </TreatmentVariant>
      </Treatment>
    );

    await waitFor(() => {
      expect(context.treatment).toHaveBeenCalledTimes(1);
      expect(context.treatment).toHaveBeenCalledWith("test_exp");
      expect(context.attributes).not.toHaveBeenCalledWith();
      expect(TestComponent).toHaveBeenCalledTimes(1);
    });
  });
});

describe("TreatmentFunction Component", () => {
  it("should not render loading component when ready", async () => {
    const TestComponent0 = jest.fn();
    const TestComponent1 = jest.fn();
    const TestComponent2 = jest.fn();
    const TestLoadingComponent = jest.fn();

    const attributes = { attr1: 15, attr2: 50 };

    const context = {
      ...mocks.context,
      isReady: jest.fn().mockReturnValue(true),
      isFailed: jest.fn().mockReturnValue(false),
      treatment: jest.fn().mockReturnValue(1),
      ready: jest.fn().mockResolvedValue(true),
    } as unknown as InstanceType<typeof Context>;

    render(
      <TreatmentFunction
        context={context}
        name="test_exp"
        attributes={attributes}
        loadingComponent={<TestLoadingComponent />}
      >
        {({ variant }: TreatmentProps) =>
          variant === 0 ? (
            <TestComponent0 />
          ) : variant === 1 ? (
            <TestComponent1 />
          ) : (
            <TestComponent2 />
          )
        }
      </TreatmentFunction>
    );

    await waitFor(() => {
      expect(context.treatment).toHaveBeenCalledTimes(1);
      expect(context.treatment).toHaveBeenCalledWith("test_exp");
      expect(context.attributes).toHaveBeenCalledTimes(1);
      expect(context.attributes).toHaveBeenCalledWith(attributes);
      expect(TestLoadingComponent).not.toHaveBeenCalled();
      expect(TestComponent1).toHaveBeenCalledTimes(1);
    });
  });

  it("should render loading component when not ready", async () => {
    const TestLoadingComponent = jest.fn();
    const TestComponent = jest.fn();

    const ready = Promise.resolve(true);

    const context = {
      ...mocks.context,
      isReady: jest.fn().mockReturnValue(false),
      isFailed: jest.fn().mockReturnValue(false),
      ready: jest.fn().mockReturnValue(ready),
    } as unknown as InstanceType<typeof Context>;

    render(
      <TreatmentFunction
        loadingComponent={<TestLoadingComponent />}
        context={context}
        name="test_exp"
      >
        {({ variant }: TreatmentProps) => variant === 0 && <TestComponent />}
      </TreatmentFunction>
    );

    await waitFor(() => {
      expect(context.treatment).not.toHaveBeenCalled();
      expect(context.attributes).not.toHaveBeenCalled();
      expect(TestComponent).not.toHaveBeenCalled();
      expect(TestLoadingComponent).toHaveBeenCalledTimes(1);
    });

    ready.then(async () => {
      await waitFor(() => {
        expect(context.treatment).toHaveBeenCalledTimes(1);
        expect(context.treatment).toHaveBeenCalledWith("test_exp");
        expect(TestComponent).toHaveBeenCalledTimes(1);
        expect(TestComponent).toHaveBeenCalledWith({
          ready: true,
          failed: false,
          treatment: 1,
        });
      });
    });
  });

  it("Should render control variant when no loading component is provided", async () => {
    const TestComponent = jest.fn();
    const TestComponentThatShouldntRender = jest.fn();

    const ready = Promise.resolve(true);

    const context = {
      ...mocks.context,
      isReady: jest.fn().mockReturnValue(false),
      isFailed: jest.fn().mockReturnValue(false),
      ready: jest.fn().mockReturnValue(ready),
    } as unknown as InstanceType<typeof Context>;

    const attributes = {
      attr1: 15,
      attr2: 50,
    };

    render(
      <TreatmentFunction context={context} name="test_exp">
        {({ variant }: TreatmentProps) =>
          variant === 0 ? (
            <TestComponent />
          ) : (
            <TestComponentThatShouldntRender />
          )
        }
      </TreatmentFunction>
    );

    expect(context.treatment).not.toHaveBeenCalled();
    expect(context.attributes).not.toHaveBeenCalled();
    expect(TestComponent).toHaveBeenCalledTimes(1);
    expect(TestComponentThatShouldntRender).not.toHaveBeenCalled();

    await waitFor(() => {
      TestComponent.mockClear();
    });

    const config = { a: 1, b: 2 };

    ready.then(async () => {
      await waitFor(() => {
        expect(context.treatment).toHaveBeenCalledTimes(1);
        expect(context.treatment).toHaveBeenCalledWith("test_exp");
        expect(context.attributes).toHaveBeenCalledTimes(1);
        expect(context.attributes).toHaveBeenCalledWith(attributes);
        expect(TestComponent).toHaveBeenCalledTimes(1);
        expect(TestComponent).toHaveBeenCalledWith({
          ready: true,
          failed: false,
          treatment: 1,
          config,
        });
        expect(TestComponentThatShouldntRender).not.toHaveBeenCalled();
      });
    });
  });

  it.each([0, 1, 2, 3, 4])(
    "should render treatment component %i by variant (%s)",
    async (variant) => {
      const TestComponent = jest.fn();
      const TestLoadingComponent = jest.fn();

      const context = {
        ...mocks.context,
        isReady: jest.fn().mockReturnValue(true),
        isFailed: jest.fn().mockReturnValue(false),
        treatment: jest.fn().mockReturnValue(variant),
      } as unknown as InstanceType<typeof Context>;

      render(
        <TreatmentFunction
          loadingComponent={<TestLoadingComponent />}
          context={context}
          name="test_exp"
        >
          {(choices: TreatmentProps) =>
            variant === choices.variant && <TestComponent />
          }
        </TreatmentFunction>
      );

      await waitFor(() => {
        expect(TestComponent).toHaveBeenCalledTimes(1);
      });
    }
  );
});
