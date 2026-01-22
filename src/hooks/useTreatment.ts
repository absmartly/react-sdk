import { useEffect, useState } from "react";
import { useABSmartly } from "./useABSmartly";

export const useTreatment = (name: string, peek = false) => {
  const { context } = useABSmartly();

  // Check if context is already ready (supports SSR)
  const isContextReady = context.isReady();

  const [variant, setVariant] = useState<number | null>(() => {
    if (isContextReady) {
      return peek ? context.peek(name) : context.treatment(name);
    }
    return null;
  });
  const [loading, setLoading] = useState(!isContextReady);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isContextReady) return;

    const fetchTreatment = async () => {
      try {
        await context.ready();
        const treatment = peek ? context.peek(name) : context.treatment(name);
        setVariant(treatment);
      } catch (error) {
        setError(error instanceof Error ? error : new Error(error.toString()));
        console.error("Failed to get variant: ", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTreatment();
  }, [context, name, peek, isContextReady]);

  return { variant, loading, error, context };
};
