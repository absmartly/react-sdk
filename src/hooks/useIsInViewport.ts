import { ForwardedRef, useEffect, useMemo, useState } from "react";

export const useIsInViewport = (ref: ForwardedRef<Element | undefined>) => {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);

  const observer = useMemo(
    () =>
      new IntersectionObserver(([entry]) =>
        setIsIntersecting(entry.isIntersecting)
      ),
    []
  );

  useEffect(() => {
    if (typeof ref === "function") return;
    const el = ref?.current;

    if (el) {
      observer.observe(ref.current!);
    }

    return () => observer.disconnect();
  }, [ref, observer]);

  return isIntersecting;
};
