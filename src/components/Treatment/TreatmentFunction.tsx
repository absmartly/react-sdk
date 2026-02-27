import { Context } from "@absmartly/javascript-sdk";
import React, { FC, ReactNode, useState, useCallback } from "react";
import { useOptionalABSmartly } from "../../hooks/useABSmartly";
import { useContextReady } from "../../hooks/useContextReady";

interface TreatmentFunctionProps {
  name: string;
  context?: Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children(variantAndVariables: {
    variant: number;
    variables: Record<string, any>;
  }): ReactNode;
}

const getVariantAndVariables = (
  context: Context,
  name: string,
): { variant: number; variables: Record<string, unknown> } => {
  const variablesObject = Object.fromEntries(
    Object.keys(context.variableKeys()).map((key) => [
      key,
      context.peekVariableValue(key, ""),
    ])
  );

  const treatment = context.treatment(name);

  return {
    variant: treatment ?? 0,
    variables: variablesObject,
  };
};

export const TreatmentFunction: FC<TreatmentFunctionProps> = ({
  children,
  loadingComponent,
  attributes,
  name,
  context,
}) => {
  const absmartly = useOptionalABSmartly();
  const ensuredContext = context ?? absmartly?.context;

  if (!ensuredContext) {
    throw new Error(
      `TreatmentFunction "${name}": No context available. Either provide a context prop or wrap component in SDKProvider.`
    );
  }

  // Check if context is already ready (supports SSR)
  const isContextReady = ensuredContext.isReady();

  // State for storing the chosen variant, variables and whether this data
  // is loading from the server. If context is ready, initialize with real values (SSR support).
  const [variantAndVariables, setVariantAndVariables] = useState<{
    variant: number | undefined;
    variables: Record<string, unknown>;
  }>(() => {
    if (isContextReady) {
      return getVariantAndVariables(ensuredContext, name);
    }
    return {
      variant: !loadingComponent ? 0 : undefined,
      variables: {},
    };
  });

  // Set variant number and variables when context is ready
  const handleContextReady = useCallback(() => {
    const result = getVariantAndVariables(ensuredContext, name);
    setVariantAndVariables(result);
  }, [ensuredContext, name, attributes]);

  const { loading, error } = useContextReady({
    context: ensuredContext,
    name,
    attributes,
    onReady: handleContextReady,
  });

  if (error) {
    return (
      <div role="alert" style={{ padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#fee' }}>
        <strong>Failed to load experiment "{name}":</strong>
        <p>{error.message}</p>
      </div>
    );
  }

  if (loading) {
    return loadingComponent != null ? (
      <>{loadingComponent}</>
    ) : (
      <>{children({ ...variantAndVariables, variant: 0 })}</>
    );
  }

  return (
    <>
      {children({
        ...variantAndVariables,
        variant: variantAndVariables.variant ?? 0,
      })}
    </>
  );
};
