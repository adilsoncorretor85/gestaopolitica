/**
 * Gerenciador de sincronização offline
 */

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { offlineManager } from './offlineManager';
import { notificationManager } from './notificationManager';
import { structuredLogger } from './structuredLogger';
import { analytics } from './analytics';

interface SyncStatus {
  isSyncing: boolean;
  lastSync: number;
  pendingChanges: number;
  error: string | null;
}

interface SyncResult {
  success: boolean;
  syncedItems: number;
  errors: string[];
  duration: number;
}

class SyncManager {
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSync: 0,
    pendingChanges: 0,
    error: null,
  };

  private syncInterval: NodeJS.Timeout | null = null;
  private listeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.setupAutoSync();
    this.updatePendingChanges();
  }

  // Configurar sincronização automática
  private setupAutoSync() {
    // Sincronizar a cada 5 minutos quando online
    this.syncInterval = setInterval(() => {
      if (navigator.onLine && !this.syncStatus.isSyncing) {
        this.sync();
      }
    }, 5 * 60 * 1000); // 5 minutos

    // Sincronizar quando voltar online
    window.addEventListener('online', () => {
      this.sync();
    });
  }

  // Sincronizar dados
  async sync(): Promise<SyncResult> {
    if (this.syncStatus.isSyncing) {
      return {
        success: false,
        syncedItems: 0,
        errors: ['Sincronização já em andamento'],
        duration: 0,
      };
    }

    const startTime = Date.now();
    this.setSyncStatus({ isSyncing: true, error: null });

    structuredLogger.info('Iniciando sincronização', {
      action: 'sync_start',
      metadata: { pendingChanges: this.syncStatus.pendingChanges },
    });

    try {
      // Sincronizar ações offline primeiro
      await offlineManager.syncOfflineData();

      // Sincronizar dados de cada tabela
      const syncResults = await Promise.allSettled([
        this.syncTable('people'),
        this.syncTable('tags'),
        this.syncTable('leaders'),
      ]);

      const errors: string[] = [];
      let syncedItems = 0;

      syncResults.forEach((result, index) => {
        if (result.status === 'rejected') {
          errors.push(`Erro ao sincronizar tabela ${index}: ${result.reason}`);
        } else if (result.value) {
          syncedItems += result.value;
        }
      });

      const duration = Date.now() - startTime;
      const success = errors.length === 0;

      this.setSyncStatus({
        isSyncing: false,
        lastSync: Date.now(),
        pendingChanges: 0,
        error: errors.length > 0 ? errors.join('; ') : null,
      });

      // Notificar sucesso
      if (success && syncedItems > 0) {
        await notificationManager.notifySyncComplete(syncedItems);
      }

      structuredLogger.info('Sincronização concluída', {
        action: 'sync_complete',
        metadata: {
          success,
          syncedItems,
          errors: errors.length,
          duration,
        },
      });

      analytics.track('sync_completed', {
        success,
        syncedItems,
        errors: errors.length,
        duration,
      });

      return {
        success,
        syncedItems,
        errors,
        duration,
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      this.setSyncStatus({
        isSyncing: false,
        error: errorMessage,
      });

      structuredLogger.error('Erro na sincronização', error as Error, {
        action: 'sync_error',
        metadata: { duration },
      });

      analytics.track('sync_error', {
        error: errorMessage,
        duration,
      });

      return {
        success: false,
        syncedItems: 0,
        errors: [errorMessage],
        duration,
      };
    }
  }

  // Sincronizar tabela específica
  private async syncTable(tableName: string): Promise<number> {
    try {
      // Buscar dados do servidor
      const { data: serverData, error: serverError } = await supabase
        .from(tableName)
        .select('*')
        .order('updated_at', { ascending: false });

      if (serverError) {
        throw serverError;
      }

      // Buscar dados offline
      const offlineData = await offlineManager.loadOfflineData(tableName);

      // Mesclar dados (servidor tem prioridade)
      const mergedData = this.mergeData(serverData || [], offlineData);

      // Salvar dados mesclados offline
      await offlineManager.saveOfflineData(tableName, mergedData);

      return mergedData.length;

    } catch (error) {
      structuredLogger.error(`Erro ao sincronizar tabela ${tableName}`, error as Error, {
        action: 'table_sync_error',
        metadata: { table: tableName },
      });
      throw error;
    }
  }

  // Mesclar dados do servidor e offline
  private mergeData(serverData: any[], offlineData: any[]): any[] {
    const merged = new Map();

    // Adicionar dados do servidor primeiro (prioridade)
    serverData.forEach(item => {
      merged.set(item.id, item);
    });

    // Adicionar dados offline que não existem no servidor
    offlineData.forEach(item => {
      if (!merged.has(item.id)) {
        merged.set(item.id, item);
      }
    });

    return Array.from(merged.values());
  }

  // Atualizar contador de mudanças pendentes
  private updatePendingChanges() {
    const pendingChanges = offlineManager.getQueueSize();
    this.setSyncStatus({ pendingChanges });
  }

  // Definir status de sincronização
  private setSyncStatus(updates: Partial<SyncStatus>) {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.notifyListeners();
  }

  // Notificar listeners
  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.syncStatus);
      } catch (error) {
        console.error('Erro ao notificar listener de sync:', error);
      }
    });
  }

  // Adicionar listener
  addListener(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Obter status atual
  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  // Forçar sincronização
  async forceSync(): Promise<SyncResult> {
    return this.sync();
  }

  // Parar sincronização automática
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  // Iniciar sincronização automática
  startAutoSync() {
    if (!this.syncInterval) {
      this.setupAutoSync();
    }
  }

  // Verificar se há mudanças pendentes
  hasPendingChanges(): boolean {
    return this.syncStatus.pendingChanges > 0;
  }

  // Verificar se está sincronizando
  isSyncing(): boolean {
    return this.syncStatus.isSyncing;
  }

  // Obter última sincronização
  getLastSync(): number {
    return this.syncStatus.lastSync;
  }

  // Limpar dados de sincronização
  async clearSyncData() {
    await offlineManager.clearOfflineData();
    this.setSyncStatus({
      lastSync: 0,
      pendingChanges: 0,
      error: null,
    });
  }
}

// Instância singleton
export const syncManager = new SyncManager();

// Hook para React
export const useSyncManager = () => {
  const [status, setStatus] = useState<SyncStatus>(syncManager.getStatus());

  useEffect(() => {
    const unsubscribe = syncManager.addListener(setStatus);
    return unsubscribe;
  }, []);

  const sync = () => {
    return syncManager.sync();
  };

  const forceSync = () => {
    return syncManager.forceSync();
  };

  const hasPendingChanges = () => {
    return syncManager.hasPendingChanges();
  };

  const isSyncing = () => {
    return syncManager.isSyncing();
  };

  const getLastSync = () => {
    return syncManager.getLastSync();
  };

  const clearSyncData = () => {
    return syncManager.clearSyncData();
  };

  return {
    status,
    sync,
    forceSync,
    hasPendingChanges,
    isSyncing,
    getLastSync,
    clearSyncData,
  };
};
