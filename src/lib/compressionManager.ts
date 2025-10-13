/**
 * Gerenciador de compressão de dados
 */

import * as pako from 'pako';
import { structuredLogger } from './structuredLogger';
import { analytics } from './analytics';

interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressedData: Uint8Array;
}

interface DecompressionResult {
  originalData: any;
  decompressedSize: number;
}

class CompressionManager {
  private compressionLevel = 6; // Nível de compressão (0-9)

  // Comprimir dados
  compress(data: any): CompressionResult {
    const startTime = Date.now();
    
    try {
      // Converter para string JSON
      const jsonString = JSON.stringify(data);
      const originalSize = new Blob([jsonString]).size;
      
      // Comprimir usando gzip
      const compressed = pako.gzip(jsonString, { level: this.compressionLevel });
      const compressedSize = compressed.length;
      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        compressedData: compressed,
      };

      const duration = Date.now() - startTime;

      structuredLogger.info('Dados comprimidos', {
        action: 'data_compressed',
        metadata: {
          originalSize,
          compressedSize,
          compressionRatio: compressionRatio.toFixed(2),
          duration,
        },
      });

      analytics.track('data_compressed', {
        originalSize,
        compressedSize,
        compressionRatio: compressionRatio.toFixed(2),
        duration,
      });

      return result;

    } catch (error) {
      structuredLogger.error('Erro ao comprimir dados', error as Error, {
        action: 'compression_error',
      });
      throw error;
    }
  }

  // Descomprimir dados
  decompress(compressedData: Uint8Array): DecompressionResult {
    const startTime = Date.now();
    
    try {
      // Descomprimir usando gzip
      const decompressed = pako.ungzip(compressedData, { to: 'string' });
      const decompressedSize = new Blob([decompressed as any]).size;
      
      // Converter de volta para objeto
      const originalData = JSON.parse(decompressed as unknown as string);

      const result: DecompressionResult = {
        originalData,
        decompressedSize,
      };

      const duration = Date.now() - startTime;

      structuredLogger.info('Dados descomprimidos', {
        action: 'data_decompressed',
        metadata: {
          decompressedSize,
          duration,
        },
      });

      return result;

    } catch (error) {
      structuredLogger.error('Erro ao descomprimir dados', error as Error, {
        action: 'decompression_error',
      });
      throw error;
    }
  }

  // Comprimir string
  compressString(text: string): CompressionResult {
    const startTime = Date.now();
    
    try {
      const originalSize = new Blob([text]).size;
      const compressed = pako.gzip(text, { level: this.compressionLevel });
      const compressedSize = compressed.length;
      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        compressedData: compressed,
      };

      const duration = Date.now() - startTime;

      structuredLogger.info('String comprimida', {
        action: 'string_compressed',
        metadata: {
          originalSize,
          compressedSize,
          compressionRatio: compressionRatio.toFixed(2),
          duration,
        },
      });

      return result;

    } catch (error) {
      structuredLogger.error('Erro ao comprimir string', error as Error, {
        action: 'string_compression_error',
      });
      throw error;
    }
  }

  // Descomprimir string
  decompressString(compressedData: Uint8Array): string {
    const startTime = Date.now();
    
    try {
      const decompressed = pako.ungzip(compressedData, { to: 'string' });
      const duration = Date.now() - startTime;

      structuredLogger.info('String descomprimida', {
        action: 'string_decompressed',
        metadata: { duration },
      });

      return decompressed as unknown as string;

    } catch (error) {
      structuredLogger.error('Erro ao descomprimir string', error as Error, {
        action: 'string_decompression_error',
      });
      throw error;
    }
  }

  // Comprimir dados para localStorage
  compressForStorage(data: any): string {
    try {
      const compressed = this.compress(data);
      
      // Converter para base64 para armazenar no localStorage
      const base64 = this.uint8ArrayToBase64(compressed.compressedData);
      
      // Adicionar metadados
      const storageData = {
        compressed: base64,
        originalSize: compressed.originalSize,
        compressedSize: compressed.compressedSize,
        compressionRatio: compressed.compressionRatio,
        timestamp: Date.now(),
      };

      return JSON.stringify(storageData);

    } catch (error) {
      structuredLogger.error('Erro ao comprimir para storage', error as Error, {
        action: 'storage_compression_error',
      });
      throw error;
    }
  }

  // Descomprimir dados do localStorage
  decompressFromStorage(storageData: string): any {
    try {
      const parsed = JSON.parse(storageData);
      const compressedData = this.base64ToUint8Array(parsed.compressed);
      
      const result = this.decompress(compressedData);
      
      structuredLogger.info('Dados descomprimidos do storage', {
        action: 'storage_decompressed',
        metadata: {
          originalSize: parsed.originalSize,
          compressedSize: parsed.compressedSize,
          compressionRatio: parsed.compressionRatio,
        },
      });

      return result.originalData;

    } catch (error) {
      structuredLogger.error('Erro ao descomprimir do storage', error as Error, {
        action: 'storage_decompression_error',
      });
      throw error;
    }
  }

  // Comprimir arquivo
  async compressFile(file: File): Promise<CompressionResult> {
    const startTime = Date.now();
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const originalSize = file.size;
      const compressed = pako.gzip(uint8Array, { level: this.compressionLevel });
      const compressedSize = compressed.length;
      const compressionRatio = (1 - compressedSize / originalSize) * 100;

      const result: CompressionResult = {
        originalSize,
        compressedSize,
        compressionRatio,
        compressedData: compressed,
      };

      const duration = Date.now() - startTime;

      structuredLogger.info('Arquivo comprimido', {
        action: 'file_compressed',
        metadata: {
          fileName: file.name,
          fileType: file.type,
          originalSize,
          compressedSize,
          compressionRatio: compressionRatio.toFixed(2),
          duration,
        },
      });

      return result;

    } catch (error) {
      structuredLogger.error('Erro ao comprimir arquivo', error as Error, {
        action: 'file_compression_error',
        metadata: { fileName: file.name },
      });
      throw error;
    }
  }

  // Descomprimir arquivo
  async decompressFile(compressedData: Uint8Array, fileName: string): Promise<Blob> {
    const startTime = Date.now();
    
    try {
      const decompressed = pako.ungzip(compressedData);
      const blob = new Blob([decompressed as any]);
      
      const duration = Date.now() - startTime;

      structuredLogger.info('Arquivo descomprimido', {
        action: 'file_decompressed',
        metadata: {
          fileName,
          decompressedSize: blob.size,
          duration,
        },
      });

      return blob;

    } catch (error) {
      structuredLogger.error('Erro ao descomprimir arquivo', error as Error, {
        action: 'file_decompression_error',
        metadata: { fileName },
      });
      throw error;
    }
  }

  // Utilitários
  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < uint8Array.byteLength; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const uint8Array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i);
    }
    return uint8Array;
  }

  // Definir nível de compressão
  setCompressionLevel(level: number): void {
    if (level < 0 || level > 9) {
      throw new Error('Nível de compressão deve estar entre 0 e 9');
    }
    this.compressionLevel = level;
  }

  // Obter nível de compressão atual
  getCompressionLevel(): number {
    return this.compressionLevel;
  }

  // Verificar se a compressão é benéfica
  isCompressionBeneficial(originalSize: number, compressedSize: number): boolean {
    const compressionRatio = (1 - compressedSize / originalSize) * 100;
    return compressionRatio > 10; // Beneficial se reduzir mais de 10%
  }
}

// Instância singleton
export const compressionManager = new CompressionManager();

// Hook para React
export const useCompressionManager = () => {
  const compress = (data: any) => {
    return compressionManager.compress(data);
  };

  const decompress = (compressedData: Uint8Array) => {
    return compressionManager.decompress(compressedData);
  };

  const compressString = (text: string) => {
    return compressionManager.compressString(text);
  };

  const decompressString = (compressedData: Uint8Array) => {
    return compressionManager.decompressString(compressedData);
  };

  const compressForStorage = (data: any) => {
    return compressionManager.compressForStorage(data);
  };

  const decompressFromStorage = (storageData: string) => {
    return compressionManager.decompressFromStorage(storageData);
  };

  const compressFile = (file: File) => {
    return compressionManager.compressFile(file);
  };

  const decompressFile = (compressedData: Uint8Array, fileName: string) => {
    return compressionManager.decompressFile(compressedData, fileName);
  };

  const setCompressionLevel = (level: number) => {
    return compressionManager.setCompressionLevel(level);
  };

  const getCompressionLevel = () => {
    return compressionManager.getCompressionLevel();
  };

  const isCompressionBeneficial = (originalSize: number, compressedSize: number) => {
    return compressionManager.isCompressionBeneficial(originalSize, compressedSize);
  };

  return {
    compress,
    decompress,
    compressString,
    decompressString,
    compressForStorage,
    decompressFromStorage,
    compressFile,
    decompressFile,
    setCompressionLevel,
    getCompressionLevel,
    isCompressionBeneficial,
  };
};


