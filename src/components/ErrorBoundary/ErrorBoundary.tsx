import React, { Component, ReactNode, ErrorInfo } from "react";

declare const process: { env: { NODE_ENV?: string } };

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      errorInfo,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    console.error("ABSmartly Error Boundary caught an error:", error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === "function") {
          return this.props.fallback(this.state.error, this.state.errorInfo!);
        }
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          style={{
            padding: "20px",
            border: "2px solid #d32f2f",
            borderRadius: "4px",
            backgroundColor: "#ffebee",
            margin: "10px 0",
          }}
        >
          <h2 style={{ margin: "0 0 10px 0", color: "#d32f2f" }}>
            ABSmartly Error
          </h2>
          {process.env.NODE_ENV === "development" ? (
            <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>
              {this.state.error.message}
            </p>
          ) : (
            <p style={{ margin: "0 0 10px 0" }}>Something went wrong.</p>
          )}
          {process.env.NODE_ENV === "development" && this.state.errorInfo && (
            <details style={{ marginTop: "10px" }}>
              <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
                Stack Trace
              </summary>
              <pre
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  overflow: "auto",
                  fontSize: "12px",
                }}
              >
                {this.state.error.stack}
                {"\n\n"}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
