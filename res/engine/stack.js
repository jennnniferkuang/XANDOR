
// "Shuffle" in the context menu
const contextMenuShuffle = (stack) => {
    stack.shuffle();
}

// "Reverse" in the context menu
const contextMenuReverse = (stack) => {
    stack.updateCards(stack.cards.reverse());
}

// "Flip" in the context menu
const contextMenuFlip = (stack) => {
    stack.setFaceDown(!stack.isFaceDown);
}

const contextMenuDraw = (stack) => {
    if (stack.cards.length < 2) {
        stack.setFaceDown(false);
        stack.beginDrag();
        draggingStack = stack;
        return;
    }

    // Separate the top card from the stack
    let newStack = stack.separate(1);

    // Makes it so that you're holding the new stack from its center
    newStack.setPos({
        x: Game.selfMousePos.x - stack.size.x / 2,
        y: Game.selfMousePos.y - stack.size.y / 2
    });

    newStack.setFaceDown(false);

    // Begin dragging
    newStack.beginDrag();
    draggingStack = newStack;
}

var CardStacks = { 
    active: [ ], // READONLY. All stacks that are currently active
    defaultContextMenuItems: [
        { text: "Draw", message: "The other player has drawn from that stack", action: contextMenuDraw },
        { text: "Shuffle", message: "The other player shuffled that stack", action: contextMenuShuffle },
        { text: "Reverse", message: "The other player reversed that stack", action: contextMenuReverse },
        { text: "Flip", message: "The other player has flipped that stack", action: contextMenuFlip }
    ]
};

// Gets a stack at "pos" or the current mouse position
CardStacks.getHoveredStack = pos => {
    if(!pos) pos = Game.selfMousePos;
    for (const stack of CardStacks.active)
        if(stack.isHovering(pos))
            return stack;
}

// Deletes all cards and resets things as though it were the first time
// loading the game
CardStacks.reset = () => {
    CardStacks.active = [ ];
    stackIDCounter = 0;
}

// Interacts with all context menus and performs their actions
// if any item is clicked. Returns true if a context menu item was clicked.
CardStacks.interactWithContextMenus = (clickPosition) => {
    if(!clickPosition) clickPosition = Game.selfMousePos;

    let itemClicked = false;
    for (const stack of CardStacks.active) {
        
        if(stack.contextMenuOtherOpen || stack.isOtherDragging) continue;
        
        if(stack.contextMenuSelfOpen) {
            for (let i = 0; i < stack.contextMenuItems.length; i++) {
                const item = stack.contextMenuItems[i];
                const y = stack._contextMenuPos.y + GAME_INFO.contextMenuItemHeight * i;

                const rect = { 
                    x: stack._contextMenuPos.x, 
                    y: y, 
                    width: GAME_INFO.contextMenuWidth, 
                    height: GAME_INFO.contextMenuItemHeight
                };

                if(Util.pointInRect(clickPosition, rect)) {
                    if(item.message)
                        NetworkBuffer.write("eventMessage", item.message);
                    item.action(stack);
                    itemClicked = true;
                    break;
                }
            }
        }

        if(stack.contextMenuSelfOpen)
            stack.closeContextMenu();

        if(itemClicked) return true;
    }

    return false;
}

// Receives network events for all built-in interactions like dragging or opening
// the context menu
CardStacks.receiveNetworkEvents = data => {
    if(data.cardInstantiated) {
        data.cardInstantiated.forEach(function(e) {
            CardStacks.instantiate(
                e.cards, 
                e.pos, 
                e.faceDown,
                true);
        });
    }

    if(data.stackPosSet) {
        data.stackPosSet.forEach(function(e) {
            const found = CardStacks.find(e.id);
            if(found) found.setPos(e.pos, true);
        });
    }

    if(data.setFaceDown) {
        data.setFaceDown.forEach(function(e) {
            const found = CardStacks.find(e.id);
            if(found) found.setFaceDown(e.isFaceDown);
        });
    }

    if(data.updateStackCards) {
        data.updateStackCards.forEach(function(e) {
            const found = CardStacks.find(e.id);
            if(found)
                found.updateCards(e.cards, true);
        });
    }

    if(data.begunDrag) {
        data.begunDrag.forEach(function(e) {
            const found = CardStacks.find(e);
            if(found) found.beginDrag(null, true);
        });
    }
    
    if(data.endedDrag) {
        data.endedDrag.forEach(function(e) {
            const found = CardStacks.find(e.id);
            if(found) {
                found.pos = e.finalPos;
                found.endDrag(true);
            }
        });
    }

    if(data.contextMenuOpened) {
        data.contextMenuOpened.forEach(function(e) {
            const found = CardStacks.find(e.id);
            if(found) found.openContextMenu(e.pos, true);
        });
    }

    if(data.contextMenuClosed) {
        data.contextMenuClosed.forEach(function(e) {
            const found = CardStacks.find(e);
            if(found) found.closeContextMenu(true);
        });
    }

    if(data.stackDestroyed) {
        data.stackDestroyed.forEach(function(e) {
            CardStacks.destroy(e, true);
        });
    }
};

// Finds a stack by ID
CardStacks.find = id => CardStacks.active.find(x => x.id == id);

// Removes a stack from the game. This operation is synced across both clients
CardStacks.destroy = (id, foreign = false) => {
    CardStacks.active = CardStacks.active.filter(x => x.id != id);
    if(!foreign)
        NetworkBuffer.write("stackDestroyed", id);
};

// Adds a new stack to the game. This operation is synced across both clients
CardStacks.instantiate = (cards, pos, faceDown = false, foreign = false) => {
    const s = new CardStack(cards, pos, faceDown);
    CardStacks.active.push(s);

    if(!foreign)
        NetworkBuffer.write("cardInstantiated", {
            cards: cards,
            pos: pos,
            faceDown: faceDown
        });

    return s;
};

// Update all stacks
CardStacks.updateAll = dt => {
    for (let i = CardStacks.active.length - 1; i >= 0; i--) {
        CardStacks.active[i].update(dt);
    }
};

// Draw all stacks
CardStacks.drawAll = g => {
    // First draw the stacks that aren't being dragged
    for (let i = CardStacks.active.length - 1; i >= 0; i--) {
        const stack = CardStacks.active[i];
        if(!stack.isSelfDragging && !stack.isOtherDragging)
            stack.draw(g);
    }

    // Then draw the ones being dragged on top
    const draggingStacks = CardStacks.active.filter(x => x.isSelfDragging || x.isOtherDragging);
    for (const stack of draggingStacks) {
        stack.draw(g);
    }
};

// Draws the context menus of all stacks
CardStacks.drawAllContextMenus = g => {
    for (const stack of CardStacks.active) {
        stack.drawContextMenu(g);
    }
};

let stackIDCounter = 0;

class CardStack {
    id = -1; // READONLY. The stack's unique ID
    cards = [ ]; // READONLY. List of cards in the stack

    // Self-explanatory
    pos = { x: 0, y: 0 }; // READONLY
    size = { x: GAME_INFO.defaultCardWidth, y: GAME_INFO.defaultCardHeight };

    isFaceDown = false; // READONLY. Whether this stack is face-down or not

    // Whether this stack will appear face-down for the client, regardless of isFaceDown
    isHidden = false; 

    // Whether this stack is being changed or not in the editor
    isSelected = false

    // How many pixels in the Y direction each card in this stack is separated by.
    // A stack of cards with all 52 cards and cardVerticality = 0 is functionally a
    // deck of cards.
    cardVerticality = GAME_INFO.defaultCardVerticality;

    // READONLY. Whether this card is being dragged by the client, or by the other player, respectively
    isSelfDragging = false;
    isOtherDragging = false;

    // READONLY. Whether this card's context menu is opened by the client or the other player.
    contextMenuSelfOpen = false;
    contextMenuOtherOpen = false;

    // Context menu items
    contextMenuItems = CardStacks.defaultContextMenuItems;

    // Private fields
    _dragOffset = { x: 0, y: 0 };
    _contextMenuPos = { x: 0, y: 0 };

    constructor(cards, pos, faceDown = false) {
        this.cards = [ ...cards ];
        this.pos = pos;
        this.isFaceDown = faceDown;
        this.id = ++stackIDCounter;
    }

    // Returns the topmost card in the stack
    getTop() {
        return this.cards[this.cards.length - 1];
    }

    // Returns this stack's bounding box
    getRect() {
        return {
            x: this.pos.x, 
            y: this.pos.y - this.getPerceivedHeight() * this.cardVerticality, 
            width: this.size.x, 
            height: this.size.y + this.getPerceivedHeight() * this.cardVerticality 
        };
    }

    // Returns the bounding box of the topmost card in the stack
    getTopCardRect() {
        return  { 
            x: this.pos.x, 
            y: this.pos.y - this.getPerceivedHeight() * this.cardVerticality, 
            width: this.size.x, 
            height: this.size.y 
        };
    }

    getBottomCardRect() {
        return {
            x: this.pos.x, 
            y: this.pos.y,
            width: this.size.x, 
            height: this.size.y 
        }
    }

    // Runs every frame, meant for updating the stack
    update(dt) {
        if(this.isSelfDragging) {
            this.pos = { x: Game.selfMousePos.x + this._dragOffset.x, y: Game.selfMousePos.y + this._dragOffset.y };
        }
        else if(this.isOtherDragging) {
            this.pos = { 
                x: Game.otherMousePosSmooth.x + this._dragOffset.x, 
                y: Game.otherMousePosSmooth.y + this._dragOffset.y 
            };
        }
    }

    getPerceivedHeight() {
        return Math.min(this.cards.length - 1, GAME_INFO.defaultCardShiftCap);
    }

    // Runs every frame, meant for drawing the stack
    draw(g) {
        const lowerCap = Math.max(0, this.cards.length - GAME_INFO.defaultCardShiftCap);

        // If being dragged, draw a shadow
        if(this.isSelfDragging || this.isOtherDragging) {
            g.fillStyle = "rgba(0,0,0,0.4)";
            g.fillRect(this.pos.x + 10, this.pos.y + 10, this.size.x, this.size.y);
        }

        // Draw all cards in stack
        for (let i = lowerCap; i < this.cards.length; i++) {
            const offset = i - lowerCap;

            const card = this.cards[i];
            const toLoad = (this.isFaceDown || this.isHidden)? card.stack : (card.stack + card.index.toString());
            const sprite = Sprites.get(toLoad);
            if(sprite.complete)
                g.drawImage(sprite, this.pos.x, this.pos.y - offset * this.cardVerticality, this.size.x, this.size.y);
            else console.log("Warning: card " + toLoad + " has not loaded.");

            // Draw a border on each card
            if (this.isSelected) g.strokeStyle = "rgb(255,255,0)";
            else g.strokeStyle = "rgb(10,10,10)";
            g.strokeRect(this.pos.x, this.pos.y - offset * this.cardVerticality, this.size.x, this.size.y);
        }
    }

    // Opens the stack's context menu
    openContextMenu(position, foreign = false) {
        if(!position) position = Game.selfMousePos;
        this._contextMenuPos = { ...position };

        if(foreign) {
            this.contextMenuOtherOpen = true;
        }
        else {
            this.contextMenuSelfOpen = true;
            NetworkBuffer.write("contextMenuOpened", {
                id: this.id,
                pos: position
            });
        }
    }

    // Closes the stack's context menu
    closeContextMenu(foreign = false) {
        if(foreign) {
            this.contextMenuOtherOpen = false;
        }
        else {
            this.contextMenuSelfOpen = false;
            NetworkBuffer.write("contextMenuClosed", this.id);
        }
    }

    // Sets whether or not the stack is face down
    setFaceDown(f, foreign = false) {
        this.isFaceDown = f
        if(!foreign)
            NetworkBuffer.write("setFaceDown", {
                id: this.id,
                isFaceDown: f
            });
    }

    // Draws the stack's context menu
    drawContextMenu(g) {
        if(!this.contextMenuSelfOpen && !this.contextMenuOtherOpen) return;

        const size = this.contextMenuOtherOpen? GAME_INFO.contextMenuItemHeight : (GAME_INFO.contextMenuItemHeight * Math.max(1, this.contextMenuItems.length));

        g.fillStyle = "black";
        g.beginPath();
        g.rect(this._contextMenuPos.x, this._contextMenuPos.y, GAME_INFO.contextMenuWidth, size);
        g.stroke();

        g.fillStyle = "rgb(200, 200, 200)";
        g.fillRect(this._contextMenuPos.x, this._contextMenuPos.y, GAME_INFO.contextMenuWidth, size);
            
        g.textAlign = "left";

        if(this.contextMenuSelfOpen) {
            if(this.contextMenuItems.length <= 0) {
                g.font = "12px Arial";
                g.fillText("(None)", this._contextMenuPos.x + 5, this._contextMenuPos.y + GAME_INFO.contextMenuItemHeight / 2); 
                return;
            }

            for (let i = 0; i < this.contextMenuItems.length; i++) {
                const item = this.contextMenuItems[i];
                const y = this._contextMenuPos.y + GAME_INFO.contextMenuItemHeight * i;

                const rect = { 
                    x: this._contextMenuPos.x, 
                    y: y, 
                    width: GAME_INFO.contextMenuWidth, 
                    height: GAME_INFO.contextMenuItemHeight
                };

                g.textBaseline = "middle"; 
                if(Util.pointInRect(Game.selfMousePos, rect)) {
                    g.fillStyle = "gray";
                    g.fillRect(rect.x, rect.y, rect.width, rect.height);
                    g.fillStyle = "white";
                }
                else {
                    g.fillStyle = "black";
                }

                g.font = "12px Arial";
                g.fillText(item.text, this._contextMenuPos.x + 5, y + GAME_INFO.contextMenuItemHeight / 2); 
            }
        }
        else if(this.contextMenuOtherOpen) {
            g.textBaseline = "middle"; 
            g.fillStyle = "black";
            g.font = "12px Arial";
            g.fillText("(Opponent is interacting)", this._contextMenuPos.x + 5, this._contextMenuPos.y + GAME_INFO.contextMenuItemHeight / 2); 
        }
    }

    // Sets the stack's cards
    updateCards(cards, foreign = false) {
        this.cards = cards;
        if(!foreign)
            NetworkBuffer.write("updateStackCards", {
                id: this.id,
                cards: cards
            });
    }

    // Begins dragging the stack
    beginDrag(pos, foreign = false) {
        this.pos = { x: this.pos.x - 10, y: this.pos.y - 10 };

        if(foreign) {
            this.isOtherDragging = true;

            if(!pos) pos = Game.otherMousePosSmooth;
            this._dragOffset = { 
                x: this.pos.x - pos.x, 
                y: this.pos.y - pos.y 
            };
        }    
        else {
            this.isSelfDragging = true;

            if(!pos) pos = Game.selfMousePos;

            this._dragOffset = { 
                x: this.pos.x - pos.x, 
                y: this.pos.y - pos.y 
            };

            NetworkBuffer.write("begunDrag", this.id);
        }
    }

    // Stops dragging the stack
    endDrag(foreign = false) {
        CardStacks.active = CardStacks.active.filter(x => x.id != this.id);
        CardStacks.active.unshift(this);
        
        if(foreign) {
            this.isOtherDragging = false;
        }
        else {
            this.isSelfDragging = false;
            //this.pos = { x: this.pos.x, y: this.pos.y };
            this.pos = { x: this.pos.x, y: cardSlots.topHand.y};

            NetworkBuffer.write("endedDrag", {
                id: this.id,
                finalPos: this.pos
            });
        }

        this.updateEffectAreaInfluence();
    }

    // Updates the effect areas that are influencing this card
    updateEffectAreaInfluence() {
        for (const effectArea of EffectAreas.active) {
            if(effectArea.cardsContained.find(x => x.id == this.id)) {
                effectArea.cardsContained = effectArea.cardsContained.filter(x => x.id != this.id);
                effectArea.onStackExit(this);
            }
        }

        for (const effectArea of EffectAreas.active) {
            if(Util.intersectsAABB(this.getBottomCardRect(), effectArea.getRect())) {
                effectArea.cardsContained.push(this);
                effectArea.onStackEnter(this);
            }
        }
    }

    // Takes N number of cards from the top of this stack and makes it into its own stack.
    // This operation is synced across both clients.
    separate(amount) {
        if (amount < 1) return null;
        const keptCards = this.cards.slice(0, this.cards.length - amount);
        const takenCards = this.cards.slice(this.cards.length - amount);
        this.updateCards(keptCards);
        const newStack = CardStacks.instantiate(takenCards, { ...this.getTopCardRect() }, this.isFaceDown);
        return newStack;
    }

    // Places "otherStack" on top of this stack. This operation is synced across both clients
    combine(otherStack) {
        this.updateCards(this.cards.concat(otherStack.cards));
        CardStacks.destroy(otherStack.id);
    }

    // Shuffles this stacks cards. This operation is synced across both clients
    shuffle() {
        Util.shuffle(this.cards);
        this.updateCards(this.cards);
    }

    // Set's a card's position. This operation is synced across clients
    setPos(pos, foreign = false) {
        this.pos = { x: Math.round(pos.x), y: Math.round(pos.y) };
        this.updateEffectAreaInfluence();
        if(!foreign)
            NetworkBuffer.write("stackPosSet", {
                id: this.id,
                pos: pos
            });
    }

    // Returns true if a point is currently over this stack's bounding box.
    // The point is Game.selfMousePos by default
    isHovering(pos) {
        if(!pos) pos = Game.selfMousePos;
        return Util.pointInRect(pos, this.getRect());
    }

    // Returns true if a point is currently over the bounding box of 
    // this stack's topmost card. The point is Game.selfMousePos by default
    isHoveringTopmostCard(pos) {
        if(!pos) pos = Game.selfMousePos;
        return Util.pointInRect(pos, this.getTopCardRect());
    }

    // Self explanatory
    isOccupiedByOtherPlayer() {
        return this.isOtherDragging || this.contextMenuOtherOpen;
    }
}