class Tile {
  constructor(tileDiv) {
    this.tileDiv = tileDiv
    this.pawnStack = []
    this.liftCount = 0

    this.tileDiv.onclick = this.onClick.bind(this)
  }

  onClick(e) {
    if (e.shiftKey) {
      if (this.liftCount > 0) {
        this.pawnStack[this.pawnStack.length-this.liftCount].unlift()
        this.liftCount--
      } else {
        this.liftCount = this.pawnStack.length
        this.pawnStack.forEach(pawn => pawn.lift())
      }
    } else {
      if (this.liftCount < this.pawnStack.length) {
        this.liftCount++
        this.pawnStack[this.pawnStack.length-this.liftCount].lift()
      } else {
        this.deselect()
      }
    }
  }
  
  deselect() {
    this.liftCount = 0
    this.pawnStack.forEach(pawn => pawn.unlift())
  }

  addPawn(pawn) {
    this.pawnStack.push(pawn)
    this.tileDiv.appendChild(pawn.element)
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

function resetBoard() {
  const board = document.getElementById('board')
  board.innerHTML = ''

  const tiles = []

  for (let i = 0; i < 10; i++) {
    const row = document.createElement('div')
    row.classList.add('boardRow')
    tiles.push([])
    for (let j = 0; j < 10; j++) {
      const tileDiv = document.createElement('div')
      tileDiv.classList.add('boardTile')
      tileDiv.classList.add((j + i) % 2 ? 'darkTile' : 'lightTile')
      tiles[i].push(new Tile(tileDiv))
      row.appendChild(tileDiv)
    }
    board.appendChild(row)
  }

  /* Add Gold's Energy */
  // Dark
  tiles[0][0].addPawn(new Energy(true, true))
  tiles[0][0].addPawn(new Energy(true, true))
  tiles[0][0].addPawn(new Energy(true, true))
  tiles[0][9].addPawn(new Energy(true, true))
  tiles[0][9].addPawn(new Energy(true, true))
  tiles[0][9].addPawn(new Energy(true, true))
  tiles[0][1].addPawn(new Energy(true, true))
  tiles[0][1].addPawn(new Energy(true, true))
  tiles[0][8].addPawn(new Energy(true, true))
  tiles[0][8].addPawn(new Energy(true, true))
  tiles[0][2].addPawn(new Energy(true, true))
  tiles[0][7].addPawn(new Energy(true, true))
  tiles[0][5].addPawn(new Energy(true, true))
  // Light
  tiles[0][3].addPawn(new Energy(false, true))
  tiles[0][3].addPawn(new Energy(false, true))
  tiles[0][3].addPawn(new Energy(false, true))
  tiles[0][6].addPawn(new Energy(false, true))
  tiles[0][6].addPawn(new Energy(false, true))
  tiles[0][6].addPawn(new Energy(false, true))
  tiles[0][2].addPawn(new Energy(false, true))
  tiles[0][2].addPawn(new Energy(false, true))
  tiles[0][7].addPawn(new Energy(false, true))
  tiles[0][7].addPawn(new Energy(false, true))
  tiles[0][1].addPawn(new Energy(false, true))
  tiles[0][8].addPawn(new Energy(false, true))
  tiles[0][5].addPawn(new Energy(false, true))
  
  /* Add Red's Energy */
  // Dark
  tiles[9][0].addPawn(new Energy(true, false))
  tiles[9][0].addPawn(new Energy(true, false))
  tiles[9][0].addPawn(new Energy(true, false))
  tiles[9][9].addPawn(new Energy(true, false))
  tiles[9][9].addPawn(new Energy(true, false))
  tiles[9][9].addPawn(new Energy(true, false))
  tiles[9][1].addPawn(new Energy(true, false))
  tiles[9][1].addPawn(new Energy(true, false))
  tiles[9][8].addPawn(new Energy(true, false))
  tiles[9][8].addPawn(new Energy(true, false))
  tiles[9][2].addPawn(new Energy(true, false))
  tiles[9][7].addPawn(new Energy(true, false))
  tiles[9][5].addPawn(new Energy(true, false))
  // Light
  tiles[9][3].addPawn(new Energy(false, false))
  tiles[9][3].addPawn(new Energy(false, false))
  tiles[9][3].addPawn(new Energy(false, false))
  tiles[9][6].addPawn(new Energy(false, false))
  tiles[9][6].addPawn(new Energy(false, false))
  tiles[9][6].addPawn(new Energy(false, false))
  tiles[9][2].addPawn(new Energy(false, false))
  tiles[9][2].addPawn(new Energy(false, false))
  tiles[9][7].addPawn(new Energy(false, false))
  tiles[9][7].addPawn(new Energy(false, false))
  tiles[9][1].addPawn(new Energy(false, false))
  tiles[9][8].addPawn(new Energy(false, false))
  tiles[9][5].addPawn(new Energy(false, false))

  /* Add Shields */
  tiles[0][4].addPawn(new Shield())
  tiles[0][4].addPawn(new Shield())
  tiles[0][4].addPawn(new Shield())
  tiles[9][4].addPawn(new Shield())
  tiles[9][4].addPawn(new Shield())
  tiles[9][4].addPawn(new Shield())
  tiles[0][5].addPawn(new Shield())
  tiles[9][5].addPawn(new Shield())

  /* Add Pawns */
  // Light & Heavy Pawns
  for (let i = 0; i < 4; i++) {
    tiles[1][i].addPawn(new LightPawn(true))
    tiles[8][i].addPawn(new LightPawn(false))
    tiles[1][9-i].addPawn(new LightPawn(true))
    tiles[8][9-i].addPawn(new LightPawn(false))
    tiles[0][i].addPawn(new HeavyPawn(true))
    tiles[9][i].addPawn(new HeavyPawn(false))
    tiles[0][9-i].addPawn(new HeavyPawn(true))
    tiles[9][9-i].addPawn(new HeavyPawn(false))
  }
  // Towers
  tiles[1][4].addPawn(new Tower(true))
  tiles[1][5].addPawn(new Tower(true))
  tiles[8][4].addPawn(new Tower(false))
  tiles[8][5].addPawn(new Tower(false))
  // Queens
  tiles[0][5].addPawn(new Queen(true))
  tiles[9][5].addPawn(new Queen(false))
  // Kings
  tiles[0][4].addPawn(new King(true))
  tiles[9][4].addPawn(new King(false))
}