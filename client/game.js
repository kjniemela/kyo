let selectedTile = null
let path = []
let hasMoved = false
let hasShuffled = false

let tiles = []
let isGoldsTurn = false

let turnLog = []

const config = {
  allowUndo: false,
  startPos: 'middle',
  ruleset: 'new',
}

const urlGameId = location.hash.substring(1)

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

    // If we're in a multiplayer game and it is not our turn, we should not be able to move any pawns.
    if (isRemoteGame && isPlayingGold !== isGoldsTurn) {
      return
    }

    // If there are no pawns, or if the pawns on this tile don't belong to the active player, return.
    if ((
      (this.pawnStack.length > 0 && topChip.isGold !== isGoldsTurn) || this.pawnStack.length === 0
    ) && !selectedTile) {
      return
    }

    // If we have a stack selected:
    if (selectedTile && !(selectedTile === this)) {
      const isReturning = this === path[path.length-1]?.[0] && config.allowUndo
      if (
        this.pawnStack.length > 0 && // if the clicked tile is occupied and
        !isReturning && // if this is not an "undo" move and
        !topChip.isEnergy && // if the top of the clicked stack is anything other than an energy chip and
        !selectedTopChip?.isEnergy && // if the top of the selected stack is anything other than an energy chip and
        topChip.isGold === selectedTopChip?.isGold && // the selected and clicked stacks belong to the same player and
        !(hasMoved || hasShuffled) && // if the player has neither made a move nor shuffled their stack and
        !e.ctrlKey // if the player is not attempting to make a "shoot out" move
      ) {
        // then, we have clicked a tile that contains one of our own pawns that we cannot move onto.
        // We should simply deselect the selected tile and instead select the clicked tile.
        selectedTile.deselect()
      }
      else {
        // Otherwise, check if the move would be valid.
        if (selectedTile.canMoveTo(this.x, this.y)) {
          if ((hasMoved || hasShuffled) && !isReturning) return // If we have already moved or shuffled, and this is not an undo, return.
          if (isReturning) {
            path.pop()
            hasMoved = false
          }
          else {
            // If this move does not satisfy the rules for a "free" move, make sure we won't get to move again.
            const isFreeMove = selectedTile.isFreeMove(this.x, this.y)
            if (!isFreeMove) {
              if (path.length > 0) return
              hasMoved = true
            }
          }

          // STRIKE LOGIC
          let didStrike = false
          if (
            this.pawnStack.length > 0 && // striking requries, by definition, that the clicked tile has pawns on it
            !selectedTopChip?.isEnergy && // you cannot strike using an energy stack
            ( // you can only strike enemy pawns and shields
              topChip instanceof Shield ||
              topChip?.isGold === !selectedTopChip?.isGold
            ) &&
            !topChip?.isEnergy && // you cannot strike enemy energy stacks, this is handled later
            ( // towers do not strike shields, they simply move on top of them
              !(topChip instanceof Shield) ||
              !(selectedTopChip instanceof Tower)
            )
          ) {
            // Light Pawns can only attack if they "outnumber" their opponent
            if (selectedTopChip.type === 'lightpawn') {
              const attackers = this.countAdjacent((stack) => stack.length && stack[stack.length-1].isGold === selectedTopChip.isGold)
              const defenders = selectedTile.countAdjacent((stack) => stack.length && stack[stack.length-1].isGold === topChip.isGold)
              if (attackers <= defenders) {
                hasMoved = false
                return
              };
            }
            // If we struck a shield or the attack failed, end turn.
            if (!this.clear(true)) return selectedTile.deselect(true)
            didStrike = true
          }

          let suspendedSelectedTopPawn = null
          let suspendedTopPawn = null
          // This handles "suspended" pawns. Basically, it deals with any moves that would either:
          if (!didStrike) {
            // 1. Move the chips under a pawn but not the pawn itself.
            if (!selectedTopChip.isEnergy && (!topChip || topChip.isEnergy) && e.ctrlKey) {
              suspendedSelectedTopPawn = selectedTile.popPawn()
              suspendedSelectedTopPawn.unlift()
            }
            // 2. Move stack of chips onto a tile that already has a pawn.
            else if (topChip && selectedTopChip.isEnergy && !topChip.isEnergy) {
              suspendedTopPawn = this.popPawn()
              suspendedTopPawn.lift()
            }
            else if (topChip && !selectedTopChip.isEnergy && !topChip.isEnergy) {
              // 3. Both.
              if (e.ctrlKey) {
                suspendedSelectedTopPawn = selectedTile.popPawn()
                suspendedSelectedTopPawn.unlift()
                suspendedTopPawn = this.popPawn()
                suspendedTopPawn.lift()
              }
              // In any other case, if there are pawns on both tiles, we must have somehow made an illegal move.
              // The only exception is if we're a tower moving onto a shield.
              else if (!(topChip instanceof Shield && selectedTopChip instanceof Tower)) {
                hasMoved = false
                return
              }
            }
          }

          // Actually any pawns/chips to be moved.
          const movedPawns = []
          const selectedPawns = selectedTile.liftCount
          const isFreeMove = selectedTile.isFreeMove(this.x, this.y)
          for (let i = 0; i < selectedPawns; i++) {
            movedPawns.push(selectedTile.popPawn())
          }
          for (let i = selectedPawns - 1; i >= 0; i--) {
            this.pushPawn(movedPawns[i])
          }

          // Handled the "suspended" pawn.
          if (suspendedTopPawn) {
            this.pushPawn(suspendedTopPawn)
          }
          const availableEnergy = selectedTile.availableEnergy(isGoldsTurn, selectedTopChip)
          let isShootOutMove = false
          if (suspendedSelectedTopPawn) {
            isShootOutMove = true
            selectedTile.pushPawn(suspendedSelectedTopPawn)
          }

          // Add the selected tile to the path.
          if (!isReturning) path.push([
            selectedTile,
            selectedPawns-1,
            availableEnergy,
            isFreeMove,
            isShootOutMove,
          ])
          selectedTile = this
          if (didStrike || e.ctrlKey) this.deselect()
          return
        }
        // If we made a move that would clearly not be valid, return if we have already moved,
        // otherwise just deselect the tile and let us try to move again.
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
    // If we have gotten to this point, we either failed to make a move or never even tried to in the first place.
    // In either case, the clicked tile becomes the selected tile after this point.
    selectedTile = this

    // If the shift key is pressed, lift up the chips underneath our pawn one by one.
    if (e.shiftKey) {
      if (this.liftCount < this.pawnStack.length) {
        const pawn = this.pawnStack[this.pawnStack.length-this.liftCount-1]
        if (pawn.isGold !== isGoldsTurn && !(pawn instanceof Shield)) return // We can only lift our own chips.
        if (this.liftCount > topChip.stackLimit) return // We cannot lift more chips than the pawn's stack limit, if it has one.
        this.liftCount++
        this.pawnStack[this.pawnStack.length-this.liftCount].lift()
      }
      else {
        // If we have already lifed all chips, drop them all back down and start over.
        this.deselect()
      }
    }
    else {
      // If we have any pawns lifted, handle that
      if (this.liftCount > 0 + Number(e.altKey)) { // (If the alt key is pressed, we don't count the top pawn)
        // If the alt key is pressed and we are allowed to shuffle our stack, do that.
        if (e.altKey && ((!hasMoved && (path.length === 0 || path[path.length - 1][1] === 'shuffle')) || topChip instanceof Queen)) {
          let suspendedTopPawn
          if (!topChip.isEnergy) suspendedTopPawn = this.popPawn()
          const oldOrder = path[path.length - 1]?.[1] === 'shuffle'
            ? path[path.length - 1][3]
            : this.pawnStack.map(pawn => pawn.isDark)
          const pawn = this.splicePawn(this.pawnStack.length-this.liftCount)
          this.pushPawn(pawn)
          const newOrder = this.pawnStack.map(pawn => pawn.isDark)
          const orderDiff = []
          let foundChanges = false
          newOrder.forEach((val, i) => {
            if (val !== oldOrder[i]) foundChanges = true
            if (foundChanges) orderDiff.push(val)
          })
          console.log(oldOrder, newOrder, orderDiff)
          if (!(topChip instanceof Queen)) hasShuffled = true
          if (path[path.length - 1]?.[1] === 'shuffle') {
            if (orderDiff.length === 0) {
              path.pop()
              hasShuffled = false
            }
            else path[path.length - 1][2] = orderDiff
          }
          else {
            path.push([undefined, 'shuffle', orderDiff, oldOrder])
          }
          if (suspendedTopPawn) this.pushPawn(suspendedTopPawn)
        }
        // Otherwise, put one chip down.
        else {
          this.pawnStack[this.pawnStack.length-this.liftCount].unlift()
          this.liftCount--
          if (this.liftCount === 0) {
            this.deselect();
          }
        }
        
      }
      // Otherwise, if we have no pawns lifted, lift them all back up.
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
  }

  canMoveTo(x, y) {
    if (Math.abs(x-this.x) <= 1 && Math.abs(y-this.y) <= 1) {
      return true
    }
    return false
  }

  countAdjacent(filter) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if ((i || j)) {
          const [x, y] = [this.x+i, this.y+j];
          if (
            x > 0 && x < 10 &&
            y > 0 && y < 10
          ) {
            const tile = tiles[y][x];
            if (filter(tile.pawnStack)) count++;
          }
        }
      }
    }
    return count;
  }

  isFreeMove(x, y) {
    const lastTile = path[path.length-1]?.[0]
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

  availableEnergy(isGold, movingPawn) {
    let count = 0
    for (let i = this.pawnStack.length - 1; i >= 0; i--) {
      const pawn = this.pawnStack[i]
      if (
        (pawn instanceof Shield && movingPawn instanceof Tower) ||
        (pawn.isGold === isGold && pawn.isEnergy)
      ) {
        count++
      }
      else {
        break
      }
    }
    return count
  }
  
  deselect(forcePassTurn=false) {
    this.liftCount = 0
    this.pawnStack.forEach(pawn => pawn.unlift())
    if (path.length > 0 || forcePassTurn || hasMoved || hasShuffled) {
      // Since the turn is now definitely over, let's handle destroying enemy roads.
      if (path.length > 0 && !this.pawnStack[this.pawnStack.length - 1].isEnergy) {
        const topPawn = this.pawnStack[this.pawnStack.length - 1]
        const [, carry] = path[path.length - 1]
        for (let i = this.pawnStack.length - carry - 2; i >= 0; i--) {
          const chip = this.pawnStack[i]
          if (chip.isGold === topPawn.isGold) break
          this.splicePawn(i)
        }
      }
      passTurn()
    }
    selectedTile = null
    path = []
  }

  clear(isStrike=false) {
    const pawnCount = this.pawnStack.length;
    const topPawn = this.pawnStack[this.pawnStack.length - 1]
    for (let i = 0; i < pawnCount; i++) {
      if (isStrike && (
        this.pawnStack[this.pawnStack.length - 1].isGold !== topPawn.isGold ||
        this.pawnStack[this.pawnStack.length - 1] instanceof Shield
      )) {
        break
      }
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
    const minPath = path.map(([tile, ...data]) => tile ? [tile.x, tile.y, ...data] : [...data])
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

function comparePawnState(pawn, state) {
  return (
    (
      (!pawn && !state) || (pawn && state)
    ) &&
    pawn.isGold === state.isGold &&
    pawn.isEnergy === state.isEnergy &&
    pawn.isDark === state.isDark &&
    (
      pawn.type === state.type ||
      (pawn instanceof Shield && state.type === 'shield')
    )
  )
}

function compareStacks(pawnStack, state) {
  let areAllEqual = true
  for (let i = 0; i < Math.max(pawnStack.length, state.length); i++) {
    areAllEqual &&= comparePawnState(pawnStack[i], state[i])
  }
  return areAllEqual
}

function applyBoardState(state, log) {
  console.log('APPLY STATE', state)
  turnLog = log
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const newState = state[i][j]
      const tile = tiles[i][j]
      if (compareStacks(tile.pawnStack, newState)) continue
      console.log(tile.pawnStack)
      tile.clear()
      for (const pawn of newState) {
        console.log(pawn)
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

async function onSocketMsg(data) {
  if (data.update) {
    for (const [update, args] of data.update) {
      console.log(update, args)
      switch (update) {
        case 'newGame':
          await joinNewGame(args[0])
          break
        case 'connected':
          isRemoteGame = true
          isPlayingGold = args[1]
          document.getElementById('turn').innerText = `Waiting for ${isGoldsTurn ? 'red' : 'gold'} player to connect...`
          document.getElementById('user').innerText = `Connected as ${isPlayingGold ? 'gold' : 'red'} player`
          resetBoard(true)
          break
        case 'beginGame':
          for (const key in args[0]) {
            config[key] = args[0][key];
          }
          resetBoard()
          break
        case 'disconnected':
          isRemoteGame = false
          isPlayingGold = false
          break
        case 'passTurn':
          applyBoardState(args[0], args[1])
          passTurn()
          break
        case 'gameWon':
          isGoldsTurn === null
          document.getElementById('turn').innerText = `You have won!`
          disconnectFromGame()
          break
        case 'gameLost':
          isGoldsTurn === null
          document.getElementById('turn').innerText = `You have lost!`
          disconnectFromGame()
          break
      }
    }
  }
  if (data.error) {
    for (const [error, args] of data.error) {
      console.log(error, args)
      switch (error) {
        case 'disconnectRequired':
          if (confirm('Must disconnect from game to complete action. OK to disconnect?')) {
            disconnectFromGame()
            sendActions([args])
          }
          break
        case 'connectRefused':
          await textDialog([
            ['p', 'An error occurred whilst connecting to this game - it may already be full, or no longer exists. Try creating a new one.']
          ])
          location.href = `https://${location.host}${location.pathname}`;
          break
      }
    }
  }
}

function sendActions(actions) {
  if (socket.readyState === socket.CLOSED || socket.readyState === socket.CLOSING) {
    textDialog([
      ['p', 'Failed to connect to the multiplayer server - reloading the page may fix this problem, but if it persists, please contact a site admin at contact@hmistudios.com.']
    ], 'Reload').then(() => location.reload())
  }
  else {
    socket.send(JSON.stringify({
      action: actions,
    }))
  }
}

function createElement(type, { classes, attributes, children }) {
  const el = document.createElement(type);
  if (classes) {
    for (const c of classes) {
      el.classList.add(c);
    }
  }
  if (attributes) {
    for (const attr in attributes) {
      el[attr] = attributes[attr];
    }
  }
  if (children) {
    for (const child of children) {
      el.appendChild(child);
    }
  }
  return el;
}

function textDialog(lines, okBtnText) {
  return new Promise((resolve, reject) => {
    const dialogShadow = document.getElementById('dialogShadow');
    const dialog = document.getElementById('dialog');

    dialog.innerHTML = '';
    dialog.appendChild(createElement('div', { children: [
      ...lines.map(([type, text]) => createElement(
        type,
        {
          attributes: { innerText: text },
        }
      )),
      createElement('div', { children: [
        createElement('button', { classes: ['btn'], attributes: {
          innerText: okBtnText ?? 'Ok',
          onclick: () => {
            dialogShadow.classList.add('hidden');
            resolve();
          },
        } }),
      ] }),
    ] }));
    
    dialogShadow.classList.remove('hidden');
  });
}

async function joinNewGame(gameID) {
  const URL = `https://${location.host}${location.pathname}#${gameID}`;

  await new Promise((resolve, reject) => {
    const dialogShadow = document.getElementById('dialogShadow');
    const dialog = document.getElementById('dialog');

    dialog.innerHTML = '';
    dialog.appendChild(createElement('div', { children: [
      createElement('p', { attributes: {
        innerText: 'Send the link below to your opponent to let them join your game:',
      } }),
      createElement('blockquote', { attributes: {
        innerText: URL,
      } }),
      createElement('div', { children: [
        createElement('button', { classes: ['btn'], attributes: {
          innerText: 'Ok',
          onclick: () => {
            dialogShadow.classList.add('hidden');
            resolve();
          },
        } }),
      ] }),
    ] }));
    
    dialogShadow.classList.remove('hidden');
  });

  location.href = URL;
  sendActions([['connect', [gameID]]])
}

function newOnlineGame() {
  sendActions([['newGame', [config]]])
  document.getElementById('connect').disabled = true
  document.getElementById('disconnect').disabled = false
  document.getElementById('settings').disabled = true
}

function disconnectFromGame() {
  sendActions([['disconnect', []]])
  document.getElementById('connect').disabled = false
  document.getElementById('disconnect').disabled = true
  document.getElementById('settings').disabled = false
  location.hash = '';
}

function createSelect(name, label, options, selected, onchange) {
  return createElement('div', { classes: ['selectBox'], children: [
    createElement('label', { attributes: { for: name, innerText: label } }),
    createElement('select', { attributes: { name, onchange: (e) => onchange(e.target.value) }, children: [
      ...options.map(([value, text]) => 
        createElement('option', { attributes: { value, innerText: text, selected: (value === selected) } }),
      ),
    ] }),
  ] });
}

function openSettings() {
  const dialogShadow = document.getElementById('dialogShadow');
  const dialog = document.getElementById('dialog');

  const startPosDescs = {
    rear: 'The Pawns start lined up on rows 1 and 8, directly in front of the Heavies.',
    middle: 'The Pawns start lined up on rows 3 and 6, leaving a no man\'s land in between.',
    front: 'The Pawns start lined up on rows 4 and 5, directly facing each other.',
  };

  dialog.innerHTML = '';
  dialog.appendChild(createElement('div', { classes: [
    'flex',
    'flex-column',
    'gap-1',
  ], children: [
    createSelect('ruleset', 'Ruleset:', [
      ['classic', 'Classic Kyo'],
      ['new', 'New Kyo'],
    ], config.ruleset, (value) => {
      config.ruleset = value;
    }),
    createSelect('startPos', 'Starting Positions:', [
      ['rear', 'Open Field'],
      ['middle', 'Trench'],
      ['front', 'Deadlock'],
    ], config.startPos, (value) => {
      config.startPos = value;
      document.getElementById('startPosDesc').innerText = startPosDescs[config.startPos];
    }),
    createElement('blockquote', { classes: ['mt-0', 'mx-1', 'ml-4'], attributes: { id: 'startPosDesc', innerText: startPosDescs[config.startPos] } }),
    createElement('div', { children: [
      createElement('button', { classes: ['btn'], attributes: {
        innerText: 'Apply',
        onclick: () => {
          dialogShadow.classList.add('hidden');
          resetBoard();
        },
      } }),
    ] }),
  ] }));
  
  dialogShadow.classList.remove('hidden');
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
    let shuffle = null
    item.innerText = path.map(([x, y, carry, leave, free, shoot]) => {
      if (x === 'shuffle') {
        shuffle = `↺${y.map(val => val ? '▮': '▯').join('')}`
        return
      }
      let coord = `${toAlphabet(x)}${y}`
      if (shuffle) {
        coord = `${coord} ${shuffle}`
        shuffle = null
      }
      if (carry === undefined) return coord
      if (free) {
        if (leave === 1) {
          return `${coord} →`
        }
        else {
          return `${coord} ⎯${leave}→`
        }
      }
      else {
        const symbol = shoot ? '⇏' : '⇒'
        if (leave) return `${coord} =${leave}${symbol}`
        else return `${coord} ${symbol}`
      }
    }).join(' ')
    list.appendChild(item)
  }
}

function resetBoard(clearBoard=false) {
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

  if (clearBoard) return

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
  const [goldLightPawnRow, redLightPawnRow] = {
    'rear': [1, 8],
    'middle': [3, 6],
    'front': [4, 5],
  }[config.startPos];
  for (let i = 0; i < 4; i++) {
    tiles[goldLightPawnRow][i].pushPawn(new LightPawn(true))
    tiles[redLightPawnRow][i].pushPawn(new LightPawn(false))
    tiles[goldLightPawnRow][9-i].pushPawn(new LightPawn(true))
    tiles[redLightPawnRow][9-i].pushPawn(new LightPawn(false))
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

socket.onopen = () => {
  if (urlGameId) {
    sendActions([['connect', [urlGameId]]])
    document.getElementById('connect').disabled = true
    document.getElementById('disconnect').disabled = false
    document.getElementById('settings').disabled = true
  }
}

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