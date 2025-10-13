/**
 * Sistema de backup automático
 */

import { supabase } from './supabaseClient';
import { structuredLogger } from './structuredLogger';
import { analytics } from './analytics';

interface BackupData {
  people: any[];
  tags: any[];
  leaders: any[];
  profiles: any[];
  metadata: {
    timestamp: number;
    version: string;
    totalRecords: number;
  };
}

interface BackupOptions {
  includeMetadata?: boolean;
  compress?: boolean;
  format?: 'json' | 'csv';
}

class BackupManager {
  private backupKey = 'gestao-politica-backup';
  private maxBackups = 5; // Manter apenas os últimos 5 backups

  // Criar backup completo
  async createBackup(options: BackupOptions = {}): Promise<BackupData> {
    const startTime = Date.now();
    
    structuredLogger.info('Iniciando backup', {
      action: 'backup_start',
      metadata: { options },
    });

    try {
      // Buscar dados de todas as tabelas
      const [peopleResult, tagsResult, leadersResult, profilesResult] = await Promise.allSettled([
        supabase.from('people').select('*'),
        supabase.from('tags').select('*'),
        supabase.from('leaders').select('*'),
        supabase.from('profiles').select('*'),
      ]);

      const people = peopleResult.status === 'fulfilled' ? peopleResult.value.data || [] : [];
      const tags = tagsResult.status === 'fulfilled' ? tagsResult.value.data || [] : [];
      const leaders = leadersResult.status === 'fulfilled' ? leadersResult.value.data || [] : [];
      const profiles = profilesResult.status === 'fulfilled' ? profilesResult.value.data || [] : [];

      const totalRecords = people.length + tags.length + leaders.length + profiles.length;

      const backupData: BackupData = {
        people,
        tags,
        leaders,
        profiles,
        metadata: {
          timestamp: Date.now(),
          version: '1.0.0',
          totalRecords,
        },
      };

      // Salvar backup localmente
      await this.saveBackupLocally(backupData);

      // Salvar backup no Supabase (se configurado)
      if (import.meta.env.VITE_ENABLE_CLOUD_BACKUP === 'true') {
        await this.saveBackupToCloud(backupData);
      }

      const duration = Date.now() - startTime;

      structuredLogger.info('Backup criado com sucesso', {
        action: 'backup_complete',
        metadata: {
          totalRecords,
          duration,
          tables: {
            people: people.length,
            tags: tags.length,
            leaders: leaders.length,
            profiles: profiles.length,
          },
        },
      });

      analytics.track('backup_created', {
        totalRecords,
        duration,
        tables: {
          people: people.length,
          tags: tags.length,
          leaders: leaders.length,
          profiles: profiles.length,
        },
      });

      return backupData;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      structuredLogger.error('Erro ao criar backup', error as Error, {
        action: 'backup_error',
        metadata: { duration },
      });

      analytics.track('backup_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      throw error;
    }
  }

  // Salvar backup localmente
  private async saveBackupLocally(backupData: BackupData): Promise<void> {
    try {
      const backups = await this.getLocalBackups();
      
      // Adicionar novo backup
      backups.unshift(backupData);
      
      // Manter apenas os últimos N backups
      if (backups.length > this.maxBackups) {
        backups.splice(this.maxBackups);
      }

      // Salvar no localStorage
      localStorage.setItem(this.backupKey, JSON.stringify(backups));

    } catch (error) {
      structuredLogger.error('Erro ao salvar backup local', error as Error, {
        action: 'backup_local_save_error',
      });
      throw error;
    }
  }

  // Salvar backup na nuvem
  private async saveBackupToCloud(backupData: BackupData): Promise<void> {
    try {
      const { error } = await supabase
        .from('backups')
        .insert({
          data: backupData,
          created_at: new Date().toISOString(),
          size: JSON.stringify(backupData).length,
        });

      if (error) {
        throw error;
      }

    } catch (error) {
      structuredLogger.error('Erro ao salvar backup na nuvem', error as Error, {
        action: 'backup_cloud_save_error',
      });
      // Não falhar o backup se a nuvem falhar
    }
  }

  // Obter backups locais
  async getLocalBackups(): Promise<BackupData[]> {
    try {
      const backupsJson = localStorage.getItem(this.backupKey);
      return backupsJson ? JSON.parse(backupsJson) : [];
    } catch (error) {
      structuredLogger.error('Erro ao carregar backups locais', error as Error, {
        action: 'backup_local_load_error',
      });
      return [];
    }
  }

  // Restaurar backup
  async restoreBackup(backupData: BackupData): Promise<void> {
    const startTime = Date.now();
    
    structuredLogger.info('Iniciando restauração de backup', {
      action: 'backup_restore_start',
      metadata: {
        timestamp: backupData.metadata.timestamp,
        totalRecords: backupData.metadata.totalRecords,
      },
    });

    try {
      // Restaurar cada tabela
      const restorePromises = [];

      if (backupData.people.length > 0) {
        restorePromises.push(this.restoreTable('people', backupData.people));
      }

      if (backupData.tags.length > 0) {
        restorePromises.push(this.restoreTable('tags', backupData.tags));
      }

      if (backupData.leaders.length > 0) {
        restorePromises.push(this.restoreTable('leaders', backupData.leaders));
      }

      if (backupData.profiles.length > 0) {
        restorePromises.push(this.restoreTable('profiles', backupData.profiles));
      }

      await Promise.all(restorePromises);

      const duration = Date.now() - startTime;

      structuredLogger.info('Backup restaurado com sucesso', {
        action: 'backup_restore_complete',
        metadata: { duration },
      });

      analytics.track('backup_restored', {
        duration,
        totalRecords: backupData.metadata.totalRecords,
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      
      structuredLogger.error('Erro ao restaurar backup', error as Error, {
        action: 'backup_restore_error',
        metadata: { duration },
      });

      analytics.track('backup_restore_error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      });

      throw error;
    }
  }

  // Restaurar tabela específica
  private async restoreTable(tableName: string, data: any[]): Promise<void> {
    try {
      // Limpar tabela existente (cuidado em produção!)
      if (import.meta.env.DEV) {
        await supabase.from(tableName).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }

      // Inserir dados do backup
      const { error } = await supabase
        .from(tableName)
        .insert(data);

      if (error) {
        throw error;
      }

    } catch (error) {
      structuredLogger.error(`Erro ao restaurar tabela ${tableName}`, error as Error, {
        action: 'backup_table_restore_error',
        metadata: { table: tableName, recordCount: data.length },
      });
      throw error;
    }
  }

  // Exportar backup como arquivo
  async exportBackup(backupData: BackupData, format: 'json' | 'csv' = 'json'): Promise<void> {
    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (format === 'json') {
        content = JSON.stringify(backupData, null, 2);
        filename = `backup-${new Date(backupData.metadata.timestamp).toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        // Exportar como CSV (apenas pessoas por simplicidade)
        content = this.convertToCSV(backupData.people);
        filename = `backup-pessoas-${new Date(backupData.metadata.timestamp).toISOString().split('T')[0]}.csv`;
        mimeType = 'text/csv';
      }

      // Criar e baixar arquivo
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);

      structuredLogger.info('Backup exportado', {
        action: 'backup_exported',
        metadata: { format, filename },
      });

      analytics.track('backup_exported', {
        format,
        filename,
        size: content.length,
      });

    } catch (error) {
      structuredLogger.error('Erro ao exportar backup', error as Error, {
        action: 'backup_export_error',
      });
      throw error;
    }
  }

  // Converter dados para CSV
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
      return headers.map(header => {
        const value = row[header];
        // Escapar vírgulas e aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',');
    });

    return [csvHeaders, ...csvRows].join('\n');
  }

  // Agendar backup automático
  scheduleAutoBackup(intervalHours: number = 24): void {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    setInterval(async () => {
      try {
        await this.createBackup();
      } catch (error) {
        structuredLogger.error('Erro no backup automático', error as Error, {
          action: 'auto_backup_error',
        });
      }
    }, intervalMs);

    structuredLogger.info('Backup automático agendado', {
      action: 'auto_backup_scheduled',
      metadata: { intervalHours },
    });
  }

  // Limpar backups antigos
  async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.getLocalBackups();
      
      if (backups.length > this.maxBackups) {
        const backupsToKeep = backups.slice(0, this.maxBackups);
        localStorage.setItem(this.backupKey, JSON.stringify(backupsToKeep));
        
        structuredLogger.info('Backups antigos removidos', {
          action: 'backup_cleanup',
          metadata: { removed: backups.length - this.maxBackups },
        });
      }
    } catch (error) {
      structuredLogger.error('Erro ao limpar backups antigos', error as Error, {
        action: 'backup_cleanup_error',
      });
    }
  }
}

// Instância singleton
export const backupManager = new BackupManager();

// Hook para React
export const useBackupManager = () => {
  const createBackup = (options?: BackupOptions) => {
    return backupManager.createBackup(options);
  };

  const restoreBackup = (backupData: BackupData) => {
    return backupManager.restoreBackup(backupData);
  };

  const exportBackup = (backupData: BackupData, format?: 'json' | 'csv') => {
    return backupManager.exportBackup(backupData, format);
  };

  const getLocalBackups = () => {
    return backupManager.getLocalBackups();
  };

  const scheduleAutoBackup = (intervalHours?: number) => {
    return backupManager.scheduleAutoBackup(intervalHours);
  };

  const cleanupOldBackups = () => {
    return backupManager.cleanupOldBackups();
  };

  return {
    createBackup,
    restoreBackup,
    exportBackup,
    getLocalBackups,
    scheduleAutoBackup,
    cleanupOldBackups,
  };
};


