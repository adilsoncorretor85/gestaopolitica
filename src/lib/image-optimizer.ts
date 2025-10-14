/**
 * Sistema de otimização de imagens e assets
 * Implementa lazy loading, compressão e cache de imagens
 */

interface ImageOptimizerOptions {
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  width?: number;
  height?: number;
  lazy?: boolean;
  placeholder?: string;
}

class ImageOptimizer {
  private imageCache = new Map<string, string>();
  private loadingImages = new Set<string>();

  /**
   * Otimiza uma imagem
   */
  async optimizeImage(
    src: string, 
    options: ImageOptimizerOptions = {}
  ): Promise<string> {
    const {
      quality = 0.8,
      format = 'webp',
      width,
      height,
      lazy = true
    } = options;

    // Verifica cache primeiro
    const cacheKey = `${src}_${quality}_${format}_${width}_${height}`;
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey)!;
    }

    try {
      // Se é uma URL externa, retorna como está (para CDNs otimizados)
      if (src.startsWith('http')) {
        return src;
      }

      // Para imagens locais, aplica otimizações
      const optimizedSrc = await this.processLocalImage(src, options);
      
      // Armazena no cache
      this.imageCache.set(cacheKey, optimizedSrc);
      
      return optimizedSrc;
    } catch (error) {
      console.warn('Erro ao otimizar imagem:', error);
      return src; // Fallback para imagem original
    }
  }

  /**
   * Processa imagem local
   */
  private async processLocalImage(
    src: string, 
    options: ImageOptimizerOptions
  ): Promise<string> {
    // Em um ambiente real, isso seria implementado com Canvas API
    // ou enviado para um serviço de otimização de imagens
    return src;
  }

  /**
   * Cria um placeholder para lazy loading
   */
  createPlaceholder(width: number, height: number, color = '#f3f4f6'): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, width, height);
    }
    
    return canvas.toDataURL();
  }

  /**
   * Verifica se o navegador suporta WebP
   */
  supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Lazy loading de imagens
   */
  async lazyLoadImage(
    img: HTMLImageElement,
    src: string,
    options: ImageOptimizerOptions = {}
  ): Promise<void> {
    if (this.loadingImages.has(src)) {
      return;
    }

    this.loadingImages.add(src);

    try {
      const optimizedSrc = await this.optimizeImage(src, options);
      
      // Cria placeholder se especificado
      if (options.placeholder) {
        img.src = options.placeholder;
      }

      // Carrega imagem otimizada
      img.src = optimizedSrc;
      
      // Remove placeholder quando imagem carrega
      img.onload = () => {
        img.classList.add('loaded');
      };
    } catch (error) {
      console.error('Erro no lazy loading:', error);
    } finally {
      this.loadingImages.delete(src);
    }
  }
}

// Instância global
export const imageOptimizer = new ImageOptimizer();

// Hook para React
import { useEffect, useRef, useState } from 'react';

/**
 * Hook para lazy loading de imagens em React
 */
export function useLazyImage(
  src: string,
  options: ImageOptimizerOptions = {}
) {
  const [imageSrc, setImageSrc] = useState<string>(options.placeholder || '');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  const loadImage = async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const optimizedSrc = await imageOptimizer.optimizeImage(src, options);
      setImageSrc(optimizedSrc);
    } catch (error) {
      setHasError(true);
      setImageSrc(src); // Fallback para imagem original
    } finally {
      setIsLoading(false);
    }
  };

  return {
    ref: imgRef,
    src: imageSrc,
    isLoading,
    hasError
  };
}

/**
 * Componente de imagem otimizada
 */
import React from 'react';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  options?: ImageOptimizerOptions;
  fallback?: string;
}

export function OptimizedImage({ 
  src, 
  options = {}, 
  fallback,
  className = '',
  ...props 
}: OptimizedImageProps) {
  const { ref, src: imageSrc, isLoading, hasError } = useLazyImage(src, options);

  return (
    <img
      ref={ref}
      src={hasError ? (fallback || src) : imageSrc}
      className={`${className} ${isLoading ? 'opacity-50' : 'opacity-100'} transition-opacity duration-300`}
      {...props}
    />
  );
}

/**
 * Sistema de cache para assets
 */
export const assetCache = {
  // Cache para ícones SVG
  svgIcons: new Map<string, string>(),

  // Cache para fontes
  fonts: new Map<string, string>(),

  // Cache para outros assets
  assets: new Map<string, string>(),

  // Carrega SVG
  async loadSVG(url: string): Promise<string> {
    if (this.svgIcons.has(url)) {
      return this.svgIcons.get(url)!;
    }

    try {
      const response = await fetch(url);
      const svg = await response.text();
      this.svgIcons.set(url, svg);
      return svg;
    } catch (error) {
      console.error('Erro ao carregar SVG:', error);
      return '';
    }
  },

  // Carrega fonte
  async loadFont(fontFamily: string, url: string): Promise<void> {
    if (this.fonts.has(fontFamily)) {
      return;
    }

    try {
      const font = new FontFace(fontFamily, `url(${url})`);
      await font.load();
      document.fonts.add(font);
      this.fonts.set(fontFamily, url);
    } catch (error) {
      console.error('Erro ao carregar fonte:', error);
    }
  },

  // Precarrega assets críticos
  async preloadCriticalAssets(): Promise<void> {
    const criticalAssets = [
      // Adicione aqui os assets críticos do seu projeto
    ];

    await Promise.all(
      criticalAssets.map(async (asset) => {
        try {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.href = asset.url;
          link.as = asset.type;
          if (asset.crossOrigin) {
            link.crossOrigin = asset.crossOrigin;
          }
          document.head.appendChild(link);
        } catch (error) {
          console.warn('Erro ao precarregar asset:', error);
        }
      })
    );
  }
};

export default imageOptimizer;
