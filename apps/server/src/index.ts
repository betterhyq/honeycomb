import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sseHandlers } from 'express-mcp-handler';

const app = express();
app.use(express.json());

// Provide a factory function that returns a fresh McpServer for each SSE connection
const serverFactory = () => new McpServer({
  name: 'sse-mcp-server',
  version: '1.0.0',
});

// Configure SSE handlers
const handlers = sseHandlers(serverFactory, {
  onError: (error: Error, sessionId?: string) => {
    console.error(`[SSE][${sessionId || 'unknown'}]`, error);
  },
  onClose: (sessionId: string) => {
    console.log(`[SSE] transport closed: ${sessionId}`);
    // Clean up any session resources
  },
});

// Mount the SSE endpoints
app.get('/sse', handlers.getHandler);
app.post('/messages', handlers.postHandler);

app.listen(3002, () => {
  console.log('Express MCP SSE server running on port 3002');
});