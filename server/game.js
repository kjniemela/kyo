class Game {
  constructor(id) {
    this.id = id;
    this.goldPlayer = null;
    this.redPlayer = null;
    this.boardState = [];
    this.turnLog = [];
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
          } else if (pawn.isEnergy) {
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
    } else {
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
            if (success) this.sendTo(ws, { update: [['connected', [args[0], isGold]]] });
            else player.send({ error: [['connectRefused', [args[0]]]] });
          } else {
            player.send({ error: [['loginRequired', [action, args]]] });
          }
          break;
        case 'disconnect':
          if (gameID !== null) {
            this.games[gameID].forfeit(player);
            this.setPlayerData(ws, { gameID: null });
            delete this.games[gameID];
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