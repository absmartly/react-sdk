import React, {
  FC,
  ReactNode,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";

import absmartly from "@absmartly/javascript-sdk";

import { _SdkContext } from "../../hooks/useABSmartly";
import {
  ABSmartly,
  ABSmartlyContext,
  ContextOptionsType,
  ContextRequestType,
  SDKOptionsType,
} from "../../types";

const isReactNative =
  typeof navigator !== "undefined" && navigator.product === "ReactNative";

const SDK_AGENT = isReactNative
  ? "absmartly-react-native-sdk"
  : "absmartly-react-sdk";

type SDKProviderNoContext = {
  sdkOptions: SDKOptionsType;
  context?: never;
  contextOptions: { units: Record<string, any> };
  children?: ReactNode;
};

type SDKProviderWithContext = {
  context: ABSmartlyContext;
  children?: ReactNode;
  sdkOptions?: never;
  contextOptions?: never;
};

type SDKProviderProps = SDKProviderNoContext | SDKProviderWithContext;

export const SDKProvider: FC<SDKProviderProps> = ({
  sdkOptions,
  contextOptions,
  context,
  children,
}) => {
  const [sdk] = useState(() => {
    if (context) {
      return (context as any)["_sdk"];
    }
    return new absmartly.SDK({
      agent: SDK_AGENT as any,
      retries: 5,
      timeout: 3000,
      ...sdkOptions,
    });
  });

  const [providedContext, setProvidedContext] = useState(
    context ? context : sdk.createContext(contextOptions),
  );

  const [contextError, setContextError] = useState<Error | null>(null);

  const contextRef = useRef(providedContext);
  contextRef.current = providedContext;

  const resetContext = useCallback(
    async (params: ContextRequestType, contextOptions?: ContextOptionsType) => {
      try {
        const ctx = contextRef.current;
        await ctx.ready();

        const contextData = ctx.data();
        const oldContextOptions = (ctx as any)._opts;

        const combinedContextOptions = {
          ...oldContextOptions,
          ...contextOptions,
        };

        const newContext = sdk.createContextWith(
          params,
          contextData,
          combinedContextOptions,
        );

        await ctx.finalize();

        setProvidedContext(newContext);
        setContextError(null);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setContextError(err);
        console.error("Failed to reset ABSmartly context:", err);
        throw err;
      }
    },
    [sdk],
  );

  const value = useMemo<ABSmartly>(
    () => ({
      sdk,
      context: providedContext,
      resetContext,
      contextError,
    }),
    [sdk, providedContext, resetContext, contextError],
  );

  return <_SdkContext.Provider value={value}>{children}</_SdkContext.Provider>;
};
