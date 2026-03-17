import React, { ComponentType } from "react";
import { ABSmartly } from "../../types";
import { _SdkContext } from "../useABSmartly";

interface WithABSmartlyProps {
  absmartly: ABSmartly;
}

export function withABSmartly<
  P extends WithABSmartlyProps = WithABSmartlyProps,
>(Component: ComponentType<P>) {
  const displayName = Component.displayName || Component.name || "Component";

  const ComponentWithABSmartly = (props: Omit<P, keyof WithABSmartlyProps>) => {
    return (
      <_SdkContext.Consumer>
        {(value) => {
          if (!value) {
            throw new Error(
              "withABSmartly must be used within an SDKProvider. https://docs.absmartly.com/docs/SDK-Documentation/getting-started#import-and-initialize-the-sdk"
            );
          }
          return <Component {...(props as P)} absmartly={value} />;
        }}
      </_SdkContext.Consumer>
    );
  };

  ComponentWithABSmartly.displayName = `withABSmartly(${displayName})`;

  return ComponentWithABSmartly;
}
