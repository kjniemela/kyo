let selectedTile = null
let path = []
let hasMoved = false

let tiles = []
let isGoldsTurn = false

const config = {
  allowUndo: false,
}

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
    if (this.pawnStack.length > 0 && this.pawnStack[this.pawnStack.length-1].isGold !== isGoldsTurn) {
      return
    }

    if (selectedTile && !(selectedTile === this)) {
      const isReturning = this === path[path.length-1] && config.allowUndo
      const topChip = this.pawnStack[this.pawnStack.length-1];
      if (this.pawnStack.length > 0 && !isReturning && !(topChip && topChip.isEnergy)) {
        selectedTile.deselect()
      } else {
        if (selectedTile.canMoveTo(this.x, this.y)) {
          if (hasMoved && !isReturning) return
          if (isReturning) {
            path.pop()
            hasMoved = false
          } else {
            const isFreeMove = selectedTile.isFreeMove(this.x, this.y)
            if (!isFreeMove) {
              if (path.length > 0) return
              hasMoved = true
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
          if (!isReturning) path.push(selectedTile)
          selectedTile = this
          return
        } else {
          if (hasMoved || path.length > 0) {
            return
          } else {
            selectedTile.deselect()
          }
        }
      }
    }
    selectedTile = this

    if (e.shiftKey) {
      if (this.liftCount < this.pawnStack.length) {
        this.liftCount++
        this.pawnStack[this.pawnStack.length-this.liftCount].lift()
      } else {
        this.deselect()
      }
    } else {
      if (this.liftCount > 0) {
        this.pawnStack[this.pawnStack.length-this.liftCount].unlift()
        this.liftCount--
        if (this.liftCount === 0) {
          this.deselect();
        }
      } else {
        this.liftCount = this.pawnStack.length
        this.pawnStack.forEach(pawn => pawn.lift())
      }
    }
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
    const newTopChip = this.pawnStack[this.pawnStack.length-this.liftCount-1]
    const isOrthogonal = !(this.x !== x && this.y !== y)
    console.log(newTopChip, isOrthogonal)
    if (newTopChip && newTopChip.isEnergy) {
      if (lastTile) {
        if (isOrthogonal) {
          return newTopChip.isDark && (
            !lastTopChip.isDark || (
              lastTile.x === x || lastTile.y === y
            )
          )
        } else {
          return !newTopChip.isDark && (
            lastTopChip.isDark || !(
              lastTile.x === x || lastTile.y === y
            )
          )
        }
      } else {
        return newTopChip.isDark === isOrthogonal
      }
    }
    return false
  }
  
  deselect() {
    this.liftCount = 0
    this.pawnStack.forEach(pawn => pawn.unlift())
    selectedTile = null
    if (path.length > 0) {
      passTurn()
    }
    path = []
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
    } else {
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
}

class Energy extends Chip {
  constructor(isDark, isGold) {
    super(`${isDark ? 'dark' : 'light'}${isGold ? 'gold' : 'red'}`)
    this.isDark = isDark
    this.isGold = isGold
    this.isEnergy = true
  }
}

class Pawn extends BoardPiece {
  constructor(type, isGold) {
    const element = document.createElement('img')
    element.classList.add('pawn')
    element.classList.add(type)
    element.src = `assets/pieces/${isGold ? 'gold': 'red'}${type}.png`
    super(element)
    this.isGold = isGold
    this.isChip = false
  }
}

class LightPawn extends Pawn {
  constructor(isGold) {
    super('lightpawn', isGold)
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

function passTurn() {
  isGoldsTurn = !isGoldsTurn
  selectedTile = null
  path = []
  hasMoved = false
  document.getElementById('turn').innerText = `${isGoldsTurn ? 'Gold' : 'Red'} is taking their turn...`
}

function resetBoard() {
  const board = document.getElementById('board')
  board.innerHTML = ''

  tiles = []
  isGoldsTurn = false

  for (let i = 0; i < 10; i++) {
    const row = document.createElement('div')
    row.classList.add('boardRow')
    tiles.push([])
    for (let j = 0; j < 10; j++) {
      const tileDiv = document.createElement('div')
      tileDiv.classList.add('boardTile')
      tileDiv.classList.add((j + i) % 2 ? 'darkTile' : 'lightTile')
      tiles[i].push(new Tile(tileDiv, i, j))
      row.appendChild(tileDiv)
    }
    board.appendChild(row)
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
    // tiles[1][i].pushPawn(new LightPawn(true))
    // tiles[8][i].pushPawn(new LightPawn(false))
    // tiles[1][9-i].pushPawn(new LightPawn(true))
    // tiles[8][9-i].pushPawn(new LightPawn(false))
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