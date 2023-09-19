import React, {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useRef,
} from "react";

import absmartly from "@absmartly/javascript-sdk";

import { ABSmartly, ABSmartlyContext, ContextOptionsType } from "../../types";
import { SDKOptions } from "@absmartly/javascript-sdk/types/sdk";
import { ClientOptions } from "@absmartly/javascript-sdk/types/client";
import { ContextParams } from "@absmartly/javascript-sdk/types/context";

interface SDKProviderNoContext extends PropsWithChildren {
  sdkOptions: SDKOptions & ClientOptions;
  context?: never;
  contextOptions: ContextParams;
}

interface SDKProviderWithContext extends PropsWithChildren {
  context: ABSmartlyContext;
  sdkOptions?: never;
  contextOptions?: never;
}

type SDKProviderProps = SDKProviderNoContext | SDKProviderWithContext;

const SDK = createContext<ABSmartly>({
  sdk: undefined as unknown as InstanceType<typeof absmartly.SDK>,
  context: undefined as unknown as InstanceType<typeof absmartly.Context>,
  resetContext: async () => {},
});

export const ABSmartlyProvider: FC<SDKProviderProps> = ({
  sdkOptions,
  contextOptions,
  context,
  children,
}) => {
  const sdk = context
    ? (context["_sdk"] as InstanceType<typeof absmartly.SDK>)
    : new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions });

  const providedContext = useRef(
    context ? context : sdk.createContext(contextOptions)
  );

  const resetContext = async (
    params: ContextParams,
    contextOptions: ContextOptionsType
  ) => {
    try {
      await providedContext.current.ready();

      const contextData = providedContext.current.data();
      const oldContextOptions = providedContext.current["_opts"];

      const combinedContextOptions = {
        ...oldContextOptions,
        ...contextOptions,
      };

      await providedContext.current.finalize();

      providedContext.current = sdk.createContextWith(
        params,
        contextData,
        combinedContextOptions
      );
    } catch (error) {
      console.error(error);
    }
  };

  const value: ABSmartly = {
    sdk,
    context: providedContext.current,
    resetContext,
  };

  return <SDK.Provider value={value}>{children}</SDK.Provider>;
};

interface WithABSmartlyProps {
  absmartly: ABSmartly;
}

export function withABSmartly<
  P extends WithABSmartlyProps = WithABSmartlyProps
>(Component: FC<P>) {
  const displayName = Component.displayName || Component.name || "Component";

  const ComponentWithABSmartly = (props: Omit<P, keyof WithABSmartlyProps>) => {
    return (
      <SDK.Consumer>
        {(value: ABSmartly) => (
          <Component {...(props as P)} absmartly={value} />
        )}
      </SDK.Consumer>
    );
  };

  ComponentWithABSmartly.displayName = `withABSmartly(${displayName})`;

  return ComponentWithABSmartly;
}

export const useABSmartly = () => useContext(SDK);
