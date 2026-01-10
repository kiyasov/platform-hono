/**
 * Test helper types and utilities
 */

import { HonoRequest } from 'hono';
import { Context } from 'hono';

/**
 * Mock request for testing
 */
export type MockRequest = {
  header: (name: string) => string | undefined;
};

/**
 * Mock context for testing
 */
export type MockContext = {
  req: {
    parseBody: () => Promise<Record<string, unknown>>;
    header: (name: string) => string | undefined;
  };
};

/**
 * Create a mock Hono request
 */
export function createMockRequest(
  overrides?: Partial<MockRequest>,
): MockRequest {
  return {
    header: (name: string) => {
      if (name === 'content-type') return 'multipart/form-data';
      return undefined;
    },
    ...overrides,
  };
}

/**
 * Create a mock Hono context
 */
export function createMockContext(
  overrides?: Partial<MockContext>,
): MockContext {
  return {
    req: {
      parseBody: async () => ({}),
      header: (name: string) => {
        if (name === 'content-type') return 'multipart/form-data';
        return undefined;
      },
    },
    ...overrides,
  };
}

/**
 * Cast mock request to HonoRequest
 */
export function asHonoRequest(mock: MockRequest): HonoRequest {
  return mock as unknown as HonoRequest;
}

/**
 * Cast mock context to Context
 */
export function asContext(mock: MockContext): Context {
  return mock as unknown as Context;
}
