import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import ErrorBoundary from './ErrorBoundary';

// Test component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('catches errors and displays error UI', () => {
    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Fehler aufgetreten')).toBeInTheDocument();
    expect(screen.getByText(/unerwarteter fehler/i)).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('shows "Zur Startseite" button', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /startseite/i })).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('shows "Erneut versuchen" button', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole('button', { name: /erneut versuchen/i })).toBeInTheDocument();

    consoleError.mockRestore();
  });

  it('renders AlertTriangle icon when error occurs', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { container } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check for SVG icon (lucide-react icons are SVG elements)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
