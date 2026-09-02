import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import "@/landing/landing.css";
import LandingPageContent from "@/landing/App";
import Loader from "@/landing/components/Loader";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Landing page error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "red", padding: "20px", background: "black" }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LandingPage() {
  return (
    <div className="landing-root">
      <ErrorBoundary>
        <Loader>
          <LandingPageContent />
        </Loader>
      </ErrorBoundary>
    </div>
  );
}
