import { createContext, useContext } from "react";
import { type ABSmartly } from "../types";

export const _SdkContext = createContext<ABSmartly | null>(null);

export const useABSmartly = () => {
  const sdk = useContext(_SdkContext);

  if (!sdk) {
    throw new Error(
      "useABSmartly must be used within an SDKProvider. https://docs.absmartly.com/docs/SDK-Documentation/getting-started#import-and-initialize-the-sdk",
    );
  }

  return sdk;
};
