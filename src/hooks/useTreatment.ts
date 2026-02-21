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

    let cancelled = false;

    const fetchTreatment = async () => {
      try {
        await context.ready();
        if (!cancelled) {
          const treatment = peek ? context.peek(name) : context.treatment(name);
          setVariant(treatment ?? 0);
          setError(null);
        }
      } catch (error) {
        if (!cancelled) {
          const err = error instanceof Error ? error : new Error(String(error));
          setError(err);
          console.error(`Failed to get treatment "${name}":`, err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchTreatment();

    return () => {
      cancelled = true;
    };
  }, [context, name, peek, isContextReady]);

  return { variant, loading, error, context };
};
