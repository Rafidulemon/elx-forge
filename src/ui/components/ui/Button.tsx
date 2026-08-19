import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'subtle' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

const variants: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  subtle: 'btn-subtle',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export function Button({ variant = 'subtle', size = 'md', className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        variants[variant],
        size === 'sm' && 'px-2 py-1 text-[12px]',
        className,
      )}
      {...rest}
    />
  );
}