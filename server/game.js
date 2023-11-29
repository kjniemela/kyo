const crypto = require('crypto');

class Game {
  constructor(id, config) {
    this.id = id;
    this.goldPlayer = null;
    this.redPlayer = null;
    this.boardState = [];
    this.turnLog = [];
    this.isGoldsTurn = true;
    this.config = config;
  }

  connectPlayer(player) {
    if (this.goldPlayer === null) {
      this.goldPlayer = player;
      player.setConnData({ gameID: this.id });
      return [true, true];
    }
    else if (this.redPlayer === null) {
      this.redPlayer = player;
      player.setConnData({ gameID: this.id });
      return [true, false];
    }
    else {
      return [false, false];
    }
  }

  tryBeginGame() {
    if (this.goldPlayer && this.redPlayer) {
      this.sendTo(true, { update: [['beginGame', [this.config]]] });
      this.sendTo(false, { update: [['beginGame', [this.config]]] });
    }
  }

  sendTo(toGold, data) {
    if (toGold && this.goldPlayer) this.goldPlayer.send(data);
    else if (this.redPlayer) this.redPlayer.send(data);
  }

  pushBoardState(player, state, log) {
    if ((player === this.goldPlayer) === this.isGoldsTurn) {
      this.isGoldsTurn = !this.isGoldsTurn;
      this.boardState = state;
      this.turnLog = log;
      this.sendTo(this.isGoldsTurn, { update: [['passTurn', [this.boardState, this.turnLog]]] });
      this.checkWinConditions();
    }
  }

  checkWinConditions() {
    let [redKing, goldKing, redEnergy, goldEnergy] = [false, false, false, false];
    for (const row of this.boardState) {
      for (const tile of row) {
        for (const pawn of tile) {
          if (pawn.type === 'king') {
            if (pawn.isGold) goldKing = true;
            else redKing = true;
          }
          else if (pawn.isEnergy) {
            if (pawn.isGold) goldEnergy = true;
            else redEnergy = true;
          }
        }
      }
    }
    if (!(redKing && redEnergy)) this.win(true);
    else if (!(goldKing && goldEnergy)) this.win(false);
  }

  win(isGold) {
    if (isGold) {
      this.sendTo(true, { update: [['gameWon', []]] });
      this.sendTo(false, { update: [['gameLost', []]] });
    }
    else {
      this.sendTo(false, { update: [['gameWon', []]] });
      this.sendTo(true, { update: [['gameLost', []]] });
    }
  }

  forfeit(player) {
    this.sendTo(true, { update: [['gameForfeit', []]] });
    this.sendTo(false, { update: [['gameForfeit', []]] });
    if (player === this.goldPlayer) this.win(false);
    else this.win(true);
  }

  close() {
    if (this.goldPlayer) this.goldPlayer.connData.gameID = null;
    if (this.redPlayer) this.redPlayer.connData.gameID = null;
  }
}

class Player {
  constructor(connData) {
    this.connData = connData
    this.pingInterval = setInterval(this.ping.bind(this), 10_000)
  }

  ping() {
    const { ws } = this.connData
    if (ws) {
      ws.ping()
    }
  }

  close() {
    clearInterval(this.pingInterval);
    this.pingInterval = null;
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
      gameID: null,
    }));
  }

  disconnect(ws) {
    const playerIndex = this.connections.indexOf(ws);
    const player = this.players[playerIndex];

    if (player.connData.gameID) {
      this.handleActions(ws, [['disconnect']]);
    }

    player.close();
    delete this.connections[playerIndex];
    delete this.players[playerIndex];
  }

  connectToGame(player, gameID) {
    if (!(gameID in this.games)) return [false];
    return this.games[gameID].connectPlayer(player);
  }

  handleActions(ws, actions) {
    const player = this.getPlayer(ws);
    const { gameID } = player.connData;
    for (const [action, args] of actions) {
      // console.log(action, args, gameID)
      console.log(action, this.connections.indexOf(ws))
      switch (action) {
        case 'newGame':
          const newGameID = crypto.randomUUID();
          this.games[newGameID] = new Game(newGameID, args[0]);
          player.send({ update: [['newGame', [newGameID]]] });
          break;
        case 'connect':
          if (args[0] === gameID) break;
          const [success, isGold] = this.connectToGame(player, args[0]);
          if (success) {
            this.sendTo(ws, { update: [['connected', [args[0], isGold]]] });
            this.games[args[0]].tryBeginGame();
          }
          else player.send({ error: [['connectRefused', [args[0]]]] });
          break;
        case 'disconnect':
          if (gameID !== null && gameID in this.games) {
            this.games[gameID].forfeit(player);
            this.games[gameID].close();
            delete this.games[gameID];
            player.send({ update: [['disconnected', []]] });
          }
          break;
        case 'pushBoardState':
          if (gameID in this.games) {
            this.games[gameID].pushBoardState(player, args[0], args[1])
          }
          break;
      }
    }
  }
}

module.exports = new Manager()