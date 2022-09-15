import React, { createContext, useContext } from "react";
import { FC, ReactNode } from "react";

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

export const useABSmartly = () => useContext(SDK);
