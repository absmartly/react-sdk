import { Context } from "@absmartly/javascript-sdk";
import React, { FC, ReactNode, useState } from "react";

import { useOptionalABSmartly } from "../../hooks/useABSmartly";
import { useContextReady } from "../../hooks/useContextReady";
import { ErrorAlert } from "./ErrorAlert";

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
  expose: boolean,
): { variant: number; variables: Record<string, unknown> } => {
  const variablesObject: Record<string, unknown> = {};
  Object.keys(context.variableKeys()).forEach((key) => {
    variablesObject[key] = context.peekVariableValue(key, "");
  });

  const treatment = expose ? context.treatment(name) : context.peek(name);

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
    variant: number;
    variables: Record<string, unknown>;
  }>(() => {
    if (ensuredContext?.isReady()) {
      // Attributes must be set before the first assignment; peek avoids
      // logging an exposure during render.
      // A finalizing context throws; useContextReady reports that error.
      try {
        if (attributes) ensuredContext.attributes(attributes);
        return getVariantAndVariables(ensuredContext, name, false);
      } catch {
        return { variant: 0, variables: {} };
      }
    }
    return { variant: 0, variables: {} };
  });

  const handleContextReady = () => {
    if (ensuredContext) {
      const result = getVariantAndVariables(ensuredContext, name, true);
      setVariantAndVariables(result);
    }
  };

  const { loading, error } = useContextReady({
    context: ensuredContext,
    name,
    attributes,
    onReady: handleContextReady,
  });

  if (!ensuredContext) {
    console.warn(
      `TreatmentFunction "${name}": No context available. Either provide a context prop or wrap component in SDKProvider.`,
    );
    return null;
  }

  if (error) {
    return <ErrorAlert name={name} error={error} />;
  }

  if (loading) {
    return loadingComponent != null ? (
      <>{loadingComponent}</>
    ) : (
      <>{children({ ...variantAndVariables, variant: 0 })}</>
    );
  }

  return <>{children(variantAndVariables)}</>;
};
