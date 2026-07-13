import { Box, Text } from "ink";
import { Component, type ReactNode } from "react";

type ErrorBoundaryProps = {
  /**
   * When this value changes the boundary clears its error and retries the
   * children — wired to screen navigation and manual refresh so a user can
   * always recover from a render failure without restarting the app.
   */
  resetKey: string | number;
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | undefined;
};

/**
 * Isolates render failures to the active view. Without this, a single throw
 * during render tears down the whole Ink tree and can leave the terminal in a
 * raw, garbled state. Instead we show a recoverable panel and keep the app's
 * chrome (title, status, footer) alive.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: undefined };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: undefined });
    }
  }

  render() {
    const { error } = this.state;

    if (error) {
      return (
        <Box flexDirection="column">
          <Text color="red" bold>
            This view hit a rendering error.
          </Text>
          <Text dimColor>{error.message}</Text>
          <Text dimColor>Press r to retry, or esc to go back.</Text>
        </Box>
      );
    }

    return this.props.children;
  }
}
