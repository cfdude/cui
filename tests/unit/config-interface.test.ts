import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { ConfigService } from '@/services/config-service.js';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import os from 'os';

describe('ConfigService Interface Methods', () => {
  let configService: ConfigService;
  let testDir: string;
  let configPath: string;
  let originalHomedir: string;

  beforeAll(async () => {
    // Save original homedir
    originalHomedir = os.homedir();

    // Create test directory
    testDir = await fs.mkdtemp(path.join(tmpdir(), 'cui-test-'));
    configPath = path.join(testDir, 'config.json');

    // Mock os.homedir to return our test directory
    vi.spyOn(os, 'homedir').mockReturnValue(testDir);
  });

  afterAll(async () => {
    // Restore original homedir
    (os.homedir as any<typeof os.homedir>).mockRestore();

    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    // Reset the singleton instance by accessing private property
    (ConfigService as any).instance = undefined;

    // Get the singleton instance (it will use our mocked homedir)
    configService = ConfigService.getInstance();

    // Initialize with a basic config
    await configService.initialize();
  });

  afterEach(async () => {
    // Reset singleton for next test
    (ConfigService as any).instance = undefined;
  });

  describe('getInterface()', () => {
    it('should return interface configuration', () => {
      const interfaceConfig = configService.getInterface();
      
      expect(interfaceConfig).toBeDefined();
      expect(interfaceConfig.colorScheme).toBe('system');
      expect(interfaceConfig.language).toBe('en');
      expect(interfaceConfig.notifications).toBeUndefined();
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
      expect(updatedInterface.notifications).toBeUndefined(); // No notifications set initially
    });

    it('should merge notification settings correctly', async () => {
      await configService.updateInterface({
        notifications: {
          enabled: false,
          showOnSuccess: true
        }
      });

      const updatedInterface = configService.getInterface();
      expect(updatedInterface.notifications).toBeDefined();
      expect(updatedInterface.notifications!.enabled).toBe(false);
    });

    it('should persist changes to disk', async () => {
      await configService.updateInterface({
        colorScheme: 'light'
      });

      // Reset and reload to verify persistence
      (ConfigService as any).instance = undefined;
      const newConfigService = ConfigService.getInstance();
      await newConfigService.initialize();
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
      
      const configDir = path.join(testDir, '.cui');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify(oldConfig, null, 2));
      
      // Reset and reload to test migration
      (ConfigService as any).instance = undefined;
      const migratedService = ConfigService.getInstance();
      await migratedService.initialize();
      const config = migratedService.getConfig();
      
      // Should have added interface section with defaults
      expect(config.interface).toBeDefined();
      expect(config.interface.colorScheme).toBe('system');
      expect(config.interface.language).toBe('en');
      expect(config.interface.notifications).toBeUndefined();
      
      // Should preserve existing fields
      expect(config.claudeExecutablePath).toBe('claude');
      expect(config.logLevel).toBe('info');
    });

    it('should handle completely empty config file', async () => {
      const configDir = path.join(testDir, '.cui');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'config.json'), '{}');
      
      // Reset and reload to test empty config
      (ConfigService as any).instance = undefined;
      const migratedService = ConfigService.getInstance();
      await migratedService.initialize();
      const config = migratedService.getConfig();
      
      // Should have all defaults including interface
      expect(config.interface).toBeDefined();
      expect(config.interface.colorScheme).toBe('system');
      expect(config.claudeExecutablePath).toBeUndefined();
    });
  });
});