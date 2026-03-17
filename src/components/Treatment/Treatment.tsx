import React, { FC, ReactNode, useState, useCallback, useMemo, useRef } from "react";

declare const process: { env: { NODE_ENV?: string } };

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
  errorComponent?: ReactNode;
  children?: ReactNode;
}

export const Treatment: FC<TreatmentProps> = ({
  children,
  loadingComponent,
  errorComponent,
  attributes,
  name,
  context,
}) => {
  const absmartly = useOptionalABSmartly();
  const ensuredContext = context ?? absmartly?.context ?? null;

  const childrenInfo = useMemo(
    () =>
      React.Children.map(children, (child) => {
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
      }),
    [children, name]
  );

  const childrenInfoRef = useRef(childrenInfo);
  childrenInfoRef.current = childrenInfo;

  const getSelectedChildIndex = useCallback(
    (ctx: Context): number => {
      const treatment = ctx.treatment(name);
      const targetVariant = treatment ?? 0;
      const info = childrenInfoRef.current;

      if (!info || info.length === 0) {
        console.warn(`Treatment "${name}": No children available. Defaulting to variant 0.`);
        return 0;
      }

      const index = info.findIndex(
        (x) => convertLetterToNumber(x.variant) === targetVariant,
      );

      if (index === -1) {
        console.warn(
          `Treatment "${name}": No child found matching variant ${targetVariant}. Falling back to first child (variant 0).`
        );
        return 0;
      }

      return index;
    },
    [name]
  );

  const [selectedTreatment, setSelectedTreatment] = useState(() =>
    ensuredContext?.isReady() ? getSelectedChildIndex(ensuredContext) : null,
  );

  const childrenArray = React.Children.toArray(children);

  const handleContextReady = useCallback(() => {
    if (ensuredContext) {
      setSelectedTreatment(getSelectedChildIndex(ensuredContext));
    }
  }, [ensuredContext, getSelectedChildIndex]);

  const { loading, error } = useContextReady({
    context: ensuredContext,
    name,
    attributes,
    onReady: handleContextReady,
  });

  if (!ensuredContext) {
    console.warn(
      `Treatment "${name}": No context available. Either provide a context prop or wrap component in SDKProvider.`
    );
    return null;
  }

  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    return (
      <div role="alert" style={{ padding: '10px', border: '1px solid red', borderRadius: '4px', backgroundColor: '#fee' }}>
        <strong>Failed to load experiment "{name}"</strong>
        {process.env.NODE_ENV === "development" && <p>{error.message}</p>}
      </div>
    );
  }

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
