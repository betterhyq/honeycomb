import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { sseHandlers } from 'express-mcp-handler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Mount the SSE endpoints (API routes should be before static files)
app.get('/sse', handlers.getHandler);
app.post('/messages', handlers.postHandler);

// Serve static files from client/dist
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

// Handle SPA routing: all non-API routes should return index.html
app.get('/', (req, res, next) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

app.listen(3002, () => {
  console.log('Express MCP SSE server running on port 3002');
  console.log(`Serving client app from: ${clientDistPath}`);
});