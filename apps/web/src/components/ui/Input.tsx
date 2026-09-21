import * as React from 'react';

import { cn } from '@/lib/cn';

export interface InputProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  invalid?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, id, ...props }, ref) => {
    const inputId = id ?? props.name;
    const isInvalid = Boolean(invalid);

    return (
      <input
        type={type}
        id={inputId}
        className={cn(
          'block w-full rounded-md bg-card px-4 py-[13px] text-[15px] text-foreground',
          'border-[1.5px] border-input outline-none transition-colors',
          'placeholder:text-muted-foreground',
          'focus:border-eucalypt-600 focus:outline-2 focus:outline-offset-0 focus:outline-eucalypt-600/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isInvalid && 'border-destructive focus:border-destructive focus:outline-destructive/30',
          className,
        )}
        ref={ref}
        aria-invalid={isInvalid}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export { Input };
