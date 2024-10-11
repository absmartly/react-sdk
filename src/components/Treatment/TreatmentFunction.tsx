import { Context } from "@absmartly/javascript-sdk";
import { useEffect, useState, type FC, type ReactNode } from "react";
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

export const TreatmentFunction: FC<TreatmentFunctionProps> = ({
  children,
  loadingComponent,
  attributes,
  name,
  context,
}) => {
  const ensuredContext = context ?? useABSmartly().context;

  // State for storing the chosen variant, variables and whether this data
  // is loading from the server
  const [variantAndVariables, setVariantAndVariables] = useState<{
    variant: number | undefined;
    variables: Record<string, unknown>;
  }>({
    variant: !loadingComponent ? 0 : undefined,
    variables: {},
  });

  const [loading, setLoading] = useState<boolean>(!ensuredContext?.isReady());

  const getLoadingComponent = () => {
    return loadingComponent != null ? (
      <>{loadingComponent}</>
    ) : (
      <>{children({ ...variantAndVariables, variant: 0 })}</>
    );
  };

  if (ensuredContext === null) {
    return getLoadingComponent();
  }

  // Set variant number and variables in state
  useEffect(() => {
    if (attributes) ensuredContext.attributes(attributes);

    ensuredContext
      .ready()
      .then(() => {
        // Turning the variable keys and values into an array of arrays
        const variablesArray = Object.keys(ensuredContext.variableKeys()).map(
          (key) => [key, ensuredContext.peekVariableValue(key, "")],
        );

        // Converting the array of arrays into a regular object
        const variablesObject = variablesArray.reduce((obj, i) => {
          const key = i[0];

          return Object.assign(obj, { [key != null ? key : ""]: i[1] });
        }, {});

        const treatment = ensuredContext.treatment(name);

        // Setting the state
        setVariantAndVariables({
          variant: treatment,
          variables: variablesObject,
        });
        setLoading(false);
      })
      .catch((e: Error) => console.error(e));
  }, [context, attributes]);

  if (loading) {
    return getLoadingComponent();
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
