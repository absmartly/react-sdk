import React, { FC, ReactElement, ReactNode, useEffect, useState } from "react";

import absmartly from "@absmartly/javascript-sdk";
import { Char } from "../../types";
import { convertLetterToNumber } from "../../utils/convertLetterToNumber";

interface TreatmentProps {
  name: string;
  context: typeof absmartly.Context;
  loading?: ReactNode;
  attributes?: Record<string, unknown>;
  children?: ReactNode;
}

interface TreatmentVariantProps {
  variant: number | Char;
  children?: ReactNode;
}

export const Treatment: FC<TreatmentProps> = ({
  children,
  loading,
  name,
  context,
}) => {
  const [variantVariablesAndLoading, setVariantVariablesAndLoading] = useState({
    variant: 0,
    variables: {},
    loading: true,
  });

  const [selectedTreatment, setSelectedTreatment] = useState<
    number | undefined
  >();

  const childrenArray = React.Children.toArray(children);

  // Set variant number in state
  useEffect(() => {
    context
      .ready()
      .then(() => {
        const variablesArray = Object.keys(context.variableKeys()).map(
          (key) => [key, context.variableValue(key)]
        );
        const variablesObject = variablesArray.reduce(
          (obj, i) => Object.assign(obj, { [i[0]]: i[1] }),
          {}
        );
        setVariantVariablesAndLoading({
          variant: context.treatment(name),
          variables: variablesObject,
          loading: false,
        });
      })
      .catch((e: Error) => console.error(e));
  }, []);

  // Set index of chosen variant in state
  useEffect(() => {
    setSelectedTreatment(
      childrenInfo?.filter(
        (item) =>
          convertLetterToNumber(item.variant) ===
          variantVariablesAndLoading.variant
      )[0].index
    );
  }, [variantVariablesAndLoading]);

  // Return function with variant number and variables
  if (typeof children === "function") {
    return children({
      ...variantVariablesAndLoading,
    });
  }

  const childrenInfo = React.Children.map(children, (child, i) => {
    const obj = child?.valueOf() as {
      props: { variant: number | Char };
    };
    return { variant: obj.props.variant, index: i };
  });

  // If not a function return only the selected Treatment (Or treatment 0 or loading component)
  return loading && variantVariablesAndLoading.loading
    ? loading
    : (childrenArray[selectedTreatment || 0] as ReactElement);
};

export const TreatmentVariant: FC<TreatmentVariantProps> = ({ children }) => {
  return <>{children}</>;
};
