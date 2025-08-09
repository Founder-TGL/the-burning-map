const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3001 });

// Store all connected clients
const clients = new Set();

wss.on('connection', (ws) => {
    console.log('New client connected');
    clients.add(ws);
    
    ws.on('message', (message) => {
        try {
            const messageString = message.toString();
            const data = JSON.parse(messageString);
            
            
            // Broadcast the drawing data to all other clients
            clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(messageString);
                }
            });
        } catch (error) {
            console.error('Error parsing message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        clients.delete(ws);
    });
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        clients.delete(ws);
    });
});

console.log('✅ WebSocket server running on ws://localhost:3001');
