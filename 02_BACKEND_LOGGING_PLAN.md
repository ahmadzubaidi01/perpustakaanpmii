# Phase 2 - Backend Logging Plan

## 1. Request Logging
All incoming HTTP requests must be logged via Winston/Morgan middleware.
- **Timestamp**: ISO 8601
- **User ID**: From JWT payload (if auth'd)
- **Role**: User role
- **IP**: `req.ip` or `x-forwarded-for`
- **Device & Platform**: User-Agent parser
- **Endpoint & Method**: `req.method` + `req.originalUrl`
- **Status**: `res.statusCode`
- **Response Time**: `X-Response-Time`
- **Size**: `req.socket.bytesRead` / `res.socket.bytesWritten`

## 2. WebSocket Logging
- **Connect**: Socket ID, User ID, Transport type
- **Disconnect**: Reason (ping timeout, transport close)
- **Reconnect / Reconnect Count**: Track via Socket ID mapping
- **Auth Failure**: Invalid token events
- **Event Sent/Received**: Payload summary

## 3. Authentication & Security
- **Login Success/Failure**: Reason (Invalid password, Rate limited)
- **Token Refresh**: Refresh count per session
- **Token Expired**: Count of expired tokens hitting restricted routes

## 4. Upload & Processing
- **Upload Started**: File size, type
- **Upload Progress/Finished/Failed**: Errors during bulk inserts

## 5. Database Logging
- **Slow Query**: Any query > 500ms
- **Failed Query**: Sequelize validation/constraint errors
- **Connection Failure**: Pool exhaustion or timeout

## 6. Error Logs
- **Full Stack Trace**: `err.stack`
- **User Context**: Who experienced the error
