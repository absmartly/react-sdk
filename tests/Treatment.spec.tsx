import React from "react";
import { cleanup, render, waitFor } from "@testing-library/react";

import {
  Treatment,
  TreatmentFunction,
  TreatmentVariant,
} from "../src/components/Treatment";
import { Char, TreatmentProps } from "../src/types";

jest.mock("@absmartly/javascript-sdk");

afterEach(cleanup);
const mocks = {
  context: {
    treatment: jest.fn(),
    experimentConfig: jest.fn(),
    attributes: jest.fn(),
    ready: jest.fn(),
    isReady: jest.fn(),
    isFailed: jest.fn(),
    variableKeys: jest.fn().mockReturnValue({ "button.color": "red" }),
    peekVariableValue: jest.fn(),
  },
};

describe("Treatment Component (TreatmentVariants as children)", () => {
  it("should not render loading component when ready", async () => {
    const TestComponent = jest.fn();
    const TestLoadingComponent = jest.fn();

    const config = { a: 1, b: 2 };
    const attributes = { attr1: 15, attr2: 50 };

    mocks.context.isReady.mockReturnValue(true);
    mocks.context.isFailed.mockReturnValue(false);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.experimentConfig.mockReturnValue(config);
    mocks.context.ready.mockResolvedValue(true);

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

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(false);

    mocks.context.ready.mockResolvedValue(true);

    render(
      <Treatment
        context={mocks.context}
        name="test_exp"
        loadingComponent={<TestLoadingComponent />}
      >
        <TestTreatmentVariant variant={0}>
          <p>Hello 0</p>
        </TestTreatmentVariant>
      </Treatment>
    );

    await waitFor(() => {
      expect(mocks.context.treatment).not.toHaveBeenCalled();
      expect(mocks.context.experimentConfig).not.toHaveBeenCalled();
      expect(mocks.context.attributes).not.toHaveBeenCalled();
      expect(TestTreatmentVariant).not.toHaveBeenCalled();
      expect(TestLoadingComponent).toHaveBeenCalledTimes(1);
    });
  });

  it("Should render control variant when no loading component is provided", async () => {
    const TestComponent = jest.fn();

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(false);

    const ready = Promise.resolve(true);
    mocks.context.ready.mockReturnValue(ready);

    const attributes = {
      attr1: 15,
      attr2: 50,
    };

    render(
      <Treatment context={mocks.context} name="test_exp">
        <TestComponent variant="0">
          <p>Hello World 0!</p>
        </TestComponent>
        <TreatmentVariant variant="1">
          <p>Hello World 1!</p>
        </TreatmentVariant>
      </Treatment>
    );

    expect(mocks.context.treatment).not.toHaveBeenCalled();
    expect(mocks.context.experimentConfig).not.toHaveBeenCalled();
    expect(mocks.context.attributes).not.toHaveBeenCalled();
    expect(TestComponent).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      TestComponent.mockClear();
    });

    const config = { a: 1, b: 2 };
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.experimentConfig.mockReturnValue(config);

    ready.then(async () => {
      await waitFor(() => {
        expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
        expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
        expect(mocks.context.attributes).toHaveBeenCalledTimes(1);
        expect(mocks.context.attributes).toHaveBeenCalledWith(attributes);
        expect(TestComponent).toHaveBeenCalledTimes(1);
        expect(TestComponent).toHaveBeenCalledWith({
          ready: true,
          failed: false,
          treatment: 1,
          config,
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

      const config = { a: 1, b: 2 };

      mocks.context.isReady.mockReturnValue(true);
      mocks.context.isFailed.mockReturnValue(false);
      mocks.context.treatment.mockReturnValue(variant);
      mocks.context.experimentConfig.mockReturnValue(config);

      render(
        <Treatment
          loadingComponent={<TestLoadingComponent />}
          context={mocks.context}
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

      const config = { a: 1, b: 2 };

      mocks.context.isReady.mockReturnValue(true);
      mocks.context.isFailed.mockReturnValue(false);
      mocks.context.treatment.mockReturnValue(variant);
      mocks.context.experimentConfig.mockReturnValue(config);

      render(
        <Treatment
          loadingComponent={<TestLoadingComponent />}
          context={mocks.context}
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
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.isFailed.mockReturnValue(false);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.experimentConfig.mockReturnValue({});

    render(
      <Treatment context={mocks.context} name="test_exp">
        <TreatmentVariant variant="0"></TreatmentVariant>
        <TreatmentVariant variant="1">
          <TestComponent></TestComponent>
        </TreatmentVariant>
      </Treatment>
    );

    await waitFor(() => {
      expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
      expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
      expect(mocks.context.attributes).not.toHaveBeenCalledWith();
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

    const config = { a: 1, b: 2 };
    const attributes = { attr1: 15, attr2: 50 };

    mocks.context.isReady.mockReturnValue(true);
    mocks.context.isFailed.mockReturnValue(false);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.experimentConfig.mockReturnValue(config);
    mocks.context.ready.mockResolvedValue(true);

    render(
      <TreatmentFunction
        context={mocks.context}
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
      expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
      expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
      expect(mocks.context.attributes).toHaveBeenCalledTimes(1);
      expect(mocks.context.attributes).toHaveBeenCalledWith(attributes);
      expect(TestLoadingComponent).not.toHaveBeenCalled();
      expect(TestComponent1).toHaveBeenCalledTimes(1);
    });
  });

  it("should render loading component when not ready", async () => {
    const TestLoadingComponent = jest.fn();
    const TestComponent = jest.fn();

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(false);

    const ready = Promise.resolve(true);

    mocks.context.ready.mockReturnValue(ready);

    render(
      <TreatmentFunction
        loadingComponent={<TestLoadingComponent />}
        context={mocks.context}
        name="test_exp"
      >
        {({ variant }: TreatmentProps) => variant === 0 && <TestComponent />}
      </TreatmentFunction>
    );

    await waitFor(() => {
      expect(mocks.context.treatment).not.toHaveBeenCalled();
      expect(mocks.context.experimentConfig).not.toHaveBeenCalled();
      expect(mocks.context.attributes).not.toHaveBeenCalled();
      expect(TestComponent).not.toHaveBeenCalled();
      expect(TestLoadingComponent).toHaveBeenCalledTimes(1);
    });

    const config = { a: 1, b: 2 };
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.experimentConfig.mockReturnValue(config);

    ready.then(async () => {
      await waitFor(() => {
        expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
        expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
        expect(TestComponent).toHaveBeenCalledTimes(1);
        expect(TestComponent).toHaveBeenCalledWith({
          ready: true,
          failed: false,
          treatment: 1,
          config,
        });
      });
    });
  });

  it("Should render control variant when no loading component is provided", async () => {
    const TestComponent = jest.fn();
    const TestComponentThatShouldntRender = jest.fn();

    mocks.context.isReady.mockReturnValue(false);
    mocks.context.isFailed.mockReturnValue(false);

    const ready = Promise.resolve(true);
    mocks.context.ready.mockReturnValue(ready);

    const attributes = {
      attr1: 15,
      attr2: 50,
    };

    render(
      <TreatmentFunction context={mocks.context} name="test_exp">
        {({ variant }: TreatmentProps) =>
          variant === 0 ? (
            <TestComponent />
          ) : (
            <TestComponentThatShouldntRender />
          )
        }
      </TreatmentFunction>
    );

    expect(mocks.context.treatment).not.toHaveBeenCalled();
    expect(mocks.context.experimentConfig).not.toHaveBeenCalled();
    expect(mocks.context.attributes).not.toHaveBeenCalled();
    expect(TestComponent).toHaveBeenCalledTimes(1);
    expect(TestComponentThatShouldntRender).not.toHaveBeenCalled();

    await waitFor(() => {
      TestComponent.mockClear();
    });

    const config = { a: 1, b: 2 };
    mocks.context.isReady.mockReturnValue(true);
    mocks.context.treatment.mockReturnValue(1);
    mocks.context.experimentConfig.mockReturnValue(config);

    ready.then(async () => {
      await waitFor(() => {
        expect(mocks.context.treatment).toHaveBeenCalledTimes(1);
        expect(mocks.context.treatment).toHaveBeenCalledWith("test_exp");
        expect(mocks.context.attributes).toHaveBeenCalledTimes(1);
        expect(mocks.context.attributes).toHaveBeenCalledWith(attributes);
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

      const config = { a: 1, b: 2 };

      mocks.context.isReady.mockReturnValue(true);
      mocks.context.isFailed.mockReturnValue(false);
      mocks.context.treatment.mockReturnValue(variant);
      mocks.context.experimentConfig.mockReturnValue(config);

      render(
        <TreatmentFunction
          loadingComponent={<TestLoadingComponent />}
          context={mocks.context}
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
