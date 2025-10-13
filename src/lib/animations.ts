/**
 * Sistema de animações para o projeto
 */

// Variantes de animação para Framer Motion
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeOut" as const }
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeOut" as const }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.2, ease: "easeOut" as const }
};

// Animações para listas
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const staggerItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" as const }
};

// Animações para modais
export const modalAnimation = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.9, y: 20 },
  transition: { duration: 0.2, ease: "easeOut" as const }
};

export const backdropAnimation = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 }
};

// Animações para botões
export const buttonHover = {
  scale: 1.05,
  transition: { duration: 0.2, ease: "easeOut" as const }
};

export const buttonTap = {
  scale: 0.95,
  transition: { duration: 0.1 }
};

// Animações para cards
export const cardHover = {
  y: -5,
  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
  transition: { duration: 0.3, ease: "easeOut" as const }
};

// Animações para loading
export const loadingPulse = {
  animate: {
    opacity: [0.5, 1, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut" as const
    }
  }
};

// Animações para notificações
export const notificationSlide = {
  initial: { opacity: 0, x: 300 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 300 },
  transition: { duration: 0.3, ease: "easeOut" as const }
};

// Utilitários para animações
export const getAnimationDelay = (index: number, baseDelay: number = 0.1) => {
  return baseDelay * index;
};

export const getStaggerDelay = (index: number, stagger: number = 0.1) => {
  return index * stagger;
};

