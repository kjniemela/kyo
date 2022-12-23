const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const gameManager = require('./game');

const { ADDR_PREFIX, PORT } = require('./config');

const app = express();

app.use(`${ADDR_PREFIX}/`, express.static(path.join(__dirname, '../client')));

// app.get(`${ADDR_PREFIX}/`, (req, res) => {
//   res.send('Hello World!');
// });

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {

  gameManager.connect(ws);
  
  console.log('CONNECT')

  ws.on('message', (message) => {
    let data;

    try {
      data = JSON.parse(message);
    } catch (err) {
      console.error('Bad JSON recieved from %s', getConnData(ws).username);
      ws.send(JSON.stringify({error: ['bad JSON']}));
      return;
    }

    console.log('received:', data);
    if (data.action) gameManager.handleActions(ws, data.action);
  });
});