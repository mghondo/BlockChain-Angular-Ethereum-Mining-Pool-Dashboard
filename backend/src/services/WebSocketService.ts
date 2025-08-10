import { WebSocketServer, WebSocket } from 'ws';

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.initialize();
  }

  private initialize(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      console.log('🔌 New WebSocket connection from:', req.socket.remoteAddress);
      
      this.clients.add(ws);
      
      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection',
        message: 'Connected to Mining Dashboard WebSocket',
        timestamp: new Date().toISOString()
      });

      // Handle client messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid JSON received from client:', error);
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle client errors
      ws.on('error', (error) => {
        console.error('WebSocket client error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, {
          type: 'pong',
          timestamp: new Date().toISOString()
        });
        break;
      
      case 'subscribe':
        // Handle subscription to specific data types (pools, network stats, etc.)
        console.log('Client subscribed to:', message.data);
        this.sendToClient(ws, {
          type: 'subscription_confirmed',
          data: message.data,
          timestamp: new Date().toISOString()
        });
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  private sendToClient(ws: WebSocket, data: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error('Failed to send message to client:', error);
      }
    }
  }

  // Broadcast to all connected clients
  public broadcast(data: any): void {
    const message = JSON.stringify(data);
    
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          console.error('Failed to broadcast to client:', error);
          this.clients.delete(client);
        }
      } else {
        // Remove inactive clients
        this.clients.delete(client);
      }
    });
  }

  // Send mining pool updates to all clients
  public broadcastPoolUpdate(poolData: any): void {
    this.broadcast({
      type: 'pool_update',
      data: poolData,
      timestamp: new Date().toISOString()
    });
  }

  // Send network stats updates to all clients
  public broadcastNetworkUpdate(networkData: any): void {
    this.broadcast({
      type: 'network_update',
      data: networkData,
      timestamp: new Date().toISOString()
    });
  }

  // Send new block notifications to all clients
  public broadcastNewBlock(blockData: any): void {
    this.broadcast({
      type: 'new_block',
      data: blockData,
      timestamp: new Date().toISOString()
    });
  }

  // Send alert notifications to all clients
  public broadcastAlert(alertData: any): void {
    this.broadcast({
      type: 'alert',
      data: alertData,
      timestamp: new Date().toISOString()
    });
  }

  // Get current connection count
  public getConnectionCount(): number {
    return this.clients.size;
  }

  // Health check for WebSocket service
  public healthCheck(): { status: string; connections: number } {
    return {
      status: this.wss ? 'healthy' : 'unhealthy',
      connections: this.clients.size
    };
  }
}