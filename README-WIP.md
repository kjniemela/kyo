# Kyo
![image](https://github.com/kjniemela/kyo/assets/26636748/fe81c1e3-906c-49a5-a074-377e07aa918d)
Kyo is a board game inspired by Chess.
# Rules

Kyo is played on a 10 by 10 checkered board, and the game is won by either capturing the enemy King or destroying all the enemy's Mana.
There are two types of pieces in Kyo, which each have several subtypes:
- ### Pawns 
  - There are five basic pawn types in Kyo:
    - The Light Pawn (8 per player)
    - The Heavy Pawn (8 per player)
    - The Tower (2 per player)
    - The Queen (1 per player)
    - The King (1 per player)
  - As well as two additional pawn types that can optionally be played with:
    - The Cannon (2 per player)
    - The Knight (2 per player)
- ### Chips
  - Mana:
    - Light Mana Chips (13 per player)
    - Dark Mana Chips (13 per player)
  - Shield Chips (8 per player)

Chips can be stacked together on the same board tile, and one pawn may be placed on top of a stack of chips. Collectively, all chips and/or pawns on a tile are referred to as a "Stack".

When making a move, the player may pick up the pawn, if present, as well as any friendly chips from the top of the stack and make a move with these. This selection of picked-up chips and/or a pawn is called a stack slice. If no pawn is present, the player may pick up any number of the chips on the tile. If a Light Pawn is present, the player may **not** pick up any chips, and if any other type of pawn is present, the player may pick up a maximum of **five** chips.

There are four basic types of moves:
- ### "Direct" Moves
  - The piece(s) move **one** step in any direction, including diagonally.
  - Making a direct move always ends your turn (except for Towers, which may always choose to make deploy moves at the end of their turn).
  - The whole stack slice can make a direct move together. A direct move can also be made with just the pawn on top of a stack slice, or with just the chips under the pawn, leaving the pawn behind.
- ### "Mana" Moves
  - If the player leaves behind a Mana chip of the correct color after making a move (Dark Mana for orthogonal moves, Light Mana for diagonal moves), this qualifies as a Mana move. (See more in the Mana section of this ruleset.)
  - After any Mana move, the player may choose to make another Mana move, if a legal Mana move is avaiable.
  - The player may **not** choose to make a direct move following a Mana move.
  - Only the Queen may make shuffle moves after a Mana move.
  - Only the Tower may make deploy moves after a Mana move.
- ### "Shuffle" Moves
  - The player may choose to reshuffle the chips in the currently lifted stack slice.
  - A shuffle move **must never** end with a Shield chip being placed underneath any Mana chip. Any such move is illegal.
  - Making a shuffle move ends your turn, except for the Queen, which may make any number of shuffle moves at any time.
- ### "Deploy" Moves
  - If a pawn has an undeployed Shield chip beneath it, it may choose to deploy that shield onto any adjacent tile, including diagonally.
  - More than one shield may be deployed at once.
  - For any pawn except the Tower, a deploy move is equivalent to making a direct move with a stack slice containing the shield, meaning the turn ends.
  - Towers, however, may make deploy moves at any time without ending their turn.

## Pawns

### Light Pawn
![goldlightpawn](/client/assets/pieces/goldlightpawn.png)
![redlightpawn](/client/assets/pieces/redlightpawn.png)  
The Light Pawn (or just the Pawn) is the basic footsoldier of Kyo. They are the only pawns that cannot use Mana in any way, and they are also the only pawns that cannot always capture:
the Light Pawn can only attack if it "outnumbers" the enemy it wants to attack (unless it is simply moving onto a stack of enemy Mana). This means that there needs to be more friendly stacks adjacent to the enemy pawn than there are enemy stacks surrounding the attacking light pawn.  
Some examples:  
- The attacking gold pawn and the defending red pawn are adjacent to each other, but no gold pawns are adjacent to the red pawn, and vice versa. This means they are evenly matched, and neither can attack the other.  
  ![image](https://github.com/kjniemela/kyo/assets/26636748/ce5744ce-fb4e-406c-ac3f-e03b04fa0299)
- In this example, the red pawn has two gold pawns adjacent to it, but the gold pawn only has one red pawn adjacent to it. So in this instance, the gold pawn outnumbers the red pawn and can attack it, while the red pawn cannot attack.  
  ![image](https://github.com/kjniemela/kyo/assets/26636748/3a8206c9-404d-44f3-951e-813ac25fbe13)
- Here, gold has two pawns adjacent to the the target red pawn, but red has one pawn and one Mana chip next to the attacking gold pawn. This would prevent the gold pawn from attacking the red pawn. Note that the gold pawn would still be able to capture the red Mana chip, as the outnumbering requirement does not apply when attacking Mana.  
  ![image](https://github.com/kjniemela/kyo/assets/26636748/30fb07a8-8ec0-42c6-82d7-7401bdbd9251)


### Heavy Pawn
![goldpawn](/client/assets/pieces/goldpawn.png)
![redpawn](/client/assets/pieces/redpawn.png)  
### Tower
![goldtower](/client/assets/pieces/goldtower.png)
![redtower](/client/assets/pieces/redtower.png)  
### Queen
![goldqueen](/client/assets/pieces/goldqueen.png)
![redqueen](/client/assets/pieces/redqueen.png)  
### King
![goldking](/client/assets/pieces/goldking.png)
![redking](/client/assets/pieces/redking.png)  


## Mana
Each player has Light and Dark Mana chips.  
![darkgold](https://github.com/kjniemela/kyo/assets/26636748/ac37cd23-b883-4c71-b7c8-2ae622a01035)
![lightgold](https://github.com/kjniemela/kyo/assets/26636748/f77ceed3-2735-491b-be57-5469deb1c0fe)
![darkred](https://github.com/kjniemela/kyo/assets/26636748/9550d305-acf6-41d6-b94e-49c7627a400d)
![lightred](https://github.com/kjniemela/kyo/assets/26636748/0697c321-fd85-49c6-8bce-1cbd1188cda0)  
Multiple Mana chips can be stacked on the same tile, and the whole stack can move one step in any direction, with or without a pawn on top.

![image](https://github.com/kjniemela/kyo/assets/26636748/e35f1137-6848-417b-b13b-9efc88b80d70)
![image](https://github.com/kjniemela/kyo/assets/26636748/a208c2ed-0519-4cbb-90df-024382bfca19)
![image](https://github.com/kjniemela/kyo/assets/26636748/c3a811b7-a6a8-449f-9e09-5c7c1c620d21)
![image](https://github.com/kjniemela/kyo/assets/26636748/0c285d83-1b5d-4646-aa28-4b4d5b85ebbd)
![image](https://github.com/kjniemela/kyo/assets/26636748/246e2ad5-5e08-419d-a204-827a3f20aa0f)

**This is legal:**  
![image](https://github.com/kjniemela/kyo/assets/26636748/edc01a45-5859-4f6a-85cf-c69744ab275d)

**This is not:**  
![image](https://github.com/kjniemela/kyo/assets/26636748/e83f9316-d02b-4de6-9642-2f42fe7f54f1)
