import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigService } from '@/services/config-service.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

describe('ConfigService Interface Methods', () => {
  let configService: ConfigService;
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'cui-test-'));
    configPath = path.join(testDir, 'config.json');
    configService = new ConfigService(configPath);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('getInterface()', () => {
    it('should return interface configuration', () => {
      const interfaceConfig = configService.getInterface();
      
      expect(interfaceConfig).toBeDefined();
      expect(interfaceConfig.colorScheme).toBe('auto');
      expect(interfaceConfig.language).toBe('en');
      expect(interfaceConfig.notifications).toEqual({
        enabled: true,
        showOnSuccess: false,
        showOnError: true,
        showOnStart: true
      });
    });
  });

  describe('updateInterface()', () => {
    it('should update interface configuration', async () => {
      await configService.updateInterface({
        colorScheme: 'dark',
        language: 'es'
      });

      const updatedInterface = configService.getInterface();
      expect(updatedInterface.colorScheme).toBe('dark');
      expect(updatedInterface.language).toBe('es');
      expect(updatedInterface.notifications.enabled).toBe(true); // Should preserve existing
    });

    it('should merge notification settings correctly', async () => {
      await configService.updateInterface({
        notifications: {
          enabled: false,
          showOnSuccess: true
        }
      });

      const updatedInterface = configService.getInterface();
      expect(updatedInterface.notifications.enabled).toBe(false);
      expect(updatedInterface.notifications.showOnSuccess).toBe(true);
      expect(updatedInterface.notifications.showOnError).toBe(true); // Should preserve
      expect(updatedInterface.notifications.showOnStart).toBe(true); // Should preserve
    });

    it('should persist changes to disk', async () => {
      await configService.updateInterface({
        colorScheme: 'light'
      });

      // Create new instance to verify persistence
      const newConfigService = new ConfigService(configPath);
      const interfaceConfig = newConfigService.getInterface();
      
      expect(interfaceConfig.colorScheme).toBe('light');
    });
  });

  describe('Config Migration', () => {
    it('should handle config without interface section', async () => {
      // Write old-style config without interface section
      const oldConfig = {
        claudeExecutablePath: 'claude',
        logLevel: 'info',
        serverPort: 3000,
        maxConversations: 10,
        conversationTimeout: 3600000,
        healthCheckInterval: 30000
      };
      
      await fs.writeFile(configPath, JSON.stringify(oldConfig, null, 2));
      
      // Load with new ConfigService
      const migratedService = new ConfigService(configPath);
      const config = migratedService.getConfig();
      
      // Should have added interface section with defaults
      expect(config.interface).toBeDefined();
      expect(config.interface.colorScheme).toBe('auto');
      expect(config.interface.language).toBe('en');
      expect(config.interface.notifications).toBeDefined();
      
      // Should preserve existing fields
      expect(config.claudeExecutablePath).toBe('claude');
      expect(config.logLevel).toBe('info');
    });

    it('should handle completely empty config file', async () => {
      await fs.writeFile(configPath, '{}');
      
      const migratedService = new ConfigService(configPath);
      const config = migratedService.getConfig();
      
      // Should have all defaults including interface
      expect(config.interface).toBeDefined();
      expect(config.interface.colorScheme).toBe('auto');
      expect(config.claudeExecutablePath).toBe('claude');
    });
  });
});