# CUI API Documentation

## Overview

The CUI server provides a REST API for managing Claude conversations through a web interface. All endpoints are prefixed with `/api` and require authentication via token in the URL hash.

## Authentication

Access the API by including your token in the URL hash:
```
http://localhost:3001/#your-token
```

The token is generated when starting the server and can be found in `~/.cui/config.json`.

## Configuration Endpoints

### GET /api/config
Returns the complete server configuration.

**Response:**
```json
{
  "claudeExecutablePath": "claude",
  "logLevel": "info",
  "serverPort": 3001,
  "interface": {
    "colorScheme": "auto",
    "language": "en",
    "notifications": {
      "enabled": true,
      "showOnSuccess": false,
      "showOnError": true,
      "showOnStart": true
    }
  }
}
```

### PUT /api/config
Updates the server configuration.

**Request Body:**
```json
{
  "interface": {
    "colorScheme": "dark"
  }
}
```

### GET /api/config/interface
Returns only the interface configuration settings.

**Response:**
```json
{
  "colorScheme": "auto",
  "language": "en",
  "notifications": {
    "enabled": true,
    "showOnSuccess": false,
    "showOnError": true,
    "showOnStart": true
  }
}
```

### PUT /api/config/interface
Updates only the interface configuration settings.

**Request Body:**
```json
{
  "colorScheme": "dark",
  "notifications": {
    "enabled": false
  }
}
```

## Conversation Endpoints

### POST /api/conversations
Starts a new conversation with Claude.

**Request Body:**
```json
{
  "message": "Hello Claude",
  "options": {
    "model": "claude-3-opus-20240229",
    "workingDirectory": "/path/to/project"
  }
}
```

**Response:**
```json
{
  "conversationId": "conv_123abc",
  "status": "running"
}
```

### GET /api/conversations
Lists all conversations.

**Query Parameters:**
- `status`: Filter by status (running, completed, error)
- `limit`: Maximum number of results

**Response:**
```json
[
  {
    "conversationId": "conv_123abc",
    "status": "running",
    "startTime": "2024-01-01T00:00:00Z",
    "workingDirectory": "/path/to/project"
  }
]
```

### GET /api/conversations/:id
Gets details of a specific conversation.

**Response:**
```json
{
  "conversationId": "conv_123abc",
  "status": "running",
  "messages": [],
  "startTime": "2024-01-01T00:00:00Z",
  "workingDirectory": "/path/to/project"
}
```

### POST /api/conversations/:id/continue
Continues an existing conversation.

**Request Body:**
```json
{
  "message": "Tell me more"
}
```

### POST /api/conversations/:id/stop
Stops a running conversation.

## Streaming Endpoint

### GET /api/stream/:conversationId
Establishes a streaming connection for real-time conversation updates.

**Response Format:** Newline-delimited JSON
```
{"type":"message","content":"Hello!"}
{"type":"tool_use","tool":"bash","args":["ls"]}
{"type":"status","status":"completed"}
```

## System Endpoints

### GET /api/status
Returns the current system status.

**Response:**
```json
{
  "version": "0.7.0",
  "activeConversations": 2,
  "uptime": 3600
}
```

### GET /api/models
Returns available Claude models.

**Response:**
```json
[
  {
    "id": "claude-3-opus-20240229",
    "name": "Claude 3 Opus"
  },
  {
    "id": "claude-3-sonnet-20240229",
    "name": "Claude 3 Sonnet"
  }
]
```

## Permission Endpoints (MCP)

### POST /api/permissions/:requestId/approve
Approves a tool permission request.

**Request Body:**
```json
{
  "remember": true
}
```

### POST /api/permissions/:requestId/deny
Denies a tool permission request.

**Request Body:**
```json
{
  "remember": false
}
```

## Migration Notes

### Version 0.7.0 Changes

- **Configuration Simplified**: The separate `/api/preferences` endpoints have been replaced with `/api/config` endpoints. The interface settings are now part of the main configuration.
- **Automatic Migration**: If you have an existing installation with separate `preferences.json`, it will be automatically migrated to the unified `config.json` format on first run.
- **Backward Compatibility**: The `/api/config/interface` endpoints provide backward compatibility for frontend components that specifically need interface settings.

## Error Responses

All endpoints return standard HTTP status codes:

- `200 OK`: Success
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error response format:
```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## Rate Limiting

Currently, there are no rate limits on the API endpoints. This may change in future versions.

## WebSocket Support

For real-time updates, use the streaming endpoint which provides newline-delimited JSON over HTTP. WebSocket support may be added in future versions.