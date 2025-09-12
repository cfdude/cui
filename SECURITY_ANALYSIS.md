# Security Analysis Report - CUI Server

## Executive Summary
**CRITICAL FINDING**: The CUI server is configured to send data to external services, potentially leaking sensitive information including:
- Tool usage and command details
- Session and conversation IDs  
- System notifications
- Machine identifiers

## Critical Security Issues

### 1. 🔴 **CRITICAL: External Data Transmission to ntfy.sh**
**Location**: `src/services/notification-service.ts`
- **Issue**: The application sends notifications to `https://ntfy.sh` by default
- **Data Leaked**:
  - Machine ID (unique identifier)
  - Session IDs and Streaming IDs
  - Tool names and partial tool inputs
  - Permission request details
  - Conversation summaries
- **Risk**: All your Claude CLI activity could be monitored by whoever controls the ntfy.sh service or intercepts this traffic

### 2. 🟡 **Web Push Service Broadcasting**
**Location**: `src/services/web-push-service.ts`
- The application implements web push notifications that could potentially send data to external push services
- Includes conversation metadata and permission requests

## Data Collection & Tracking

### Telemetry and Metrics
- **ToolMetricsService** (`src/services/ToolMetricsService.ts`): Tracks all tool usage from Claude CLI
- **Conversation tracking**: Detailed conversation status and history tracking
- Machine ID is generated and stored for identification

## External Communication Endpoints

### Confirmed External URLs
1. **ntfy.sh** - Push notification service (configurable but defaults to external)
2. **Google Gemini API** - If configured with API key
3. **Anthropic API** - For Claude interactions

## Environment Variables & Secrets

### API Keys Found
- `GOOGLE_API_KEY` - For Gemini service
- Auth tokens stored in configuration
- No hardcoded secrets found in code (good)

## Recommendations

### Immediate Actions Required

1. **DISABLE NOTIFICATIONS** immediately:
   ```json
   {
     "interface": {
       "notifications": {
         "enabled": false
       }
     }
   }
   ```

2. **Remove or Replace ntfy.sh**:
   - Either disable completely or self-host ntfy
   - Never use the public ntfy.sh service

3. **Review Configuration**:
   - Check `~/.claude/config.json` for any external URLs
   - Ensure no sensitive API keys are exposed

### Security Hardening

1. **Network Isolation**:
   - Run the server with firewall rules blocking outbound connections except to localhost
   - Use `--host 127.0.0.1` to ensure local-only binding

2. **Disable Telemetry**:
   - Remove or disable ToolMetricsService if not needed
   - Disable conversation tracking if not required

3. **Audit Dependencies**:
   - The codebase uses standard, reputable packages
   - No obviously malicious dependencies detected
   - Keep dependencies updated

## File System Operations
- Configuration files are written locally only
- No evidence of unauthorized file uploads or exfiltration
- Log files stay local

## Conclusion

The main security concern is the **default configuration sending notifications to external services (ntfy.sh)**, which leaks significant metadata about your Claude CLI usage. This should be disabled immediately unless you're using a self-hosted ntfy instance.

The codebase itself appears to be legitimate and not malicious, but the default configuration poses privacy risks. After disabling external notifications, the server should be safe for local use.

## Verification Commands

To verify no data is being sent externally after fixes:
```bash
# Monitor network traffic while running
sudo tcpdump -i any -n "not host 127.0.0.1 and not host ::1" 

# Check for any external connections
netstat -an | grep ESTABLISHED | grep -v "127.0.0.1"
```