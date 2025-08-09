import { getStroke } from 'https://cdn.skypack.dev/perfect-freehand';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// WebSocket connection
let ws;
let isConnected = false;

function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
        console.log('Connected to WebSocket server');
        isConnected = true;
        updateConnectionStatus(true);
    };
    
    ws.onmessage = async (event) => {
        try {
            let messageData = event.data;
            
            // Handle Blob data
            if (messageData instanceof Blob) {
                messageData = await messageData.text();
            }
            
            console.log('Received message:', messageData, typeof messageData);
            const data = JSON.parse(messageData);
            handleRemoteDrawing(data);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
        }
    };
    
    ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
        isConnected = false;
        updateConnectionStatus(false);
        setTimeout(connectWebSocket, 3000);
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
        statusEl.textContent = connected ? 'Connected' : 'Disconnected';
        statusEl.style.color = connected ? 'green' : 'red';
    }
}

function sendDrawingData(type, data) {
    if (ws && isConnected && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
    }
}

function handleRemoteDrawing(message) {
    const { type, data } = message;
    
    switch (type) {
        case 'stroke':
            allSquibbles.push(data);
            redraw();
            break;
        case 'clear':
            allSquibbles = [];
            redraw();
            break;
        case 'undo':
            if (allSquibbles.length > 0) {
                allSquibbles.pop();
                redraw();
            }
            break;
    }
}

// Connect to WebSocket
connectWebSocket();

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

let allSquibbles = [];
let lastSquibble = [];
let points = [];
let drawing = false;

let size = 16;
let thinning = 0.6;
let smoothing = 0.8;
let streamline = 0.5;
let drawColor = '#000000';


document.getElementById('size').addEventListener('input', e => size = parseFloat(e.target.value));
document.getElementById('thinning').addEventListener('input', e => thinning = parseFloat(e.target.value));
document.getElementById('smoothing').addEventListener('input', e => smoothing = parseFloat(e.target.value));
document.getElementById('streamline').addEventListener('input', e => streamline = parseFloat(e.target.value));
document.getElementById('color').addEventListener('input', e => drawColor = e.target.value);
document.getElementById('undo').addEventListener('click', undoLastStroke);
document.getElementById('redo').addEventListener('click', redoLastStroke);
document.getElementById('clear').addEventListener('click', () => {
    allSquibbles = [];
    points = [];
    redraw();
    // Send clear to other clients
    sendDrawingData('clear', {});
});

canvas.addEventListener('pointerdown', e => {
    drawing = true;
    points = [[e.clientX, e.clientY]];
});

canvas.addEventListener('pointermove', e => {
    if (!drawing) return;
    points.push([e.clientX, e.clientY]);
    redraw();
});

canvas.addEventListener('pointerup', () => {
    if (points.length) {
        const strokeData = {
            points: [...points],
            color: drawColor,
            size,
            thinning,
            smoothing,
            streamline
        };
        allSquibbles.push(strokeData);
        
        // Send stroke to other clients
        sendDrawingData('stroke', strokeData);
    }
    points = [];
    drawing = false;
    redraw();
});

function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    allSquibbles.forEach(strokeData => {
        drawStroke(strokeData.points, strokeData);
    });

    if (points.length) {
        drawStroke(points, { color: drawColor, size, thinning, smoothing, streamline });
    }
}

function drawStroke(pts, settings) {
    const stroke = getStroke(pts, {
        size: settings.size,
        thinning: settings.thinning,
        smoothing: settings.smoothing,
        streamline: settings.streamline
    });

    ctx.fillStyle = settings.color;
    ctx.beginPath();
    if (stroke.length > 0) {
        ctx.moveTo(stroke[0][0], stroke[0][1]);
        for (const [x, y] of stroke) {
            ctx.lineTo(x, y);
        }
    }
    ctx.closePath();
    ctx.fill();
}

function undoLastStroke() {
    if (allSquibbles.length === 0) return;
    lastSquibble.push(allSquibbles.pop());
    redraw();
    // Send undo to other clients
    sendDrawingData('undo', {});
}

function redoLastStroke() {
    if (lastSquibble) {
        allSquibbles.push(lastSquibble.pop());
        redraw();
        // Send restored stroke to other clients
        sendDrawingData('stroke', allSquibbles[allSquibbles.length - 1]);
    }
}