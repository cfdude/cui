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
 * Service for browser-native push notifications only (no external services)
 * Uses standard Web Push API for privacy and security
 */
export class NotificationService {
  private logger: Logger;
  private configService: ConfigService;
  private webPushService: WebPushService;

  constructor() {
    this.logger = createLogger('NotificationService');
    this.configService = ConfigService.getInstance();
    this.webPushService = WebPushService.getInstance();
    
    this.logger.info('Using native browser notifications only (privacy-first approach)');
  }

  /**
   * Check if notifications are enabled
   */
  private async isEnabled(): Promise<boolean> {
    const config = this.configService.getConfig();
    return config.interface.notifications?.enabled ?? false;
  }

  /**
   * Send a notification for a permission request
   * Uses native browser Web Push API only
   */
  async sendPermissionNotification(
    request: PermissionRequest,
    sessionId?: string,
    summary?: string
  ): Promise<void> {
    if (!(await this.isEnabled())) {
      this.logger.debug('Notifications disabled, skipping permission notification');
      return;
    }

    try {
      // Initialize web push if needed
      await this.webPushService.initialize();
      
      if (!this.webPushService.getEnabled()) {
        this.logger.debug('Web push not enabled, skipping notification');
        return;
      }

      // Send via native browser push only
      await this.webPushService.broadcast({
        title: 'CUI Permission Request',
        message: summary 
          ? `${summary} - ${request.toolName}`
          : `${request.toolName} tool: ${JSON.stringify(request.toolInput).substring(0, 100)}...`,
        tag: 'cui-permission',
        data: {
          sessionId: sessionId || 'unknown',
          streamingId: request.streamingId,
          permissionRequestId: request.id,
          type: 'permission',
        },
      });
      
      this.logger.info('Browser notification sent', {
        requestId: request.id,
        toolName: request.toolName,
        method: 'web-push'
      });
    } catch (error) {
      // Notifications failing should not break the app
      this.logger.debug('Failed to send browser notification (non-critical)', {
        error: (error as Error)?.message,
        requestId: request.id
      });
    }
  }

  /**
   * Send a notification when a conversation ends
   * Uses native browser Web Push API only
   */
  async sendConversationEndNotification(
    streamingId: string,
    sessionId: string,
    summary?: string
  ): Promise<void> {
    if (!(await this.isEnabled())) {
      this.logger.debug('Notifications disabled, skipping conversation end notification');
      return;
    }

    try {
      // Initialize web push if needed
      await this.webPushService.initialize();
      
      if (!this.webPushService.getEnabled()) {
        this.logger.debug('Web push not enabled, skipping notification');
        return;
      }

      // Send via native browser push only
      await this.webPushService.broadcast({
        title: 'Task Finished',
        message: summary || 'Task completed',
        tag: 'cui-complete',
        data: {
          sessionId,
          streamingId,
          type: 'conversation-end',
        },
      });
      
      this.logger.info('Browser notification sent', {
        sessionId,
        streamingId,
        method: 'web-push'
      });
    } catch (error) {
      // Notifications failing should not break the app
      this.logger.debug('Failed to send browser notification (non-critical)', {
        error: (error as Error)?.message,
        sessionId,
        streamingId
      });
    }
  }
}