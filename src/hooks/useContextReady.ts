import { useEffect, useState } from "react";
import { Context } from "@absmartly/javascript-sdk";

interface UseContextReadyOptions {
  context: Context;
  name: string;
  attributes?: Record<string, unknown>;
  onReady?: (context: Context) => void;
}

interface UseContextReadyResult {
  loading: boolean;
  error: Error | null;
}

export const useContextReady = ({
  context,
  name,
  attributes,
  onReady,
}: UseContextReadyOptions): UseContextReadyResult => {
  const isContextReady = context.isReady();
  const [loading, setLoading] = useState<boolean>(!isContextReady);
  const [error, setError] = useState<Error | null>(null);

  const [initiallyReady] = useState(isContextReady);

  useEffect(() => {
    let cancelled = false;

    if (attributes) {
      context.attributes(attributes);
    }

    if (isContextReady) {
      if (!initiallyReady && onReady) {
        onReady(context);
      }
      return;
    }

    context
      .ready()
      .then(() => {
        if (!cancelled) {
          if (onReady) {
            onReady(context);
          }
          setLoading(false);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          const err = e instanceof Error ? e : new Error(String(e));
          setError(err);
          setLoading(false);
          console.error(`Failed to load treatment "${name}":`, err);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [context, attributes, name, isContextReady, onReady]);

  return { loading, error };
};
