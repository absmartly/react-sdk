import React, {
  ComponentType,
  createContext,
  FC,
  ReactNode,
  useContext,
} from "react";

import absmartly from "@absmartly/javascript-sdk";

import { ABSmartly, SDKOptionsType } from "../../types";

type ContextOptionsProps = {
  sdkOptions: SDKOptionsType;
  contextOptions: { units: Record<string, any> };
  contextData?: never;
  children?: ReactNode;
};

type ContextDataProps = {
  sdkOptions: SDKOptionsType;
  contextOptions?: never;
  contextData: { experiments: Record<string, any>[] };
  children?: ReactNode;
};

type SDKProviderProps = ContextOptionsProps | ContextDataProps;

const SDK = createContext<ABSmartly>({ sdk: undefined, context: undefined });

export const SDKProvider: FC<SDKProviderProps> = ({
  sdkOptions,
  contextData,
  contextOptions,
  children,
}) => {
  const sdk = new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions });

  const context = contextData
    ? sdk.createContextWith(contextData)
    : sdk.createContext(contextOptions);

  const value: ABSmartly = {
    sdk,
    context,
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
