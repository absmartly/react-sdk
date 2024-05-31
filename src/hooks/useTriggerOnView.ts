require("../polyfills/intersectionObserver.js");

import { Context } from "@absmartly/javascript-sdk";
import { useEffect, useRef } from "react";

interface UseTriggerOnViewProps {
  ready: boolean;
  context: Context;
  enabled: boolean;
  options?: IntersectionObserverInit;
  name: string;
}

export const useTriggerOnView = ({
  ready,
  context,
  enabled,
  options,
  name,
}: UseTriggerOnViewProps) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready || !enabled) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) context.treatment(name);
    }, options);

    if (triggerRef.current != null && enabled) {
      observer.observe(triggerRef.current);
    }

    return () => {
      if (triggerRef.current != null && enabled)
        observer.unobserve(triggerRef.current);
    };
  }, [triggerRef, enabled, ready, options]);

  return triggerRef;
};
