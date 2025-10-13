import React from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeIn, loadingPulse } from '@/lib/animations';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  text = 'Carregando...',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <motion.div 
      className={`flex flex-col items-center justify-center p-8 ${className}`} 
      role="status" 
      aria-label={text}
      {...fadeIn}
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <Loader2 className={`${sizeClasses[size]} text-blue-600 mb-2`} />
      </motion.div>
      {text && (
        <motion.p 
          className="text-sm text-gray-600 dark:text-gray-400"
          {...loadingPulse}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );
};

export default LoadingSpinner;
