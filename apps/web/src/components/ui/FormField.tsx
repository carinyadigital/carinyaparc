import * as React from 'react';

import { cn } from '@/lib/cn';

export interface FormFieldProps {
  name: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  ({ name, label, description, error, required, children, className }, ref) => {
    return (
      <div ref={ref} className={cn('space-y-2', className)}>
        <label htmlFor={name} className="block text-[13.5px] font-semibold text-foreground">
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        {children}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);
FormField.displayName = 'FormField';

export { FormField };
