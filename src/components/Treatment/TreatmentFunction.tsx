import { Context } from "@absmartly/javascript-sdk";
import React, { FC, ReactNode, useEffect, useState } from "react";
import { useABSmartly } from "../../hooks/useABSmartly";

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
  attributes?: Record<string, unknown>,
): { variant: number; variables: Record<string, unknown> } => {
  if (attributes) context.attributes(attributes);

  const variablesArray = Object.keys(context.variableKeys()).map((key) => [
    key,
    context.peekVariableValue(key, ""),
  ]);

  const variablesObject = variablesArray.reduce(
    (obj, i) => Object.assign(obj, { [i[0]]: i[1] }),
    {},
  );

  const treatment = context.treatment(name);

  return {
    variant: treatment,
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
  const ensuredContext = context ?? useABSmartly().context;

  // Check if context is already ready (supports SSR)
  const isContextReady = ensuredContext.isReady();

  // State for storing the chosen variant, variables and whether this data
  // is loading from the server. If context is ready, initialize with real values (SSR support).
  const [variantAndVariables, setVariantAndVariables] = useState<{
    variant: number | undefined;
    variables: Record<string, unknown>;
  }>(() => {
    if (isContextReady) {
      return getVariantAndVariables(ensuredContext, name, attributes);
    }
    return {
      variant: !loadingComponent ? 0 : undefined,
      variables: {},
    };
  });

  const [loading, setLoading] = useState<boolean>(!isContextReady);

  // Set variant number and variables in state (for client-side updates)
  useEffect(() => {
    if (isContextReady) return;

    ensuredContext
      .ready()
      .then(() => {
        const result = getVariantAndVariables(ensuredContext, name, attributes);
        setVariantAndVariables(result);
        setLoading(false);
      })
      .catch((e: Error) => console.error(e));
  }, [context, attributes, isContextReady]);

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
