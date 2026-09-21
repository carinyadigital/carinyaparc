import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/cn';

const alertVariants = cva(
  'rounded-md border px-6 py-[18px] flex flex-col items-stretch border-l-[5px]',
  {
    variants: {
      tone: {
        success: 'bg-eucalypt-50 border-eucalypt-200 border-l-eucalypt-600 text-eucalypt-700',
        destructive:
          'bg-destructive/10 border-destructive/30 border-l-destructive text-destructive',
      },
    },
    defaultVariants: {
      tone: 'success',
    },
  },
);

export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  variant?: 'success' | 'destructive';
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, tone, variant, children, ...props }, ref) => {
    const resolvedTone = tone ?? variant ?? 'success';
    return (
      <div
        ref={ref}
        role="alert"
        className={cn(alertVariants({ tone: resolvedTone }), className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
Alert.displayName = 'Alert';

export { Alert, alertVariants };
