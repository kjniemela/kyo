let selectedTile = null
let path = []
let hasMoved = false
let hasShuffled = false

let tiles = []
let isGoldsTurn = false

let turnLog = []

const config = {
  allowUndo: false,
}

const socket = new WebSocket(`wss://hmi.dynu.net/kyo`)
let isRemoteGame = false
let isPlayingGold = false

class Tile {
  constructor(tileDiv, x, y) {
    this.tileDiv = tileDiv
    this.x = x
    this.y = y
    this.pawnStack = []
    this.liftCount = 0

    this.tileDiv.onclick = this.onClick.bind(this)
  }

  onClick(e) {
    const topChip = this.pawnStack[this.pawnStack.length-1]
    const selectedTopChip = selectedTile?.pawnStack[selectedTile?.pawnStack.length-1]

    if (isRemoteGame && isPlayingGold !== isGoldsTurn) {
      return
    }

    if ((
      (this.pawnStack.length > 0 && topChip.isGold !== isGoldsTurn) || this.pawnStack.length === 0
    ) && !selectedTile) {
      return
    }

    if (selectedTile && !(selectedTile === this)) {
      const isReturning = this === path[path.length-1] && config.allowUndo
      if (
        this.pawnStack.length > 0 &&
        !isReturning &&
        !topChip.isEnergy &&
        !selectedTopChip?.isEnergy &&
        topChip.isGold === selectedTopChip?.isGold &&
        !(hasMoved || hasShuffled) &&
        !e.ctrlKey
      ) {
        selectedTile.deselect()
      }
      else {
        if (selectedTile.canMoveTo(this.x, this.y)) {
          if ((hasMoved || hasShuffled) && !isReturning) return
          if (isReturning) {
            path.pop()
            hasMoved = false
          }
          else {
            const isFreeMove = selectedTile.isFreeMove(this.x, this.y)
            if (!isFreeMove) {
              if (path.length > 0) return
              hasMoved = true
            }
          }

          let didStrike = false
          if (this.pawnStack.length > 0 && ((
            topChip?.isGold === !selectedTopChip?.isGold && !topChip?.isEnergy
           ) || (topChip instanceof Shield && !selectedTopChip instanceof Tower))) {
            if (!this.clear(true)) return selectedTile.deselect(true)
            didStrike = true
          }

          let suspendedSelectedTopPawn = null
          let suspendedTopPawn = null
          if (!didStrike) {
            if (!selectedTopChip.isEnergy && (!topChip || topChip.isEnergy) && e.ctrlKey) {
              suspendedSelectedTopPawn = selectedTile.popPawn()
              suspendedSelectedTopPawn.unlift()
            }
            else if (topChip && selectedTopChip.isEnergy && !topChip.isEnergy) {
              suspendedTopPawn = this.popPawn()
              suspendedTopPawn.lift()
            }
            else if (topChip && !selectedTopChip.isEnergy && !topChip.isEnergy) {
              if (e.ctrlKey) {
                suspendedSelectedTopPawn = selectedTile.popPawn()
                suspendedSelectedTopPawn.unlift()
                suspendedTopPawn = this.popPawn()
                suspendedTopPawn.lift()
              }
              else if (!(topChip instanceof Shield && selectedTopChip instanceof Tower)) {
                hasMoved = false
                return
              }
            }
          }

          const movedPawns = []
          const selectedPawns = selectedTile.liftCount
          for (let i = 0; i < selectedPawns; i++) {
            movedPawns.push(selectedTile.popPawn())
          }
          for (let i = selectedPawns - 1; i >= 0; i--) {
            this.pushPawn(movedPawns[i])
          }

          if (suspendedTopPawn) {
            this.pushPawn(suspendedTopPawn)
          }
          if (suspendedSelectedTopPawn) {
            selectedTile.pushPawn(suspendedSelectedTopPawn)
          }

          if (!isReturning) path.push(selectedTile)
          selectedTile = this
          if (didStrike || e.ctrlKey) this.deselect()
          return
        }
        else {
          if (hasMoved || path.length > 0) {
            return
          }
          else {
            selectedTile.deselect()
          }
        }
      }
    }
    selectedTile = this

    if (e.shiftKey) {
      if (this.liftCount < this.pawnStack.length) {
        const pawn = this.pawnStack[this.pawnStack.length-this.liftCount-1]
        if (pawn.isGold !== isGoldsTurn && !(pawn instanceof Shield)) return
        if (this.liftCount > topChip.stackLimit) return
        this.liftCount++
        this.pawnStack[this.pawnStack.length-this.liftCount].lift()
      }
      else {
        this.deselect()
      }
    }
    else {
      if (this.liftCount > 0 + Number(e.altKey)) {
        if (e.altKey && ((!hasMoved && path.length === 0) || topChip instanceof Queen)) {
          let suspendedTopPawn
          if (!topChip.isEnergy) suspendedTopPawn = this.popPawn()
          const pawn = this.splicePawn(this.pawnStack.length-this.liftCount)
          this.pushPawn(pawn)
          if (suspendedTopPawn) this.pushPawn(suspendedTopPawn)
          if (!(topChip instanceof Queen)) hasShuffled = true
        }
        else {
          this.pawnStack[this.pawnStack.length-this.liftCount].unlift()
          this.liftCount--
          if (this.liftCount === 0) {
            this.deselect();
          }
        }
        
      }
      else {
        this.liftCount = 0
        for (let i = this.pawnStack.length - 1; i >= 0; i--) {
          const pawn = this.pawnStack[i]
          if (pawn.isGold !== isGoldsTurn && !(pawn instanceof Shield)) break
          if (this.liftCount > topChip.stackLimit) break
          pawn.lift()
          this.liftCount++
        }
      }
    }
    // console.log(this.liftCount)
  }

  canMoveTo(x, y) {
    if (Math.abs(x-this.x) <= 1 && Math.abs(y-this.y) <= 1) {
      return true
    }
    return false
  }

  isFreeMove(x, y) {
    const lastTile = path[path.length-1]
    let lastTopChip;
    if (lastTile) {
      lastTopChip = lastTile.pawnStack[lastTile.pawnStack.length-1]
    }
    const topChip = this.pawnStack[this.pawnStack.length-1]
    const newTopChip = this.pawnStack[this.pawnStack.length-this.liftCount-1]
    const isOrthogonal = !(this.x !== x && this.y !== y)
    if (newTopChip && newTopChip.isEnergy && !topChip.isEnergy) {
      if (lastTile) {
        if (isOrthogonal) {
          return newTopChip.isDark && (
            !lastTopChip.isDark || (
              lastTile.x === x || lastTile.y === y
            )
          )
        }
        else {
          return !newTopChip.isDark && (
            lastTopChip.isDark || !(
              lastTile.x === x || lastTile.y === y
            )
          )
        }
      }
      else {
        return newTopChip.isDark === isOrthogonal
      }
    }
    return false
  }
  
  deselect(forcePassTurn=false) {
    this.liftCount = 0
    this.pawnStack.forEach(pawn => pawn.unlift())
    if (path.length > 0 || forcePassTurn || hasMoved || hasShuffled) {
      passTurn()
    }
    selectedTile = null
    path = []
  }

  clear(isStrike=false) {
    const pawnCount = this.pawnStack.length;
    for (let i = 0; i < pawnCount; i++) {
      const poppedPawn = this.popPawn()
      if (isStrike && poppedPawn instanceof Shield && i === 0) {
        return this.pawnStack.length === 0
      }
    }
    return true
  }

  pushPawn(pawn) {
    if (this.pawnStack.length === 0) {
      pawn.setBottom(true)
    }
    this.pawnStack.push(pawn)
    this.tileDiv.appendChild(pawn.element)
    if (this.liftCount > 0 || pawn.lifted) {
      this.liftCount++
    }
  }

  popPawn() {
    const pawn = this.pawnStack.pop()
    this.tileDiv.removeChild(pawn.element)
    if (this.pawnStack.length === 0) {
      pawn.setBottom(false)
    }
    if (this.liftCount > 0) {
      this.liftCount--
    }
    return pawn
  }

  splicePawn(index) {
    const pawn = this.pawnStack.splice(index, 1)[0]
    this.tileDiv.removeChild(pawn.element)
    if (index === 0) {
      pawn.setBottom(false)
    }
    if (this.liftCount > 0 && pawn.lifted) {
      this.liftCount--
    }
    return pawn
  }
}

class BoardPiece {
  constructor(element) {
    this.element = element
    this.lifted = false
  }

  lift() {
    this.element.classList.add('lifted')
    this.lifted = true
  }

  unlift() {
    this.element.classList.remove('lifted')
    this.lifted = false
  }

  setBottom(state) {
    if (state) {
      this.element.classList.add('bottom')
    }
    else {
      this.element.classList.remove('bottom')
    }
  }
}

class Chip extends BoardPiece {
  constructor(type) {
    const div = document.createElement('div')
    div.classList.add('chipContainer')
    const element = document.createElement('img')
    element.classList.add(`${type}Chip`)
    element.src = `assets/pieces/${type}.png`
    div.appendChild(element)
    super(div)
    this.isChip = true
  }
}

class Shield extends Chip {
  constructor() {
    super('shield')
  }

  export() {
    return {
      type: 'shield',
    }
  }
}

class Energy extends Chip {
  constructor(isDark, isGold) {
    super(`${isDark ? 'dark' : 'light'}${isGold ? 'gold' : 'red'}`)
    this.isDark = isDark
    this.isGold = isGold
    this.isEnergy = true
  }

  export() {
    return {
      isEnergy: true,
      isDark: this.isDark,
      isGold: this.isGold,
    }
  }
}

class Pawn extends BoardPiece {
  constructor(type, isGold) {
    const element = document.createElement('img')
    element.classList.add('pawn')
    element.classList.add(type)
    element.src = `assets/pieces/${isGold ? 'gold': 'red'}${type}.png`
    super(element)
    this.type = type
    this.isGold = isGold
    this.isChip = false
    this.stackLimit = 5
  }

  export() {
    return {
      type: this.type,
      isGold: this.isGold,
    }
  }
}

class LightPawn extends Pawn {
  constructor(isGold) {
    super('lightpawn', isGold)
    this.stackLimit = 0
  }
}

class HeavyPawn extends Pawn {
  constructor(isGold) {
    super('pawn', isGold)
  }
}

class Tower extends Pawn {
  constructor(isGold) {
    super('tower', isGold)
  }
}

class Queen extends Pawn {
  constructor(isGold) {
    super('queen', isGold)
  }
}

class King extends Pawn {
  constructor(isGold) {
    super('king', isGold)
  }
}

function checkWinConditions() {
  let [redKing, goldKing, redEnergy, goldEnergy] = [false, false, false, false]
  for (const row of tiles) {
    for (const tile of row) {
      for (const pawn of tile.pawnStack) {
        if (pawn instanceof King) {
          if (pawn.isGold) goldKing = true
          else redKing = true
        }
        else if (pawn instanceof Energy) {
          if (pawn.isGold) goldEnergy = true
          else redEnergy = true
        }
      }
    }
  }
  if (!(redKing && redEnergy)) gameOver(true)
  else if (!(goldKing && goldEnergy)) gameOver(false)
}

function gameOver(goldWon) {
  isGoldsTurn === null
  document.getElementById('turn').innerText = `${goldWon ? 'Gold' : 'Red'} has won!`
}

function passTurn() {
  if (selectedTile) {
    const minPath = path.map(tile => [tile.x, tile.y])
    minPath.push([selectedTile.x, selectedTile.y])
    turnLog.push(minPath)
  }
  if (isRemoteGame && isPlayingGold === isGoldsTurn) {
    pushBoardState()
  }
  isGoldsTurn = !isGoldsTurn
  selectedTile = null
  path = []
  hasMoved = false
  hasShuffled = false
  document.getElementById('turn').innerText = `${isGoldsTurn ? 'Gold' : 'Red'} is taking their turn...`
  renderTurnLog()
  if (!isRemoteGame) {
    checkWinConditions()
  }
}

function pushBoardState() {
  const state = tiles.map(row => (
    row.map(tile => (
      tile.pawnStack.map(pawn => pawn.export())
    ))
  ))
  sendActions([['pushBoardState', [state, turnLog]]])
}

const pawnTypeMap = {
  'lightpawn': LightPawn,
  'pawn': HeavyPawn,
  'tower': Tower,
  'queen': Queen,
  'king': King,
}

function applyBoardState(state, log) {
  console.log('APPLY STATE', state)
  turnLog = log
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const updates = state[i][j]
      const tile = tiles[i][j]
      tile.clear()
      // console.log(tile)
      for (const pawn of updates) {
        // console.log(pawn)
        if (pawn.isEnergy) {
          tile.pushPawn(new Energy(pawn.isDark, pawn.isGold))
        }
        else if (pawn.type === 'shield') {
          tile.pushPawn(new Shield())
        }
        else {
          tile.pushPawn(new pawnTypeMap[pawn.type](pawn.isGold))
        }
      }
    }
  }
}

function onSocketMsg(data) {
  if (data.update) {
    for (const [update, args] of data.update) {
      console.log(update, args)
      switch (update) {
        case 'connected':
          isRemoteGame = true
          isPlayingGold = args[1]
          resetBoard()
          break
        case 'disconnected':
          isRemoteGame = false
          isPlayingGold = false
          resetBoard()
          break
        case 'passTurn':
          applyBoardState(args[0], args[1])
          passTurn()
          break
        case 'gameWon':
          isGoldsTurn === null
          document.getElementById('turn').innerText = `You have won!`
          break
        case 'gameLost':
          isGoldsTurn === null
          document.getElementById('turn').innerText = `You have lost!`
          break
      }
    }
  }
  if (data.error) {
    for (const [error, args] of data.error) {
      console.log(error, args)
      switch (error) {
        case 'loginRequired':
          setUsername()
          sendActions([args])
          break
        case 'disconnectRequired':
          if (confirm('Must disconnect from game to complete action. OK to disconnect?')) {
            disconnectFromGame()
            sendActions([args])
          }
          break
      }
    }
  }
}

function sendActions(actions) {
  socket.send(JSON.stringify({
    action: actions,
  }))
}

function connectToGame() {
  const gameID = prompt('Please enter the ID of the game you want to connect to. If the game does not exist, one will be created - your opponent can then join by entering the same ID.')
  sendActions([['connect', [gameID]]])
  document.getElementById('reset').disabled = true
  document.getElementById('connect').disabled = true
  document.getElementById('disconnect').disabled = false
}

function disconnectFromGame() {
  sendActions([['disconnect', []]])
  document.getElementById('reset').disabled = false
  document.getElementById('connect').disabled = false
  document.getElementById('disconnect').disabled = true
}

function setUsername() {
  const username = prompt('Username?')
  sendActions([['login', [username]]])
  document.getElementById('user').innerText = `Logged in as ${username}`
  document.getElementById('switchUser').innerText = 'Switch User'
}

function toRoman(i) {
  // really cheap and hacky...
  return [
    'I',
    'II',
    'III',
    'IV',
    'V',
    'VI',
    'VI',
    'VIII',
    'IX',
    'X',
  ][i-1]
}

function toAlphabet(i) {
  // really cheap and hacky...
  return 'ABCDEFGHIJ'[i]
}

function createLabel(i, pos) {
  const labelDiv = document.createElement('div')
  labelDiv.classList.add('boardTile')
  labelDiv.classList.add('boardLabel')
  labelDiv.classList.add(pos)
  const label = document.createElement('span')
  label.innerText = (pos === 'top' || pos === 'bottom') ? toAlphabet(i) : i
  labelDiv.appendChild(label)
  return labelDiv
}

function renderTurnLog() {
  const list = document.getElementById('turnlog')
  list.innerHTML = ''
  for (const path of turnLog) {
    const item = document.createElement('li')
    item.classList.add('logItem')
    item.innerText = path.map(([x, y]) => `${toAlphabet(x)}${y}`).join(' → ')
    list.appendChild(item)
  }
}

function resetBoard() {
  const board = document.getElementById('board')
  board.innerHTML = ''

  tiles = []
  isGoldsTurn = false

  const appendFn = isPlayingGold ? 'prepend' : 'append'

  for (let i = 0; i < 10; i++) {
    const row = document.createElement('div')
    row.classList.add('boardRow')
    tiles.push([])
    for (let j = 0; j < 10; j++) {
      const tileDiv = document.createElement('div')
      tileDiv.classList.add('boardTile')
      tileDiv.classList.add((j + i) % 2 ? 'darkTile' : 'lightTile')
      tiles[i].push(new Tile(tileDiv, j, i))
      if (i === 0) {
        tileDiv[appendFn](createLabel(j, isPlayingGold ? 'bottom' : 'top'))
      }
      else if (i === 9) {
        tileDiv[appendFn](createLabel(j, isPlayingGold ? 'top' : 'bottom'))
      }
      row[appendFn](tileDiv)
    }
    row[appendFn](createLabel(i, 'right'))
    row[appendFn](createLabel(i, 'left'))
    board[appendFn](row)
  }

  /* Add Gold's Energy */
  // Dark
  tiles[0][0].pushPawn(new Energy(true, true))
  tiles[0][0].pushPawn(new Energy(true, true))
  tiles[0][0].pushPawn(new Energy(true, true))
  tiles[0][9].pushPawn(new Energy(true, true))
  tiles[0][9].pushPawn(new Energy(true, true))
  tiles[0][9].pushPawn(new Energy(true, true))
  tiles[0][1].pushPawn(new Energy(true, true))
  tiles[0][1].pushPawn(new Energy(true, true))
  tiles[0][8].pushPawn(new Energy(true, true))
  tiles[0][8].pushPawn(new Energy(true, true))
  tiles[0][2].pushPawn(new Energy(true, true))
  tiles[0][7].pushPawn(new Energy(true, true))
  tiles[0][5].pushPawn(new Energy(true, true))
  // Light
  tiles[0][3].pushPawn(new Energy(false, true))
  tiles[0][3].pushPawn(new Energy(false, true))
  tiles[0][3].pushPawn(new Energy(false, true))
  tiles[0][6].pushPawn(new Energy(false, true))
  tiles[0][6].pushPawn(new Energy(false, true))
  tiles[0][6].pushPawn(new Energy(false, true))
  tiles[0][2].pushPawn(new Energy(false, true))
  tiles[0][2].pushPawn(new Energy(false, true))
  tiles[0][7].pushPawn(new Energy(false, true))
  tiles[0][7].pushPawn(new Energy(false, true))
  tiles[0][1].pushPawn(new Energy(false, true))
  tiles[0][8].pushPawn(new Energy(false, true))
  tiles[0][5].pushPawn(new Energy(false, true))
  
  /* Add Red's Energy */
  // Dark
  tiles[9][0].pushPawn(new Energy(true, false))
  tiles[9][0].pushPawn(new Energy(true, false))
  tiles[9][0].pushPawn(new Energy(true, false))
  tiles[9][9].pushPawn(new Energy(true, false))
  tiles[9][9].pushPawn(new Energy(true, false))
  tiles[9][9].pushPawn(new Energy(true, false))
  tiles[9][1].pushPawn(new Energy(true, false))
  tiles[9][1].pushPawn(new Energy(true, false))
  tiles[9][8].pushPawn(new Energy(true, false))
  tiles[9][8].pushPawn(new Energy(true, false))
  tiles[9][2].pushPawn(new Energy(true, false))
  tiles[9][7].pushPawn(new Energy(true, false))
  tiles[9][5].pushPawn(new Energy(true, false))
  // Light
  tiles[9][3].pushPawn(new Energy(false, false))
  tiles[9][3].pushPawn(new Energy(false, false))
  tiles[9][3].pushPawn(new Energy(false, false))
  tiles[9][6].pushPawn(new Energy(false, false))
  tiles[9][6].pushPawn(new Energy(false, false))
  tiles[9][6].pushPawn(new Energy(false, false))
  tiles[9][2].pushPawn(new Energy(false, false))
  tiles[9][2].pushPawn(new Energy(false, false))
  tiles[9][7].pushPawn(new Energy(false, false))
  tiles[9][7].pushPawn(new Energy(false, false))
  tiles[9][1].pushPawn(new Energy(false, false))
  tiles[9][8].pushPawn(new Energy(false, false))
  tiles[9][5].pushPawn(new Energy(false, false))

  /* Add Shields */
  tiles[0][4].pushPawn(new Shield())
  tiles[0][4].pushPawn(new Shield())
  tiles[0][4].pushPawn(new Shield())
  tiles[9][4].pushPawn(new Shield())
  tiles[9][4].pushPawn(new Shield())
  tiles[9][4].pushPawn(new Shield())
  tiles[0][5].pushPawn(new Shield())
  tiles[9][5].pushPawn(new Shield())
  // Tower Shields
  tiles[1][4].pushPawn(new Shield())
  tiles[1][4].pushPawn(new Shield())
  tiles[1][5].pushPawn(new Shield())
  tiles[1][5].pushPawn(new Shield())
  tiles[8][4].pushPawn(new Shield())
  tiles[8][4].pushPawn(new Shield())
  tiles[8][5].pushPawn(new Shield())
  tiles[8][5].pushPawn(new Shield())

  /* Add Pawns */
  // Light & Heavy Pawns
  for (let i = 0; i < 4; i++) {
    tiles[1][i].pushPawn(new LightPawn(true))
    tiles[8][i].pushPawn(new LightPawn(false))
    tiles[1][9-i].pushPawn(new LightPawn(true))
    tiles[8][9-i].pushPawn(new LightPawn(false))
    tiles[0][i].pushPawn(new HeavyPawn(true))
    tiles[9][i].pushPawn(new HeavyPawn(false))
    tiles[0][9-i].pushPawn(new HeavyPawn(true))
    tiles[9][9-i].pushPawn(new HeavyPawn(false))
  }
  // Towers
  tiles[1][4].pushPawn(new Tower(true))
  tiles[1][5].pushPawn(new Tower(true))
  tiles[8][4].pushPawn(new Tower(false))
  tiles[8][5].pushPawn(new Tower(false))
  // Queens
  tiles[0][5].pushPawn(new Queen(true))
  tiles[9][5].pushPawn(new Queen(false))
  // Kings
  tiles[0][4].pushPawn(new King(true))
  tiles[9][4].pushPawn(new King(false))

  passTurn()
}

socket.onopen = (event) => {}

socket.onmessage = (event) => {
  let data
  try {
    data = JSON.parse(event.data)
  } catch (err) {
    console.error('Bad JSON recieved from server')
    return
  }
  onSocketMsg(data)
}