import { toast as sonner } from 'sonner-native';

import { announce } from '@/lib/a11y';
import { errorMessage } from '@/lib/error-message';

export type ToastAction = { label: string; onPress: () => void };

type ToastOptions = { description?: string; action?: ToastAction };

/*
 * Thin facade over sonner-native so the vendor can be swapped by editing this file only.
 * Requires a mounted <Toaster /> (see src/app/_layout.tsx).
 */
function options({ description, action }: ToastOptions = {}) {
  return {
    description,
    // Toasts with an action stay until the user acts or dismisses them.
    ...(action && { action: { label: action.label, onClick: action.onPress }, duration: Infinity }),
  };
}

// sonner-native puts an aria-live region on each toast, which TalkBack reads (Android) but VoiceOver
// ignores: announce on iOS only, so Android doesn't hear every toast twice.
function spoken(message: string, opts?: ToastOptions) {
  announce(opts?.description ? `${message}. ${opts.description}` : message);
}

export const toast = {
  success: (message: string, opts?: ToastOptions) => {
    sonner.success(message, options(opts));
    spoken(message, opts);
  },
  error: (message: string, opts?: ToastOptions) => {
    sonner.error(message, options(opts));
    spoken(message, opts);
  },
  info: (message: string, opts?: ToastOptions) => {
    sonner.info(message, options(opts));
    spoken(message, opts);
  },
};

/** Toast a user-friendly message for any thrown value (ApiError-aware). */
export function toastError(e: unknown): void {
  toast.error(errorMessage(e));
}
