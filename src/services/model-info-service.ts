import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createLogger, type Logger } from './logger.js';
import { WebPushService } from './web-push-service.js';
import { ConfigService } from './config-service.js';

export interface ModelInfo {
  value: string;
  label: string;
  description: string;
}

export interface ModelData {
  models: ModelInfo[];
  defaultModel: string;
  lastUpdated: string;
  fromCache: boolean;
}

/**
 * Service to retrieve and cache Claude CLI model information
 */
export class ModelInfoService {
  private logger: Logger;
  private modelData: ModelData | null = null;
  private cacheFilePath: string;
  private webPushService: WebPushService;
  private configService: ConfigService;
  
  // Hardcoded fallback data
  private readonly FALLBACK_DATA: ModelData = {
    models: [
      { value: 'default', label: 'Default (Sonnet)', description: 'Recommended adaptive model' },
      { value: 'sonnet', label: 'Sonnet', description: 'Latest Sonnet for daily coding tasks' },
      { value: 'opus', label: 'Opus', description: 'Most capable for complex reasoning' },
      { value: 'haiku', label: 'Haiku', description: 'Fast and efficient for simple tasks' }
    ],
    defaultModel: 'sonnet',
    lastUpdated: new Date().toISOString(),
    fromCache: true
  };

  constructor() {
    this.logger = createLogger('ModelInfoService');
    this.webPushService = WebPushService.getInstance();
    this.configService = ConfigService.getInstance();
    const configDir = path.join(os.homedir(), '.cui');
    this.cacheFilePath = path.join(configDir, 'model-cache.json');
    
    // Ensure config directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
  }


  /**
   * Send a notification if notifications are enabled
   */
  private async sendNotification(title: string, message: string): Promise<void> {
    try {
      const config = this.configService.getConfig();
      if (!config.interface.notifications?.enabled) {
        this.logger.debug('Notifications disabled, skipping');
        return;
      }

      await this.webPushService.initialize();
      if (!this.webPushService.getEnabled()) {
        this.logger.debug('Web push not enabled, skipping notification');
        return;
      }

      await this.webPushService.broadcast({
        title,
        message,
        tag: 'cui-model-info',
        data: {
          type: 'model-info',
          sessionId: 'system',
          streamingId: 'system'
        }
      });
      
      this.logger.debug('Notification sent', { title });
    } catch (error) {
      this.logger.debug('Failed to send notification', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }

  /**
   * Initialize the service by loading models from config
   */
  async initialize(): Promise<void> {
    this.logger.info('🔍 ModelInfoService: Starting initialization...');
    
    // First priority: Try to load from config
    try {
      const config = this.configService.getConfig();
      if (config.models && config.models['claude-code']) {
        const models = config.models['claude-code'];
        this.modelData = {
          models: models,
          defaultModel: models[0]?.value || 'default',
          lastUpdated: new Date().toISOString(),
          fromCache: false
        };
        this.logger.info('✅ ModelInfoService: Loaded model information from config', {
          modelCount: models.length,
          defaultModel: this.modelData.defaultModel
        });
        await this.saveToDiskCache(this.modelData);
        return;
      }
    } catch (error) {
      this.logger.warn('⚠️ ModelInfoService: Failed to load models from config', { 
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Second fallback: try to load from disk cache
    try {
      const cachedData = await this.loadFromDiskCache();
      if (cachedData) {
        this.modelData = cachedData;
        this.modelData.fromCache = true;
        this.logger.warn('Using cached model data from disk', { 
          lastUpdated: cachedData.lastUpdated 
        });
        return;
      }
    } catch (error) {
      this.logger.debug('Failed to load from disk cache', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }

    // Final fallback: use hardcoded defaults
    this.modelData = { ...this.FALLBACK_DATA };
    this.logger.warn('No models configured in config.json, using default model list');
  }

  /**
   * Query Claude CLI for available models
   */
  private async queryClaudeCLI(): Promise<ModelData | null> {
    try {
      const command = 'claude -p "what are the model choices and default option for Claude Code CLI?" --output-format json';
      this.logger.info('📞 ModelInfoService: Executing Claude CLI command:', { command });
      
      const output = execSync(command, { 
        encoding: 'utf-8',
        timeout: 30000 // 30 second timeout
      });
      
      this.logger.debug('📝 ModelInfoService: Claude CLI raw output received', { 
        outputLength: output.length,
        outputPreview: output.substring(0, 200) + '...'
      });
      
      // Parse the JSON response
      const modelData = this.parseClaudeJsonResponse(output);
      this.logger.info('✨ ModelInfoService: Parsed model data', {
        modelCount: modelData.models.length,
        models: modelData.models.map(m => m.value)
      });
      return modelData;
    } catch (error) {
      this.logger.error('❌ ModelInfoService: Error querying Claude CLI', { 
        error: error instanceof Error ? error.message : String(error),
        errorCode: error instanceof Error && 'code' in error ? (error as NodeJS.ErrnoException).code : undefined,
        errorSignal: error instanceof Error && 'signal' in error ? (error as { signal?: string }).signal : undefined,
        errorCmd: error instanceof Error && 'cmd' in error ? (error as { cmd?: string }).cmd : undefined
      });
      return null;
    }
  }

  /**
   * Parse the Claude CLI JSON response to extract model information
   */
  private parseClaudeJsonResponse(jsonString: string): ModelData {
    try {
      const json = JSON.parse(jsonString);
      
      if (!json.result) {
        this.logger.warn('No result field in Claude CLI JSON response');
        return this.parseClaudeResponse(jsonString);
      }
      
      // Parse the markdown content from the result field
      return this.parseClaudeResponse(json.result);
    } catch (error) {
      this.logger.error('Failed to parse JSON response, falling back to text parsing', {
        error: error instanceof Error ? error.message : String(error)
      });
      // Fallback to text parsing if JSON parsing fails
      return this.parseClaudeResponse(jsonString);
    }
  }

  /**
   * Parse the Claude CLI response to extract model information
   */
  private parseClaudeResponse(response: string): ModelData {
    const models: ModelInfo[] = [];
    let defaultModel = 'sonnet'; // Default assumption
    
    // Extract models from the response
    // Looking for patterns like:
    // - **`default`** - Recommended adaptive model (adjusts based on account type)
    // - **`sonnet`** - Latest Sonnet for daily coding tasks
    
    const modelRegex = /[-•]\s*\*?\*?`?(\w+(?:\[\d+[mk]\])?)`?\*?\*?\s*[-–]\s*(.+?)(?:\n|$)/gi;
    let match;
    
    while ((match = modelRegex.exec(response)) !== null) {
      const value = match[1].toLowerCase();
      const description = match[2].trim();
      
      // Clean up the description
      const cleanDescription = description
        .replace(/\*\*/g, '')
        .replace(/`/g, '')
        .trim();
      
      // Generate label
      let label = value.charAt(0).toUpperCase() + value.slice(1);
      
      // Special handling for default model
      if (value === 'default') {
        // Try to extract what default resolves to from the description
        const defaultMatch = cleanDescription.match(/\b(sonnet|opus|haiku)\b/i);
        if (defaultMatch) {
          defaultModel = defaultMatch[1].toLowerCase();
          label = `Default (${defaultMatch[1].charAt(0).toUpperCase() + defaultMatch[1].slice(1)})`;
          this.logger.debug('Found default model in description', { 
            defaultModel, 
            description: cleanDescription 
          });
        } else {
          // Fallback: look for "adapts" or "adaptive" which usually means Sonnet
          label = 'Default (Sonnet)';
          this.logger.debug('Using fallback for default model label', { 
            description: cleanDescription,
            label 
          });
        }
      }
      
      // Handle special model names
      if (value.includes('[')) {
        // e.g., sonnet[1m] -> Sonnet (1M context)
        const baseModel = value.split('[')[0];
        const context = value.match(/\[(\d+[mk])\]/)?.[1];
        label = `${baseModel.charAt(0).toUpperCase() + baseModel.slice(1)}${context ? ` (${context.toUpperCase()} context)` : ''}`;
      }
      
      models.push({
        value,
        label,
        description: cleanDescription
      });
    }
    
    // If we didn't find any models, return basic set
    if (models.length === 0) {
      return this.FALLBACK_DATA;
    }
    
    // Look for explicit default model mention
    const defaultMatch = response.match(/default[^.]*?(?:falls?\s*back|adapts?|uses?)[^.]*?\b(sonnet|opus|haiku)\b/i);
    if (defaultMatch) {
      defaultModel = defaultMatch[1].toLowerCase();
      
      // Update the default label if we found it
      const defaultModelInfo = models.find(m => m.value === 'default');
      if (defaultModelInfo) {
        defaultModelInfo.label = `Default (${defaultMatch[1].charAt(0).toUpperCase() + defaultMatch[1].slice(1)})`;
      }
    }
    
    return {
      models,
      defaultModel,
      lastUpdated: new Date().toISOString(),
      fromCache: false
    };
  }

  /**
   * Save model data to disk cache
   */
  private async saveToDiskCache(data: ModelData): Promise<void> {
    try {
      await fs.promises.writeFile(
        this.cacheFilePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      this.logger.debug('Model data saved to disk cache');
    } catch (error) {
      this.logger.error('Failed to save model data to disk cache', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Load model data from disk cache
   */
  private async loadFromDiskCache(): Promise<ModelData | null> {
    try {
      if (!fs.existsSync(this.cacheFilePath)) {
        return null;
      }
      
      const data = await fs.promises.readFile(this.cacheFilePath, 'utf-8');
      const parsed = JSON.parse(data) as ModelData;
      
      // Validate the cached data has required fields
      if (!parsed.models || !parsed.defaultModel || !parsed.lastUpdated) {
        this.logger.warn('Invalid cache data structure');
        return null;
      }
      
      return parsed;
    } catch (error) {
      this.logger.error('Failed to load model data from disk cache', {
        error: error instanceof Error ? error.message : String(error)
      });
      return null;
    }
  }

  /**
   * Get available models
   */
  getAvailableModels(): ModelInfo[] {
    if (!this.modelData) {
      return this.FALLBACK_DATA.models;
    }
    return this.modelData.models;
  }

  /**
   * Get default model information
   */
  getDefaultModelInfo(): string {
    if (!this.modelData) {
      return this.FALLBACK_DATA.defaultModel;
    }
    return this.modelData.defaultModel;
  }

  /**
   * Get complete model data
   */
  getModelData(): ModelData {
    if (!this.modelData) {
      return this.FALLBACK_DATA;
    }
    return this.modelData;
  }

  /**
   * Force refresh model list
   */
  async refreshModels(): Promise<void> {
    await this.initialize();
  }
}