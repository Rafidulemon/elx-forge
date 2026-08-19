import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn('input', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn('input resize-none', className)} {...rest} />;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: ReadonlyArray<{ value: string; label: string }>;
}

export function Select({ className, options, ...rest }: SelectProps) {
  return (
    <select className={cn('input cursor-pointer', className)} {...rest}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}