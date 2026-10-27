import React, { FC } from "react";

declare const process: { env: { NODE_ENV?: string } };

export const ErrorAlert: FC<{ name: string; error: Error }> = ({
  name,
  error,
}) => (
  <div
    role="alert"
    style={{
      padding: "10px",
      border: "1px solid red",
      borderRadius: "4px",
      backgroundColor: "#fee",
    }}
  >
    <strong>Failed to load experiment "{name}"</strong>
    {process.env.NODE_ENV === "development" && <p>{error.message}</p>}
  </div>
);
