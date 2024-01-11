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

## Pawns
All pawns are able to move one step in any direction, including diagonally, and they can attack in the same way.
### Light Pawn
![goldlightpawn](/client/assets/pieces/goldlightpawn.png)
![redlightpawn](/client/assets/pieces/redlightpawn.png)  
The Light Pawn (or just the Pawn) is the basic footsoldier of Kyo. They are the only pawns that cannot use Mana in any way, and they are also the only pawns that cannot always capture:
the Light Pawn can only attack if it "outnumbers" the enemy it wants to attack. This means that there needs to be more friendly stacks adjacent to the enemy pawn than there are enemy stacks surrounding the attacking light pawn.  
Some examples:  
- The attacking gold pawn and the defending red pawn are adjacent to each other, but no gold pawns are adjacent to the red pawn, and vice versa. This means they are evenly matched, and neither can attack the other.  
  ![image](https://github.com/kjniemela/kyo/assets/26636748/ce5744ce-fb4e-406c-ac3f-e03b04fa0299)
- In this example, the red pawn has two gold pawns adjacent to it, but the gold pawn only has one red pawn adjacent to it. So in this instance, the gold pawn outnumbers the red pawn and can attack it, while the red pawn cannot attack.  
  ![image](https://github.com/kjniemela/kyo/assets/26636748/3a8206c9-404d-44f3-951e-813ac25fbe13)
- Here,   
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
