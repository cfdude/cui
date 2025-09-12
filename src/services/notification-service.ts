import { PermissionRequest } from '@/types/index.js';
import { createLogger, type Logger } from './logger.js';
import { ConfigService } from './config-service.js';
import { WebPushService } from './web-push-service.js';

export interface Notification {
  title: string;
  message: string;
  priority: 'min' | 'low' | 'default' | 'high' | 'urgent';
  tags: string[];
  sessionId: string;
  streamingId: string;
  permissionRequestId?: string;
}

/**
 * SECURITY PATCHED: Service for local-only notifications (external transmission disabled)
 */
export class NotificationService {
  private logger: Logger;
  private configService: ConfigService;
  private machineId: string | null = null;
  private webPushService: WebPushService;

  constructor() {
    this.logger = createLogger('NotificationService');
    this.configService = ConfigService.getInstance();
    this.webPushService = WebPushService.getInstance();
    
    // SECURITY: Log warning about disabled external notifications
    this.logger.info('External notifications disabled for security - all notifications are local only');
  }

  /**
   * Get machine ID from config
   */
  private getMachineId(): string {
    if (!this.machineId) {
      try {
        const config = this.configService.getConfig();
        this.machineId = config.machine_id;
      } catch (error) {
        this.logger.error('Failed to get machine ID from config', error);
        this.machineId = 'unknown';
      }
    }
    return this.machineId;
  }

  /**
   * Check if notifications are enabled
   * SECURITY: Always returns false to prevent external transmission
   */
  private async isEnabled(): Promise<boolean> {
    // SECURITY PATCH: Force disable all external notifications
    return false;
  }

  /**
   * Get the ntfy URL from preferences
   * SECURITY: Always returns localhost to prevent external transmission
   */
  private async getNtfyUrl(): Promise<string> {
    // SECURITY PATCH: Only allow localhost URLs
    const config = this.configService.getConfig();
    const configuredUrl = config.interface.notifications?.ntfyUrl || '';
    
    // Only allow localhost URLs
    if (configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1')) {
      return configuredUrl;
    }
    
    // Default to localhost only
    return 'http://localhost:8080';
  }

  /**
   * Send a notification for a permission request
   * SECURITY: Only logs locally, no external transmission
   */
  async sendPermissionNotification(
    request: PermissionRequest,
    sessionId?: string,
    summary?: string
  ): Promise<void> {
    // SECURITY: Only log locally, never send externally
    this.logger.info('Permission notification (local only)', {
      requestId: request.id,
      toolName: request.toolName,
      sessionId: sessionId || 'unknown',
      summary: summary || 'No summary'
    });

    // Web push disabled for security
    // No external transmission
  }

  /**
   * Send a notification when a conversation ends
   * SECURITY: Only logs locally, no external transmission
   */
  async sendConversationEndNotification(
    streamingId: string,
    sessionId: string,
    summary?: string
  ): Promise<void> {
    // SECURITY: Only log locally, never send externally
    this.logger.info('Conversation end notification (local only)', {
      sessionId,
      streamingId,
      summary: summary || 'Task completed'
    });

    // Web push disabled for security
    // No external transmission
  }

  /**
   * SECURITY: This method is disabled to prevent external transmission
   */
  private async sendNotification(
    ntfyUrl: string,
    topic: string,
    notification: Notification
  ): Promise<void> {
    // SECURITY PATCH: Completely disabled
    this.logger.debug('External notification blocked for security', {
      wouldHaveSentTo: ntfyUrl,
      topic,
      title: notification.title
    });
    
    // Do nothing - no external transmission
    return;
  }
}