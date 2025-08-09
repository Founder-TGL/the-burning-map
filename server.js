const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const rooms = {}; // { roomId: { name: string, players: [playerWS] } }

function broadcastToRoom(roomId, msg) {
    if (!rooms[roomId]) return;
    rooms[roomId].players.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(msg));
        }
    });
}

function getPlayersState(roomId) {
    return rooms[roomId]
        ? rooms[roomId].players.map(ws => ({ 
            name: ws.playerName, 
            avatar: ws.playerAvatar 
        }))
        : [];
}

function getRoomsList() {
    return Object.keys(rooms).map(roomId => ({
        id: roomId,
        name: rooms[roomId].name,
        playerCount: rooms[roomId].players.length
    }));
}

wss.on('connection', (ws) => {
    console.log('New connection');

    ws.on('message', (message) => {
        let data;
        try { data = JSON.parse(message); }
        catch { return; }

        if (data.type === 'getRooms') {
            ws.send(JSON.stringify({
                type: 'roomList',
                rooms: getRoomsList()
            }));
        }

        if (data.type === 'join') {
            const { roomId, playerName, playerAvatar, roomName } = data;
            ws.playerName = playerName;
            ws.playerAvatar = playerAvatar;
            ws.roomId = roomId;
            
            if (!rooms[roomId]) {
                rooms[roomId] = {
                    name: roomName || `Room ${roomId}`,
                    players: []
                };
            }
            rooms[roomId].players.push(ws);
            
            console.log(`${playerName} joined room ${roomId}`);
            broadcastToRoom(roomId, {
                type: 'system',
                message: `${playerName} joined the room.`,
                players: getPlayersState(roomId)
            });
        }

        if (data.type === 'chat') {
            broadcastToRoom(ws.roomId, {
                type: 'chat',
                from: ws.playerName,
                message: data.message
            });
        }

        if (data.type === 'emoji') {
            broadcastToRoom(ws.roomId, {
                type: 'emojiFlash',
                playerName: ws.playerName,
                emoji: data.emoji
            });
        }
    });

    ws.on('close', () => {
        const { roomId, playerName } = ws;
        if (roomId && rooms[roomId]) {
            rooms[roomId].players = rooms[roomId].players.filter(c => c !== ws);
            
            // Remove empty rooms
            if (rooms[roomId].players.length === 0) {
                delete rooms[roomId];
            } else {
                broadcastToRoom(roomId, {
                    type: 'system',
                    message: `${playerName} left the room.`,
                    players: getPlayersState(roomId)
                });
            }
        }
    });
});

console.log("✅ WebSocket server running on ws://localhost:8080");
