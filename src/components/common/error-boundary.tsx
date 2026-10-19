import { Component, type ErrorInfo, type ReactNode } from "react";
import { UnexpectedErrorCard } from "./unexpected-error";

/**
 * Last line of defence for the interface.
 *
 * A runtime error in one screen should never leave a customer or the counter
 * staring at a blank page: they get a plain explanation and a way to carry on.
 * The technical detail goes to the console for diagnosis.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Lab a Day: unexpected error in the interface", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <UnexpectedErrorCard />;
  }
}
