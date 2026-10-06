import { ApiError, type ApiProblem } from '@/services/api/api-problem';

import { errorMessage, problemMessage } from './error-message';

// Typed as Record<kind, ...> so adding an ApiProblem kind fails typecheck here until it is covered.
const samples: { [K in ApiProblem['kind']]: Extract<ApiProblem, { kind: K }> } = {
  timeout: { kind: 'timeout', temporary: true },
  'cannot-connect': { kind: 'cannot-connect', temporary: true },
  server: { kind: 'server', status: 503 },
  unauthorized: { kind: 'unauthorized' },
  forbidden: { kind: 'forbidden' },
  'not-found': { kind: 'not-found' },
  rejected: { kind: 'rejected', status: 422 },
  'bad-data': { kind: 'bad-data', message: 'secret internals' },
  unknown: { kind: 'unknown', temporary: true },
};

describe('problemMessage', () => {
  it.each(Object.values(samples))('returns friendly copy for $kind', (problem) => {
    const message = problemMessage(problem);
    expect(message.length).toBeGreaterThan(10);
    expect(message).not.toMatch(/undefined|\[object/);
  });

  it('gives each kind distinct copy except the generic unknown', () => {
    const messages = Object.values(samples).map(problemMessage);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it('does not leak bad-data internals', () => {
    expect(problemMessage(samples['bad-data'])).not.toContain('secret internals');
  });
});

describe('errorMessage', () => {
  it('uses the problem message for ApiError', () => {
    expect(errorMessage(new ApiError({ kind: 'forbidden' }))).toBe(
      problemMessage({ kind: 'forbidden' }),
    );
  });

  it('falls back to a generic message for anything else', () => {
    const generic = problemMessage({ kind: 'unknown', temporary: true });
    expect(errorMessage(new Error('boom'))).toBe(generic);
    expect(errorMessage('x')).toBe(generic);
    expect(errorMessage(undefined)).toBe(generic);
  });
});
