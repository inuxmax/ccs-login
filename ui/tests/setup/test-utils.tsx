/**
 * Test Utilities
 * Custom render with all required providers for testing React components
 */

/* eslint-disable react-refresh/only-export-components */
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { ReactElement, ReactNode } from 'react';
import { PrivacyProvider } from '../../src/contexts/privacy-context';
import { SettingsProvider } from '../../src/pages/settings/context';

/**
 * Create a fresh QueryClient for each test to avoid shared state
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface AllProvidersProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

/**
 * AllProviders wraps all required context providers for testing
 */
export function AllProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <PrivacyProvider>{children}</PrivacyProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * AllProviders with SettingsContext for settings page tests
 */
export function SettingsTestProviders({ children, queryClient }: AllProvidersProps) {
  const client = queryClient ?? createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <BrowserRouter>
        <PrivacyProvider>
          <SettingsProvider>{children}</SettingsProvider>
        </PrivacyProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  withSettingsProvider?: boolean;
}

/**
 * Custom render function that wraps components with all necessary providers
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const {
    queryClient = createTestQueryClient(),
    withSettingsProvider = false,
    ...renderOptions
  } = options;

  const Wrapper = withSettingsProvider ? SettingsTestProviders : AllProviders;

  const result = render(ui, {
    wrapper: ({ children }) => <Wrapper queryClient={queryClient}>{children}</Wrapper>,
    ...renderOptions,
  });

  return {
    ...result,
    queryClient,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render with our custom version
export { customRender as render };
