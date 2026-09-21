import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill font-semibold transition-colors focus-visible:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-eucalypt-600 text-primary-foreground hover:bg-eucalypt-700 shadow-none',
        bracken: 'bg-bracken-500 text-fleece hover:bg-bracken-600 shadow-none',
        secondary: 'bg-wattle text-kangaroo-900 hover:bg-kangaroo-400 shadow-none',
        outline:
          'border-[1.5px] border-eucalypt-600 bg-transparent text-eucalypt-600 hover:bg-eucalypt-50',
        ghost:
          'bg-transparent text-bracken-500 hover:bg-bracken-50 border-[1.5px] border-transparent',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
      size: {
        md: 'px-7 py-3.5 text-[15px] leading-none',
        sm: 'px-5 py-2.5 text-[13px] leading-none',
        lg: 'px-[34px] py-4 text-[17px] leading-none',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isLoading || disabled}
        {...props}
      >
        {isLoading && <Loader2 className="animate-spin" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
