import React, { FC, ReactNode, useEffect, useState } from "react";

import absmartly from "@absmartly/javascript-sdk";

interface TreatmentProps {
  name: string;
  context: typeof absmartly.Context;
  loading?: ReactNode;
  attributes?: Record<string, unknown>;
  children?: ReactNode;
}

export const Treatment: FC<TreatmentProps> = ({
  name,
  context,
  children,
  loading,
}) => {
  const variants = React.Children.toArray(children);

  const [treatment, setTreatment] = useState<ReactNode | number | undefined>(
    loading ? loading : 0
  );

  useEffect(() => {
    context
      .ready()
      .then(() => setTreatment(context.treatment(name)))
      .catch((e: Error) => console.error(e));
  }, [context]);

  return (
    <>
      {treatment === undefined
        ? variants[0]
        : typeof treatment === "number"
        ? variants[treatment]
        : treatment}
    </>
  );
};
