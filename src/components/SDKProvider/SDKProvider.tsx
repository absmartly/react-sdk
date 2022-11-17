import React, {
  ComponentType,
  createContext,
  FC,
  ReactNode,
  useContext,
} from "react";

import absmartly from "@absmartly/javascript-sdk";

import { ABSmartly, SDKOptionsType } from "../../types";

interface SDKProviderProps {
  sdkOptions: SDKOptionsType;
  contextOptions?: { units: Record<string, any> };
  contextData?: Record<string, any>[];
  children?: ReactNode;
}

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

export function withABSmartly<P extends WithABSmartlyProps>(
  Component: ComponentType<P>
) {
  return function WithABSmartly(
    props: Pick<P, Exclude<keyof P, keyof WithABSmartlyProps>>
  ) {
    return (
      <SDK.Consumer>
        {(value) => <Component {...(props as P)} absmartly={value} />}
      </SDK.Consumer>
    );
  };
}

export const useABSmartly = () => useContext(SDK);
