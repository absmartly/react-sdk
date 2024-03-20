import React, { FC, ReactNode, useEffect, useState } from "react";

import { Context } from "@absmartly/javascript-sdk";
import { Char } from "../../types";
import { convertLetterToNumber } from "../../utils/convertLetterToNumber";
import { useTriggerOnView } from "../../hooks/useTriggerOnView";

interface TreatmentFunctionProps {
  name: string;
  context: Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  triggerOnView?: boolean;
  triggerOnViewOptions?: IntersectionObserverInit;
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
  triggerOnView = false,
  triggerOnViewOptions,
}) => {
  // State for storing the chosen variant, variables and whether this data
  // is loading from the server
  const [variantAndVariables, setVariantAndVariables] = useState<{
    variant: number | undefined;
    variables: Record<string, unknown>;
  }>({
    variant: !loadingComponent ? 0 : undefined,
    variables: {},
  });
  const [loading, setLoading] = useState<boolean>(!context.isReady());

  // Set variant number and variables in state
  useEffect(() => {
    if (attributes) context.attributes(attributes);

    context
      .ready()
      .then(() => {
        // Turning the variable keys and values into an array of arrays
        const variablesArray = Object.keys(context.variableKeys()).map(
          (key) => [key, context.peekVariableValue(key, "")],
        );

        // Converting the array of arrays into a regular object
        const variablesObject = variablesArray.reduce(
          (obj, i) => Object.assign(obj, { [i[0]]: i[1] }),
          {},
        );

        const treatment = triggerOnView
          ? context.peek(name)
          : context.treatment(name);

        // Setting the state
        setVariantAndVariables({
          variant: treatment,
          variables: variablesObject,
        });
        setLoading(false);
      })
      .catch((e: Error) => console.error(e));
  }, [context, attributes]);

  const triggerRef = useTriggerOnView({
    ready: !loading,
    options: triggerOnViewOptions,
    context,
    enabled: triggerOnView,
    name,
  });

  if (loading) {
    return loadingComponent != null ? (
      <>{loadingComponent}</>
    ) : (
      <>{children({ ...variantAndVariables, variant: 0 })}</>
    );
  }

  return (
    <>
      {triggerOnView && <div ref={triggerRef} />}
      {children({
        ...variantAndVariables,
        variant: variantAndVariables.variant ?? 0,
      })}
    </>
  );
};

interface TreatmentProps {
  name: string;
  context: Context;
  triggerOnView?: boolean;
  triggerOnViewOptions?: IntersectionObserverInit;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children?: ReactNode;
}

export const Treatment: FC<TreatmentProps> = ({
  children,
  loadingComponent,
  triggerOnView = false,
  triggerOnViewOptions,
  attributes,
  name,
  context,
}) => {
  const [loading, setLoading] = useState<boolean>(
    context && !context.isReady(),
  );

  // Turning the children into an array of objects and mapping them as variants
  const childrenInfo = React.Children.map(children, (child) => {
    const obj = child?.valueOf() as {
      props: { variant: number | Char };
    };
    return { variant: obj.props.variant };
  });

  // Get the index of the first child with a variant matching the context treatment
  const getSelectedChildIndex = (context: Context) => {
    const treatment = triggerOnView
      ? context.peek(name)
      : context.treatment(name);

    const index = childrenInfo?.findIndex(
      (x) => convertLetterToNumber(x.variant) === (treatment || 0),
    );

    if (index === -1) {
      return 0;
    }

    return index ?? 0;
  };

  // The index of the selected variant in the children array
  const [selectedTreatment, setSelectedTreatment] = useState(
    context?.isReady() ? getSelectedChildIndex(context) : null,
  );

  // Making the children prop into an array for selecting a single element later.
  const childrenArray = React.Children.toArray(children);

  // Set variant number and variables in state
  useEffect(() => {
    if (attributes) context.attributes(attributes);

    context
      .ready()
      .then(() => {
        // Setting the state
        setSelectedTreatment(getSelectedChildIndex(context));
      })
      .then(() => {
        setLoading(false);
      })
      .catch((e: Error) => console.error(e));
  }, [context, attributes]);

  const triggerRef = useTriggerOnView({
    ready: !loading,
    options: triggerOnViewOptions,
    context,
    enabled: triggerOnView,
    name,
  });

  // Return the selected Treatment
  if (loading) {
    if (loadingComponent) return <>{loadingComponent}</>;
    return <>{childrenArray[0]}</>;
  }

  return (
    <>
      {triggerOnView && <div ref={triggerRef} />}
      {childrenArray[selectedTreatment || 0]}
    </>
  );
};

interface TreatmentVariantProps {
  variant: number | Char | undefined;
  children?: ReactNode;
}

export const TreatmentVariant: FC<TreatmentVariantProps> = ({ children }) => {
  return <>{children}</>;
};
