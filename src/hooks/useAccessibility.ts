import { useEffect, useCallback, useRef, useState } from 'react';

interface AccessibilityOptions {
  announceChanges?: boolean;
  focusManagement?: boolean;
  keyboardNavigation?: boolean;
}

export function useAccessibility(options: AccessibilityOptions = {}) {
  const {
    announceChanges = true,
    focusManagement = true,
    keyboardNavigation = true
  } = options;

  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announceChanges) return;

    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [announceChanges]);

  const focusElement = useCallback((element: HTMLElement | null) => {
    if (!focusManagement || !element) return;

    element.focus();
  }, [focusManagement]);

  const trapFocus = useCallback((container: HTMLElement) => {
    if (!focusManagement) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, [focusManagement]);

  const handleKeyboardNavigation = useCallback((callback: (key: string) => void) => {
    if (!keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const { key } = e;
      
      // Handle common navigation keys
      if (['Enter', 'Space', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
        e.preventDefault();
        callback(key);
      }
    };

    return handleKeyDown;
  }, [keyboardNavigation]);

  return {
    announceToScreenReader,
    focusElement,
    trapFocus,
    handleKeyboardNavigation
  };
}

// Hook específico para gerenciar foco em modais
export function useModalFocus() {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const openModal = useCallback(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    
    if (modalRef.current) {
      const focusableElement = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      
      focusableElement?.focus();
    }
  }, []);

  const closeModal = useCallback(() => {
    if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, []);

  return {
    modalRef,
    openModal,
    closeModal
  };
}

// Hook para navegação por teclado em listas
export function useKeyboardListNavigation<T>(
  items: T[],
  onSelect: (item: T, index: number) => void,
  options: { loop?: boolean } = {}
) {
  const { loop = true } = options;
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev + 1;
          return next >= items.length ? (loop ? 0 : prev) : next;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = prev - 1;
          return next < 0 ? (loop ? items.length - 1 : prev) : next;
        });
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          onSelect(items[focusedIndex], focusedIndex);
        }
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
    }
  }, [items, focusedIndex, onSelect, loop]);

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown
  };
}