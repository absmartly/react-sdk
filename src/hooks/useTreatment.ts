import { useEffect, useState } from "react";
import { useABSmartly } from "../components/SDKProvider";

export const useTreatment = (name: string, peek = false) => {
  const { context } = useABSmartly();

  const [variant, setVariant] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
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
  }, [context, name, peek]);

  return { variant, loading, error, context };
};
