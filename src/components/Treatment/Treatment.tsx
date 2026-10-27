import React, {
  FC,
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

import { Context } from "@absmartly/javascript-sdk";
import { useOptionalABSmartly } from "../../hooks/useABSmartly";
import { useContextReady } from "../../hooks/useContextReady";
import { Char } from "../../types";
import { convertLetterToNumber } from "../../utils/convertLetterToNumber";
import { ErrorAlert } from "./ErrorAlert";

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

  const childrenArray = useMemo(
    () => React.Children.toArray(children),
    [children],
  );

  const childrenInfo = useMemo(
    () =>
      childrenArray.map((child) => {
        if (!React.isValidElement(child)) {
          console.warn(
            `Treatment "${name}": Non-element child detected. Using variant 0.`,
          );
          return { variant: 0 };
        }

        const { variant } = child.props as Partial<TreatmentVariantProps>;
        if (variant === undefined) {
          console.warn(
            `Treatment "${name}": Child missing "variant" prop. Using variant 0.`,
          );
          return { variant: 0 };
        }

        return { variant };
      }),
    [childrenArray, name],
  );

  const getSelectedChildIndex = useCallback(
    (ctx: Context, expose: boolean): number => {
      const treatment = expose ? ctx.treatment(name) : ctx.peek(name);
      const targetVariant = treatment ?? 0;
      if (childrenInfo.length === 0) {
        console.warn(
          `Treatment "${name}": No children available. Defaulting to variant 0.`,
        );
        return 0;
      }

      const index = childrenInfo.findIndex(
        (x) => convertLetterToNumber(x.variant) === targetVariant,
      );

      if (index === -1) {
        console.warn(
          `Treatment "${name}": No child found matching variant ${targetVariant}. Falling back to first child (variant 0).`,
        );
        return 0;
      }

      return index;
    },
    [childrenInfo, name],
  );

  const [selectedTreatment, setSelectedTreatment] = useState(() => {
    if (!ensuredContext?.isReady()) return null;
    // Attributes must be set before the first assignment; peek avoids
    // logging an exposure during render.
    // A finalizing context throws; useContextReady reports that error.
    try {
      if (attributes) ensuredContext.attributes(attributes);
      return getSelectedChildIndex(ensuredContext, false);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (
      ensuredContext?.isReady() &&
      !ensuredContext.isFinalizing?.() &&
      !ensuredContext.isFinalized?.()
    ) {
      setSelectedTreatment(getSelectedChildIndex(ensuredContext, false));
    }
  }, [ensuredContext, getSelectedChildIndex]);

  const handleContextReady = useCallback(() => {
    if (ensuredContext) {
      setSelectedTreatment(getSelectedChildIndex(ensuredContext, true));
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
      `Treatment "${name}": No context available. Either provide a context prop or wrap component in SDKProvider.`,
    );
    return null;
  }

  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    return <ErrorAlert name={name} error={error} />;
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
