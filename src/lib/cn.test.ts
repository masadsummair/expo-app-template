import { cn } from './cn';

describe('cn', () => {
  it('keeps the text-body font size next to a text colour', () => {
    expect(cn('text-body text-foreground')).toBe('text-body text-foreground');
    expect(cn('text-body', 'text-muted')).toBe('text-body text-muted');
  });

  it('still lets a later size or colour win', () => {
    expect(cn('text-body', 'text-xs')).toBe('text-xs');
    expect(cn('text-foreground', 'text-muted')).toBe('text-muted');
  });
});
