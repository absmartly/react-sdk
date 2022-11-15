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
import { Char, TreatmentProps as TreatmentFunctionProps } from "../../types";
import { convertLetterToNumber } from "../../utils/convertLetterToNumber";

interface TreatmentProps {
  name: string;
  context: typeof absmartly.Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children?: ReactNode | ((props: TreatmentFunctionProps) => ReactNode);
}

interface TreatmentVariantProps {
  variant: number | Char | undefined;
  name?: string;
  context?: typeof absmartly.Context;
  children?: ReactNode | ((props: TreatmentFunctionProps) => ReactNode);
}

export const Treatment: FC<TreatmentProps> = ({
  children,
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

  const [loading, setLoading] = useState<boolean>(!context.isReady());

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
      .then(async () => {
        //Turning the variable keys and values into an array of arrays
        const variablesArray = Object.keys(context.variableKeys()).map(
          (key) => [key, context.peekVariableValue(key)]
        );

        // Converting the array of arrays into a regular object
        const variablesObject = variablesArray.reduce(
          (obj, i) => Object.assign(obj, { [i[0]]: i[1] }),
          {}
        );

        const treatment = await context.treatment(name);

        // Setting the state
        setVariantAndVariables({
          variant: treatment,
          variables: variablesObject,
        });
        setSelectedTreatment(
          childrenInfo?.filter(
            (item) => convertLetterToNumber(item.variant) === (treatment || 0)
          )[0]?.index || 0
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

  // If not a function return only the selected Treatment (Or treatment 0 or loading component)
  if (loading) {
    if (loadingComponent) return loadingComponent as ReactElement;
    return childrenArray[0] as ReactElement;
  }

  return cloneElement(childrenArray[selectedTreatment || 0] as ReactElement, {
    context,
    name,
  });
};

export const TreatmentVariant: FC<TreatmentVariantProps> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null);

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
