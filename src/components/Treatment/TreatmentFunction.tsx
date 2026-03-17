import { Context } from "@absmartly/javascript-sdk";
import React, { FC, ReactNode, useState, useCallback } from "react";

declare const process: { env: { NODE_ENV?: string } };

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
  const ensuredContext = context ?? absmartly?.context ?? null;

  const [variantAndVariables, setVariantAndVariables] = useState<{
    variant: number | undefined;
    variables: Record<string, unknown>;
  }>(() => {
    if (ensuredContext?.isReady()) {
      return getVariantAndVariables(ensuredContext, name);
    }
    return {
      variant: !loadingComponent ? 0 : undefined,
      variables: {},
    };
  });

  const handleContextReady = useCallback(() => {
    if (ensuredContext) {
      const result = getVariantAndVariables(ensuredContext, name);
      setVariantAndVariables(result);
    }
  }, [ensuredContext, name]);

  const { loading, error } = useContextReady({
    context: ensuredContext,
    name,
    attributes,
    onReady: handleContextReady,
  });

  if (!ensuredContext) {
    console.warn(
      `TreatmentFunction "${name}": No context available. Either provide a context prop or wrap component in SDKProvider.`
    );
    return null;
  }

  if (error) {
    return (
      <div role="alert" style={{ padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#fee' }}>
        <strong>Failed to load experiment "{name}"</strong>
        {process.env.NODE_ENV === "development" && <p>{error.message}</p>}
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
