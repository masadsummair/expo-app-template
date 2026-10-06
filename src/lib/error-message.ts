import { ApiError, type ApiProblem } from '@/services/api/api-problem';

const GENERIC = 'Something went wrong. Please try again.';

/** User-facing copy for each problem kind. The `never` check fails the build if a kind is added without copy. */
export function problemMessage(problem: ApiProblem): string {
  switch (problem.kind) {
    case 'timeout':
      return 'The request took too long. Please try again.';
    case 'cannot-connect':
      return 'Cannot reach the server. Check your connection and try again.';
    case 'server':
      return 'The server ran into a problem. Please try again in a moment.';
    case 'unauthorized':
      return 'Your session has expired. Please sign in again.';
    case 'forbidden':
      return "You don't have permission to do that.";
    case 'not-found':
      return "We couldn't find what you were looking for.";
    case 'rejected':
      return "The request couldn't be completed. Please check your input and try again.";
    case 'bad-data':
      return 'We received an unexpected response. Please try again.';
    case 'unknown':
      return GENERIC;
    default: {
      const unreachable: never = problem;
      return unreachable;
    }
  }
}

/** Safe-to-show message for any thrown value. Never leaks raw error text (it may hold URLs or tokens). */
export function errorMessage(e: unknown): string {
  return e instanceof ApiError ? problemMessage(e.problem) : GENERIC;
}
