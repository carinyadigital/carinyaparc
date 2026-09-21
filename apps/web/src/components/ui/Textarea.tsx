import * as React from 'react';

import { cn } from '@/lib/cn';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'block w-full min-h-[80px] resize-y rounded-md bg-card px-4 py-[13px] text-[15px] text-foreground',
          'border-[1.5px] border-input outline-none transition-colors',
          'placeholder:text-muted-foreground',
          'focus:border-eucalypt-600 focus:outline-2 focus:outline-offset-0 focus:outline-eucalypt-600/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

export { Textarea };
