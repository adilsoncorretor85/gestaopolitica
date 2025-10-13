/**
 * Gerenciador de cache offline
 */

import { supabase } from './supabaseClient';
import { structuredLogger } from './structuredLogger';

interface OfflineAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface OfflineData {
  people: any[];
  tags: any[];
  leaders: any[];
  lastSync: number;
}

class OfflineManager {
  private dbName = 'GestaoPoliticaOffline';
  private version = 1;
  private db: IDBDatabase | null = null;
  private actionQueue: OfflineAction[] = [];
  private isOnline = navigator.onLine;
  private syncInProgress = false;

  constructor() {
    this.setupEventListeners();
    this.initDatabase();
  }

  private setupEventListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      structuredLogger.info('Conexão restaurada', {
        action: 'connection_restored',
      });
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      structuredLogger.info('Conexão perdida', {
        action: 'connection_lost',
      });
    });
  }

  private async initDatabase() {
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error('Falha ao abrir IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.loadActionQueue();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Store para dados offline
        if (!db.objectStoreNames.contains('offlineData')) {
          const offlineStore = db.createObjectStore('offlineData', { keyPath: 'table' });
          offlineStore.createIndex('lastSync', 'lastSync', { unique: false });
        }

        // Store para fila de ações
        if (!db.objectStoreNames.contains('actionQueue')) {
          const actionStore = db.createObjectStore('actionQueue', { keyPath: 'id' });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
          actionStore.createIndex('type', 'type', { unique: false });
        }
      };
    });
  }

  private async loadActionQueue() {
    if (!this.db) return;

    const transaction = this.db.transaction(['actionQueue'], 'readonly');
    const store = transaction.objectStore('actionQueue');
    const request = store.getAll();

    request.onsuccess = () => {
      this.actionQueue = request.result || [];
      structuredLogger.info('Fila de ações carregada', {
        action: 'action_queue_loaded',
        metadata: { count: this.actionQueue.length },
      });
    };
  }

  // Salvar dados offline
  async saveOfflineData(table: string, data: any[]) {
    if (!this.db) return;

    const offlineData: OfflineData = {
      people: table === 'people' ? data : [],
      tags: table === 'tags' ? data : [],
      leaders: table === 'leaders' ? data : [],
      lastSync: Date.now(),
    };

    const transaction = this.db.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');
    
    // Buscar dados existentes
    const getRequest = store.get('offlineData');
    
    getRequest.onsuccess = () => {
      const existingData = getRequest.result || { people: [], tags: [], leaders: [], lastSync: 0 };
      
      // Mesclar dados
      const mergedData = {
        ...existingData,
        [table]: data,
        lastSync: Date.now(),
      };

      store.put(mergedData);
    };
  }

  // Carregar dados offline
  async loadOfflineData(table: string): Promise<any[]> {
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['offlineData'], 'readonly');
      const store = transaction.objectStore('offlineData');
      const request = store.get('offlineData');

      request.onsuccess = () => {
        const data = request.result;
        if (data && data[table]) {
          resolve(data[table]);
        } else {
          resolve([]);
        }
      };

      request.onerror = () => {
        reject(new Error('Falha ao carregar dados offline'));
      };
    });
  }

  // Adicionar ação à fila
  async queueAction(type: OfflineAction['type'], table: string, data: any) {
    if (this.isOnline) {
      // Se estiver online, tentar executar imediatamente
      try {
        await this.executeAction(type, table, data);
        return;
      } catch (error) {
        // Se falhar, adicionar à fila
        structuredLogger.warn('Ação falhou online, adicionando à fila', {
          action: 'action_failed_online',
          metadata: { type, table, error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }
    }

    const action: OfflineAction = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      table,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.actionQueue.push(action);
    await this.saveActionToQueue(action);

    structuredLogger.info('Ação adicionada à fila offline', {
      action: 'action_queued',
      metadata: { type, table, queueSize: this.actionQueue.length },
    });
  }

  private async saveActionToQueue(action: OfflineAction) {
    if (!this.db) return;

    const transaction = this.db.transaction(['actionQueue'], 'readwrite');
    const store = transaction.objectStore('actionQueue');
    store.put(action);
  }

  // Executar ação
  private async executeAction(type: OfflineAction['type'], table: string, data: any) {
    switch (type) {
      case 'CREATE':
        const { data: createData, error: createError } = await supabase
          .from(table)
          .insert(data)
          .select();
        
        if (createError) throw createError;
        return createData;

      case 'UPDATE':
        const { data: updateData, error: updateError } = await supabase
          .from(table)
          .update(data)
          .eq('id', data.id)
          .select();
        
        if (updateError) throw updateError;
        return updateData;

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .eq('id', data.id);
        
        if (deleteError) throw deleteError;
        return null;
    }
  }

  // Sincronizar dados offline
  async syncOfflineData() {
    if (!this.isOnline || this.syncInProgress || this.actionQueue.length === 0) {
      return;
    }

    this.syncInProgress = true;
    structuredLogger.info('Iniciando sincronização offline', {
      action: 'offline_sync_start',
      metadata: { queueSize: this.actionQueue.length },
    });

    const actionsToProcess = [...this.actionQueue];
    const successfulActions: string[] = [];
    const failedActions: OfflineAction[] = [];

    for (const action of actionsToProcess) {
      try {
        await this.executeAction(action.type, action.table, action.data);
        successfulActions.push(action.id);
        
        // Remover da fila
        await this.removeActionFromQueue(action.id);
        
      } catch (error) {
        action.retryCount++;
        
        if (action.retryCount >= 3) {
          // Remover após 3 tentativas
          await this.removeActionFromQueue(action.id);
          structuredLogger.error('Ação removida após 3 tentativas', {
            action: 'action_removed_max_retries',
            metadata: { actionId: action.id, type: action.type, table: action.table },
          } as any);
        } else {
          failedActions.push(action);
        }
      }
    }

    // Atualizar fila local
    this.actionQueue = failedActions;

    this.syncInProgress = false;

    structuredLogger.info('Sincronização offline concluída', {
      action: 'offline_sync_complete',
      metadata: {
        successful: successfulActions.length,
        failed: failedActions.length,
        remaining: this.actionQueue.length,
      },
    });
  }

  private async removeActionFromQueue(actionId: string) {
    if (!this.db) return;

    const transaction = this.db.transaction(['actionQueue'], 'readwrite');
    const store = transaction.objectStore('actionQueue');
    store.delete(actionId);
  }

  // Verificar se está offline
  isOffline(): boolean {
    return !this.isOnline;
  }

  // Obter tamanho da fila
  getQueueSize(): number {
    return this.actionQueue.length;
  }

  // Limpar dados offline
  async clearOfflineData() {
    if (!this.db) return;

    const transaction = this.db.transaction(['offlineData', 'actionQueue'], 'readwrite');
    
    transaction.objectStore('offlineData').clear();
    transaction.objectStore('actionQueue').clear();
    
    this.actionQueue = [];
  }
}

// Instância singleton
export const offlineManager = new OfflineManager();

// Hook para React
export const useOfflineManager = () => {
  const queueAction = (type: OfflineAction['type'], table: string, data: any) => {
    return offlineManager.queueAction(type, table, data);
  };

  const loadOfflineData = (table: string) => {
    return offlineManager.loadOfflineData(table);
  };

  const syncOfflineData = () => {
    return offlineManager.syncOfflineData();
  };

  const isOffline = () => {
    return offlineManager.isOffline();
  };

  const getQueueSize = () => {
    return offlineManager.getQueueSize();
  };

  const clearOfflineData = () => {
    return offlineManager.clearOfflineData();
  };

  return {
    queueAction,
    loadOfflineData,
    syncOfflineData,
    isOffline,
    getQueueSize,
    clearOfflineData,
  };
};

