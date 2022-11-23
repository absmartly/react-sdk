import React, {
  ComponentType,
  createContext,
  FC,
  ReactNode,
  useContext,
} from "react";

import absmartly from "@absmartly/javascript-sdk";

import { ABSmartly, ABSmartlyContext, SDKOptionsType } from "../../types";

type SDKProviderNoContext = {
  sdkOptions: SDKOptionsType;
  context?: never;
  contextOptions: Record<string, any>;
  children?: ReactNode;
};

type SDKProviderWithContext = {
  context: ABSmartlyContext;
  children?: ReactNode;
  sdkOptions?: never;
  contextOptions?: never;
};

type SDKProviderProps = SDKProviderNoContext | SDKProviderWithContext;

const SDK = createContext<ABSmartly>({ sdk: undefined, context: undefined });

export const SDKProvider: FC<SDKProviderProps> = ({
  sdkOptions,
  contextOptions,
  context,
  children,
}) => {
  const sdk = context
    ? context._sdk
    : new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions });

  const providedContext = context ? context : sdk.createContext(contextOptions);

  const value: ABSmartly = {
    sdk,
    context: providedContext,
  };

  return <SDK.Provider value={value}>{children}</SDK.Provider>;
};

interface WithABSmartlyProps {
  absmartly: ABSmartly;
}

export function withABSmartly<
  P extends WithABSmartlyProps = WithABSmartlyProps
>(Component: ComponentType<P>) {
  const displayName = Component.displayName || Component.name || "Component";

  const ComponentWithABSmartly = (props: Omit<P, keyof WithABSmartlyProps>) => {
    return (
      <SDK.Consumer>
        {(value) => <Component {...(props as P)} absmartly={value} />}
      </SDK.Consumer>
    );
  };

  ComponentWithABSmartly.displayName = `withABSmartly(${displayName})`;

  return ComponentWithABSmartly;
}

export const useABSmartly = () => useContext(SDK);
