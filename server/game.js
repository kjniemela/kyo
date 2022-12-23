class Game {
  constructor(id) {
    this.id = id;
    this.goldPlayer = null;
    this.redPlayer = null;
    this.boardState = [];
    this.isGoldsTurn = true;
  }

  connectPlayer(player) {
    if (this.goldPlayer === null) {
      this.goldPlayer = player;
      player.setConnData({ gameID: this.id });
      return [true, true];
    } else if (this.redPlayer === null) {
      this.redPlayer = player;
      player.setConnData({ gameID: this.id });
      return [true, false];
    } else {
      return [false, false];
    }
  }
}

class Player {
  constructor(connData) {
    this.connData = connData
  }

  setConnData(data) {
    this.connData = {
      ...this.connData,
      ...data,
    }
  }

  send(data) {
    this.connData.ws.send(JSON.stringify(data));
  }
}

class Manager {
  constructor() {
    this.connections = [];
    this.players = [];
    this.games = {};
  }

  getPlayer(ws) {
    const playerIndex = this.connections.indexOf(ws);
    return this.players[playerIndex];
  }

  setPlayerData(ws, data) {
    const playerIndex = this.connections.indexOf(ws);
    this.players[playerIndex].setConnData(data);
  }

  sendTo(ws, data) {
    ws.send(JSON.stringify(data));
  }

  connect(ws) {
    this.connections.push(ws);
    this.players.push(new Player({
      ws: ws,
      username: null,
      gameID: null,
    }));
  }

  connectToGame(player, gameID) {
    if (!(gameID in this.games)) this.games[gameID] = new Game(gameID);
    return this.games[gameID].connectPlayer(player);
  }

  handleActions(ws, actions) {
    const player = this.getPlayer(ws);
    const { username, gameID } = player.connData;
    for (const [action, args] of actions) {
      console.log(action, args, username, gameID)
      switch (action) {
        case 'connect':
          if (username) {
            if (args[0] === gameID) break;
            const [success, isGold] = this.connectToGame(player, args[0]);
            if (success) this.sendTo(ws, { update: [['connect', [args[0], isGold]]] });
            else player.send({ error: [['connectRefused', [args[0]]]] });
          } else {
            player.send({ error: [['loginRequired', [action, args]]] });
          }
          break;
        case 'disconnect':
          if (gameID !== null) {
            this.setPlayerData(ws, { gameID: null });
            player.send({ update: [['disconnected', []]] });
          }
          break;
        case 'login':
          if (gameID === null) {
            if (args[0] === username) break;
            this.setPlayerData(ws, { username: args[0] });
            player.send({ update: [['login', [args[0]]]] });
          } else {
            player.send({ error: [['disconnectRequired', [action, args]]] });
          }
          break;
      }
    }
  }
}

module.exports = new Manager()