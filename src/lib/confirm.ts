import { Alert } from 'react-native';

type ConfirmOptions = {
  title: string;
  message?: string;
  /** The verb the button performs: "Delete", "Discard", "Sign out". Required: never a bare "OK". */
  confirmLabel: string;
  cancelLabel?: string;
  /** Styles the confirm button as destructive (red on iOS). */
  destructive?: boolean;
};

/** Native confirm dialog. Resolves true on confirm, false on cancel or dismiss (Android back/tap-outside). */
export function confirm({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
        {
          text: confirmLabel,
          style: destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}
