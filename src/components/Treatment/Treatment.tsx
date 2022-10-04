import React, {
  cloneElement,
  FC,
  ReactElement,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import absmartly from "@absmartly/javascript-sdk";
import { useIsInViewport } from "../../hooks/useIsInViewport";
import { Char } from "../../types";
import { convertLetterToNumber } from "../../utils/convertLetterToNumber";

interface TreatmentProps {
  name: string;
  context: typeof absmartly.Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children?: ReactNode;
  trackOnView?: boolean;
}

interface TreatmentVariantProps {
  variant: number | Char | undefined;
  name?: string;
  context?: typeof absmartly.Context;
  children?: ReactNode;
  trackOnView?: boolean;
}

export const Treatment: FC<TreatmentProps> = ({
  children,
  trackOnView = false,
  loadingComponent,
  attributes,
  name,
  context,
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

  const [loading, setLoading] = useState<boolean>(!context?.isReady());

  // The index of the selected variant in the children array
  const [selectedTreatment, setSelectedTreatment] = useState<
    number | undefined
  >();

  // Making the children prop into an array for selecting a single element later.
  const childrenArray = React.Children.toArray(children);

  // Set variant number and variables in state
  useEffect(() => {
    if (attributes) context.attributes(attributes);

    context
      .ready()
      .then(() => {
        //Turning the variable keys and values into an array of arrays
        const variablesArray = Object.keys(context.variableKeys()).map(
          (key) => [key, context.peekVariableValue(key)]
        );

        // Converting the array of arrays into a regular object
        const variablesObject = variablesArray.reduce(
          (obj, i) => Object.assign(obj, { [i[0]]: i[1] }),
          {}
        );

        // Setting the state
        setVariantAndVariables(
          !trackOnView
            ? {
                variant: context.treatment(name),
                variables: variablesObject,
              }
            : {
                variant: context.peek(name),
                variables: variablesObject,
              }
        );
        setLoading(false);
      })
      .catch((e: Error) => console.error(e));
  }, [context]);

  // Turning the children array into objects and mapping them as variants
  // and indexes
  const childrenInfo = React.Children.map(children, (child, i) => {
    const obj = child?.valueOf() as {
      props: { variant: number | Char };
    };
    return { variant: obj.props.variant, index: i };
  });

  // Return a function with variant number, variables and loading
  if (typeof children === "function") {
    return (
      <TreatmentVariant
        trackOnView={trackOnView}
        context={context}
        name={name}
        variant={variantAndVariables.variant}
      >
        {loading
          ? loadingComponent
            ? loadingComponent
            : children({ variant: 0, variables: variantAndVariables.variables })
          : children({
              variant: variantAndVariables.variant,
              variables: variantAndVariables.variables,
            })}
      </TreatmentVariant>
    );
  }

  // Set index of chosen variant in state
  // Must be done after function check or gives "index is undefined"
  useEffect(() => {
    setSelectedTreatment(
      childrenInfo?.filter(
        (item) =>
          convertLetterToNumber(item.variant) ===
          (variantAndVariables.variant || 0)
      )[0]?.index || 0
    );
  }, [variantAndVariables]);

  // If not a function return only the selected Treatment (Or treatment 0 or loading component)
  if (loading) {
    if (loadingComponent) return loadingComponent as ReactElement;
    return childrenArray[0] as ReactElement;
  }
  return cloneElement(childrenArray[selectedTreatment || 0] as ReactElement, {
    trackOnView,
    context,
    name,
  });
};

export const TreatmentVariant: FC<TreatmentVariantProps> = ({
  children,
  context,
  name,
  trackOnView = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const visible = useIsInViewport(ref);

  useEffect(() => {
    if (trackOnView && visible) {
      context
        .ready()
        .then(() => context.treatment(name))
        .catch((e: Error) => console.error(e));
    }
  }, [trackOnView, visible]);

  return (
    <>
      {React.Children.map(children, (child) => {
        if (child)
          return (
            <div
              ref={ref}
              style={{ margin: 0, padding: 0, boxSizing: "border-box" }}
            >
              {cloneElement(child as ReactElement)}
            </div>
          );
        return null;
      })}
    </>
  );
};
