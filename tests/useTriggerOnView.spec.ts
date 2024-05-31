import { useTriggerOnView } from "../src/hooks/useTriggerOnView";
import "@testing-library/jest-dom";
import absmartly, { Context } from "@absmartly/javascript-sdk";
import { renderHook } from "@testing-library/react";

// @ts-expect-error
global.IntersectionObserver = class IntersectionObserver {
  private entries: any[];
  private readonly callback: any;

  constructor(callback: () => void) {
    this.entries = [];
    this.callback = callback;
  }

  observe(target: Element) {
    this.entries.push({ target, isIntersecting: true });
    this.callback(this.entries, this);
  }

  unobserve(target: Element) {
    this.entries = this.entries.filter((entry) => entry.target !== target);
  }
};

describe("useTriggerOnView", () => {
  let contextMock: Context;
  const name = "test_exp";

  beforeEach(() => {
    contextMock = {
      treatment: jest.fn(),
    } as unknown as Context;
    jest.spyOn(absmartly, "Context").mockImplementation(() => contextMock);
  });

  it("should not call context.treatment if not ready", () => {
    renderHook(() =>
      useTriggerOnView({
        ready: false,
        context: contextMock,
        enabled: true,
        name,
      }),
    );

    expect(contextMock.treatment).not.toHaveBeenCalled();
  });

  it("should not call context.treatment if not enabled", () => {
    renderHook(() =>
      useTriggerOnView({
        ready: true,
        context: contextMock,
        enabled: false,
        name,
      }),
    );

    expect(contextMock.treatment).not.toHaveBeenCalled();
  });

  it("should observe on mount and unobserve on unmount correctly", () => {
    const { result, rerender, unmount } = renderHook(() =>
      useTriggerOnView({
        ready: true,
        context: contextMock,
        enabled: true,
        name,
        options: {},
      }),
    );

    // @ts-expect-error
    result.current.current = document.createElement("div");
    rerender();

    expect(contextMock.treatment).toHaveBeenCalledWith(name);
    expect(contextMock.treatment).toHaveBeenCalledTimes(1);

    unmount();
  });
});
