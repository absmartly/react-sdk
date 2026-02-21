import React, { FC, ReactNode, useState, useCallback } from "react";

import { Context } from "@absmartly/javascript-sdk";
import { useOptionalABSmartly } from "../../hooks/useABSmartly";
import { useContextReady } from "../../hooks/useContextReady";
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
  const absmartly = useOptionalABSmartly();
  const ensuredContext = context ?? absmartly?.context;

  if (!ensuredContext) {
    throw new Error(
      `Treatment "${name}": No context available. Either provide a context prop or wrap component in SDKProvider.`
    );
  }

  // Turning the children into an array of objects and mapping them as variants
  const childrenInfo = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      console.warn(
        `Treatment "${name}": Non-element child detected. Using variant 0.`
      );
      return { variant: 0 };
    }

    const variant = (child.props as any).variant;
    if (variant === undefined) {
      console.warn(
        `Treatment "${name}": Child missing "variant" prop. Using variant 0.`
      );
      return { variant: 0 };
    }

    return { variant };
  });

  // Get the index of the first child with a variant matching the context treatment
  const getSelectedChildIndex = (context: Context): number => {
    const treatment = context.treatment(name);
    const targetVariant = treatment ?? 0;

    if (!childrenInfo || childrenInfo.length === 0) {
      console.warn(`Treatment "${name}": No children available. Defaulting to variant 0.`);
      return 0;
    }

    const index = childrenInfo.findIndex(
      (x) => convertLetterToNumber(x.variant) === targetVariant,
    );

    if (index === -1) {
      console.warn(
        `Treatment "${name}": No child found matching variant ${targetVariant}. Falling back to first child (variant 0).`
      );
      return 0;
    }

    return index;
  };

  // The index of the selected variant in the children array
  const [selectedTreatment, setSelectedTreatment] = useState(
    ensuredContext.isReady() ? getSelectedChildIndex(ensuredContext) : null,
  );

  // Making the children prop into an array for selecting a single element later.
  const childrenArray = React.Children.toArray(children);

  // Set variant number when context is ready
  const handleContextReady = useCallback(() => {
    setSelectedTreatment(getSelectedChildIndex(ensuredContext));
  }, [ensuredContext, name]);

  const { loading, error } = useContextReady({
    context: ensuredContext,
    name,
    attributes,
    onReady: handleContextReady,
  });

  // Return error UI if loading failed
  if (error) {
    return (
      <div role="alert" style={{ padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#fee' }}>
        <strong>Failed to load experiment "{name}":</strong>
        <p>{error.message}</p>
      </div>
    );
  }

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
