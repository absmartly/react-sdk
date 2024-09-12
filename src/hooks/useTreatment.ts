import { useEffect, useState } from "react";
import { useABSmartly } from "./useABSmartly";

export const useTreatment = (name: string, peek = false) => {
  const { context } = useABSmartly();

  const isReady = context != null && context.isReady();

  const [variant, setVariant] = useState<number | null>(
    isReady ? (peek ? context.peek(name) : context.treatment(name)) : null,
  );
  const [loading, setLoading] = useState(context == null || !context.isReady());
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (variant != null) return;

    const fetchTreatment = async () => {
      if (context == null) return;
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
  }, [context, name, peek]);

  return { variant, loading, error, context };
};
