import * as React from 'react';

import { cn } from '@/lib/cn';

const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        className={cn(
          'block w-full rounded-md bg-card px-4 py-[13px] text-[15px] text-foreground',
          'border-[1.5px] border-input outline-none transition-colors',
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
Select.displayName = 'Select';

export { Select };
