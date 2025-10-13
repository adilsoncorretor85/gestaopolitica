import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
  fullScreen?: boolean;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12'
};

export default function LoadingSpinner({ 
  size = 'md', 
  className, 
  text,
  fullScreen = false 
}: LoadingSpinnerProps) {
  const spinner = (
    <div className={cn(
      "flex items-center justify-center",
      fullScreen && "min-h-screen",
      className
    )}>
      <div className="flex flex-col items-center space-y-3">
        <Loader2 className={cn(
          "animate-spin text-blue-600",
          sizeClasses[size]
        )} />
        {text && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {text}
          </p>
        )}
      </div>
    </div>
  );

  return spinner;
}

// Componente específico para botões
export function ButtonSpinner({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  return (
    <Loader2 className={cn(
      "animate-spin",
      size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
    )} />
  );
}

// Componente para loading inline
export function InlineSpinner({ text }: { text?: string }) {
  return (
    <div className="flex items-center space-x-2">
      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      {text && (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {text}
        </span>
      )}
    </div>
  );
}

