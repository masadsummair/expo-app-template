import { useState } from 'react';
import { View, type ViewProps } from 'react-native';

import { cn } from '@/lib/cn';

import { Image } from './image';
import { Text } from './text';

const sizes = {
  sm: { box: 'size-8', text: 'text-xs' },
  md: { box: 'size-12', text: 'text-base' },
  lg: { box: 'size-16', text: 'text-xl' },
} as const;

export type AvatarProps = Omit<ViewProps, 'children'> & {
  /** Used for the accessibility label and the initials fallback. */
  name: string;
  uri?: string | null;
  size?: keyof typeof sizes;
};

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, uri, size = 'md', className, ...props }: AvatarProps) {
  // Remember which uri failed so a new uri gets a fresh attempt without an effect.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showImage = Boolean(uri) && failedUri !== uri;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={name}
      className={cn(
        'items-center justify-center overflow-hidden rounded-full bg-surface',
        sizes[size].box,
        className,
      )}
      {...props}
    >
      {showImage && uri ? (
        <Image
          source={{ uri }}
          contentFit="cover"
          className="size-full"
          onError={() => setFailedUri(uri)}
        />
      ) : (
        <Text className={cn('font-semibold text-muted', sizes[size].text)}>
          {getInitials(name)}
        </Text>
      )}
    </View>
  );
}
