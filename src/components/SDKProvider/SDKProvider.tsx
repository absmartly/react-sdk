import React, {
  ComponentType,
  createContext,
  FC,
  ReactNode,
  useContext,
} from "react";

import absmartly from "@absmartly/javascript-sdk";

import { SDKOptionsType } from "../../types";

interface SDKProviderProps {
  sdkOptions: SDKOptionsType;
  children?: ReactNode;
}

const SDK = createContext<typeof absmartly.SDK | undefined>(undefined);

export const SDKProvider: FC<SDKProviderProps> = ({ sdkOptions, children }) => {
  return (
    <SDK.Provider
      value={new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions })}
    >
      {children}
    </SDK.Provider>
  );
};

interface WithABSmartlyProps {
  sdk: typeof absmartly.SDK;
}

export function withABSmartly<P extends WithABSmartlyProps>(
  Component: ComponentType<P>
) {
  return function WithABSmartly(
    props: Pick<P, Exclude<keyof P, keyof WithABSmartlyProps>>
  ) {
    return (
      <SDK.Consumer>
        {(value) => <Component {...(props as P)} sdk={value} />}
      </SDK.Consumer>
    );
  };
}

export const useABSmartly = () => useContext(SDK);
