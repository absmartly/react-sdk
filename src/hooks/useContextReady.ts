import { useEffect, useState, useRef } from "react";
import { Context } from "@absmartly/javascript-sdk";

interface UseContextReadyOptions {
  context: Context | null;
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
  const isContextReady = context?.isReady() ?? false;
  const [loading, setLoading] = useState<boolean>(!isContextReady);
  const [error, setError] = useState<Error | null>(null);

  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const attributesRef = useRef(attributes);
  attributesRef.current = attributes;

  useEffect(() => {
    if (!context) return;

    let cancelled = false;

    if (attributesRef.current) {
      context.attributes(attributesRef.current);
    }

    if (isContextReady) {
      if (onReadyRef.current) {
        onReadyRef.current(context);
      }
      setLoading(false);
      return;
    }

    context
      .ready()
      .then(() => {
        if (!cancelled) {
          if (attributesRef.current) {
            context.attributes(attributesRef.current);
          }
          if (onReadyRef.current) {
            onReadyRef.current(context);
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
  }, [context, name, isContextReady]);

  return { loading, error };
};
