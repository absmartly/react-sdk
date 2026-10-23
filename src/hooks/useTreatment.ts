import { useEffect, useState } from "react";
import { useABSmartly } from "./useABSmartly";

export const useTreatment = (name: string, peek = false) => {
  const { context } = useABSmartly();

  const isContextReady = context.isReady();

  const [variant, setVariant] = useState<number | null>(() => {
    if (isContextReady) {
      // peek() avoids queueing an exposure during render; the effect below
      // records it once the component has committed.
      return context.peek(name) ?? 0;
    }
    return null;
  });
  const [loading, setLoading] = useState(!isContextReady);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (isContextReady) {
      try {
        const treatment = peek ? context.peek(name) : context.treatment(name);
        setVariant(treatment ?? 0);
        setError(null);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setError(err);
        console.error(`Failed to get treatment "${name}":`, err);
      }
      setLoading(false);
      return;
    }

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
