import { ForwardedRef, useEffect, useState } from "react";

export const useIsInViewport = (ref: ForwardedRef<Element | undefined>) => {
  const [isIntersecting, setIsIntersecting] = useState<boolean>(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) =>
      setIsIntersecting(entry.isIntersecting)
    );

    if (typeof ref === "function") return;
    const el = ref?.current;

    if (el) {
      observer.observe(ref.current!);
    }

    return () => observer.disconnect();
  }, []);

  return isIntersecting;
};
