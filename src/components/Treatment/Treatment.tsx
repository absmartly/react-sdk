import React, { FC, ReactNode, useEffect, useState } from "react";

import { Context } from "@absmartly/javascript-sdk";
import { useABSmartly } from "../../hooks/useABSmartly";
import { Char } from "../../types";
import { convertLetterToNumber } from "../../utils/convertLetterToNumber";

interface TreatmentProps {
  name: string;
  context?: Context;
  attributes?: Record<string, unknown>;
  loadingComponent?: ReactNode;
  children?: ReactNode;
}

export const Treatment: FC<TreatmentProps> = ({
  children,
  loadingComponent,
  attributes,
  name,
  context,
}) => {
  const ensuredContext = context ?? useABSmartly().context;

  const [loading, setLoading] = useState<boolean>(
    ensuredContext && !ensuredContext.isReady(),
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
    const treatment = context.treatment(name);

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
    if (attributes) ensuredContext.attributes(attributes);

    ensuredContext
      .ready()
      .then(() => {
        // Setting the state
        setSelectedTreatment(getSelectedChildIndex(ensuredContext));
      })
      .then(() => {
        setLoading(false);
      })
      .catch((e: Error) => console.error(e));
  }, [context, attributes]);

  // Return the selected Treatment
  if (loading) {
    if (loadingComponent) return <>{loadingComponent}</>;
    return <>{childrenArray[0]}</>;
  }

  return <>{childrenArray[selectedTreatment || 0]}</>;
};

interface TreatmentVariantProps {
  variant: number | Char | undefined;
  children?: ReactNode;
}

export const TreatmentVariant: FC<TreatmentVariantProps> = ({ children }) => {
  return <>{children}</>;
};
