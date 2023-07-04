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
import { Char } from "../../types";
import { convertLetterToNumber } from "../../utils/convertLetterToNumber";

interface TreatmentProps {
  name: string;
  context: typeof absmartly.Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children?: ReactNode;
}

interface TreatmentFunctionProps {
  name: string;
  context: typeof absmartly.Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children(variantAndVariables: {
    variant: number;
    variables: Record<string, any>;
  }): ReactNode | ReactNode;
}

interface TreatmentVariantProps {
  variant: number | Char | undefined;
  name?: string;
  context?: typeof absmartly.Context;
  children?: ReactNode;
}

export const TreatmentFunction: FC<TreatmentFunctionProps> = ({
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
  const [loading, setLoading] = useState<boolean>(
    context && !context.isReady()
  );

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

        const treatment = context.treatment(name);

        // Setting the state
        setVariantAndVariables({
          variant: treatment,
          variables: variablesObject,
        });
        setLoading(false);
      })
      .catch((e: Error) => console.error(e));
  }, [context]);

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
            variant: variantAndVariables.variant || 0,
            variables: variantAndVariables.variables,
          })}
    </TreatmentVariant>
  );
};

export const Treatment: FC<TreatmentProps> = ({
  children,
  loadingComponent,
  attributes,
  name,
  context,
}) => {
  const [loading, setLoading] = useState<boolean>(
    context && !context.isReady()
  );

  // Turning the children array into objects and mapping them as variants
  // and indexes
  const childrenInfo = React.Children.map(children, (child, i) => {
    const obj = child?.valueOf() as {
      props: { variant: number | Char };
    };
    return { variant: obj.props.variant, index: i };
  });

  // Get the index of the first child with a variant matching the context treatment
  const getSelectedChildIndex = (context: typeof absmartly.Context) => {
    const treatment = context.treatment(name);
    return childrenInfo?.filter(
      (item) => convertLetterToNumber(item.variant) === (treatment || 0)
    )[0]?.index;
  };

  // The index of the selected variant in the children array
  const [selectedTreatment, setSelectedTreatment] = useState<
    number | undefined
  >(() => (context?.isReady() ? getSelectedChildIndex(context) : undefined));

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
  }, [context]);

  // Return the selected Treatment (Or treatment 0 or loading component)
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
