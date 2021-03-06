# WebRTC connection

Provides a tool to create pool of WebRTC peer connections 
using different types of signaling.

## Installation

```
npm install webrtc-connection
```

## Signaling

### WebSockets signaling

```javascript
const signaling = new SocketIoSignaling('https://signaler.local:8881', 'abc');
await signaling.prepare();
const connectionsPool = new WebRtcConnectionsPool();
const connection = connectionsPool.connect(signaling);
connection.addOnOpenCallback(() => {
    // A peer has been connected
});

connectionsPool.sendMessage('Hi!');
```

### Manual signaling

```javascript
const signaling = new ManualSignaling();
const connectionsPool = new WebRtcConnectionsPool();
const connection = connectionsPool.connect(signaling);
connection.addOnOpenCallback(() => {
    // A peer has been connected
});

signaling.bindOnOutgoingDataCallback((message) => {
    // Send this signaling message manually to any other user
});

// Apply a signaling message which was received from another user
signaling.applyRemoteResponse(remoteMessage);

connectionsPool.sendMessage('Hi!');
```

### Local signaling

Connects several peers on the same page from the same browser

```javascript
const signaling = new LocalSignaling();
const connectionsPool = new WebRtcConnectionsPool();
connectionsPool.connect(signaling);
signaling.initiate(2); // 2 - connections number
connectionsPool.sendMessage('Hi!');
```

## Using pool

### Send to all connected peers
```javascript
const connectionsPool = new WebRtcConnectionsPool();
connectionsPool.sendMessage('Hi!')
```

### Receive messages
```javascript
const connectionsPool = new WebRtcConnectionsPool();
connectionsPool.addOnMessageCallback((message, peerId) => {
    // console.log(message)
})
```

## License

The MIT License
