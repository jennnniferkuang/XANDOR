/*

The following is a sample game written in the card game engine. 
It should show a general idea of how to use the API, as well as
a tour of what the engine has to offer.

Since this is just a sample, its implementation is as simple as
possible, and there is one known bug: if you try to drag a stack 
consisting of one card with the left mouse button, then middle click,
it will stop dragging the stack when you release middle click. This is
because this sample doesn't keep track of which mouse button you used 
to begin dragging.

I never bothered to fix this because it would complicate the code with
logic instead of demonstrating how to use the API, however if you're
going to be building off of this sample, I just thought to make you aware. 
I'll leave it as an exercise to the reader to keep track of which 
mouse button (or finger in the case of mobile) you used to drag the stack.
Or alternatively, don't fix it. It's not exactly game-breaking.

Furthermore, the only mobile functionality that is implemented in this sample
is allowing a mobile user to drag card stacks around and that's it. There are 
many, many ways to go about controlling a card game on mobile, so I'll let the
programmer decide how he wants to go about it.

*/

// The mouse buttons for browser events "mousedown" and "mouseup"
const LEFT_MOUSE_BUTTON = 0;
const MIDDLE_MOUSE_BUTTON = 1;
const RIGHT_MOUSE_BUTTON = 2;

// File names for two sprites, relative to res/images/
const HAND_OPEN_SPRITE = "hand_open.png";
const HAND_CLOSED_SPRITE = "hand_closed.png";

// A variable indicating whether the other player is holding his mouse down
let otherMouseDown = false;

// A variable representing which stack is currently being dragged by the 
// local client
let draggingStack = null;

// A variable indicating whether this client's touch is being held down
let mobileTouchHold = false;
let mobileStartPos = { x: 0, y: 0 };

// Add a sample context menu item to the default context menu items
// for each card. This context menu item will allow you to take half
// of a stack.
CardStacks.defaultContextMenuItems.push({
    // The Label
    text: "Take Half",

    // The message that gets sent to the other player
    message: "The other player has taken half of that stack",

    // Gets called when this item is selected
    action: stack => { 
        if(stack.cards.length < 2) return;

        // Separate half the cards
        let newStack = stack.separate(Math.ceil(stack.cards.length / 2));

        // Makes it so that you're holding the new stack from its center
        newStack.setPos({
            x: Game.selfMousePos.x - stack.size.x / 2,
            y: Game.selfMousePos.y - stack.size.y / 2
        });

        // Begin dragging
        newStack.beginDrag();
        draggingStack = newStack;
    }
});

// This is called whenever the player begins holding down a mouse button
Game.onMouseDown = (e, position, stack) => {

    // If the left or middle mouse buttons have been pressed, send a message to the 
    // other client saying that we're holding the mouse down. Let's call this message
    // "mouseDown" and expect its value to be a boolean
    if(e.button == LEFT_MOUSE_BUTTON || e.button == MIDDLE_MOUSE_BUTTON)
        NetworkBuffer.write("mouseDown", true);

    // If we're not already dragging a stack, a stack has been clicked, 
    // and it's not occupied by the other player...
    if(!draggingStack && stack && !stack.isOccupiedByOtherPlayer()) {

        // Send a message to the other client telling him to update our mouse position on his end
        // immediately (as opposed to smoothly interpolating) so that it'll look accurate
        // on his end.
        Game.sendMousePosition(true);

        // If it was a left click, or middle click but the stack is just 1 card, then begin dragging
        if(e.button == LEFT_MOUSE_BUTTON || (e.button == MIDDLE_MOUSE_BUTTON && stack.cards.length == 1)) {
            stack.beginDrag();
            draggingStack = stack;
        }

        // Otherwise if the stack is being middle clicked and the mouse is over the 
        // top-most card, take the topmost card from the stack and begin dragging it
        else if(e.button == MIDDLE_MOUSE_BUTTON && stack.isHoveringTopmostCard()) {
            const newStack = stack.separate(1);
            newStack.beginDrag();
            draggingStack = newStack;
        }
    }

    NetworkBuffer.flush(); // Send everything to the other client to be synchronised
}

// We're going to hook this function to the game canvas' "mouseup" event later on 
let onMouseUp = e => {

    // If the left or middle mouse buttons have been released, send a message to the 
    // other client saying that we're not holding down a mouse button
    if(e.button == LEFT_MOUSE_BUTTON || e.button == MIDDLE_MOUSE_BUTTON)
        NetworkBuffer.write("mouseDown", false);

    // If a stack is currently being dragged, and if the left mouse button is being
    // released (or the middle mouse button if the stack is just one card)...
    if(draggingStack && (e.button == LEFT_MOUSE_BUTTON || (e.button == MIDDLE_MOUSE_BUTTON && draggingStack.cards.length == 1))) {
        
        // Stop dragging the stack
        draggingStack.endDrag();

        // For every *other* stack of cards...
        for (const otherStack of CardStacks.active) {
            if(draggingStack == otherStack) continue;

            // If the stack that was being dragged is close enough to this
            // stack, combine the stacks together
            if(Util.dist(draggingStack.pos, otherStack.getTopCardRect()) < GAME_INFO.cardSnapDistance) {
                otherStack.combine(draggingStack);
                break;
            }
        }

        draggingStack = null;
    }

    // Otherwise if the right mouse button is the one that's being released,
    // and the mouse is currently over this stack, and this stack isn't being
    // used by the other player in any way, open the stack's context menu
    else {
        let stack = CardStacks.getHoveredStack();
        if (stack) {
            if(e.button == RIGHT_MOUSE_BUTTON && !stack.isOccupiedByOtherPlayer()) {
                stack.openContextMenu(Game.selfMousePos);
            }
        }
    }

    // Having completed the mousedown operation, send everything to the other client
    NetworkBuffer.flush();
}

// We're going to hook this function to the game canvas' "keyUp" event later on 
let onKeyUp = e => {
    // If the R key has been released (after being pressed)...
    if(e.code == "KeyR" && GameNetwork.isHost) { 
        if(window.confirm("You are about to reset the game. Are you sure?")) {
            Game.reset();

            // And reset our own game
            Notifications.send("Game reset.");
        }
    }
}

// Since there are infinite possibilities of how to go about controlling a game
// on mobile (tap, double tap, tap and hold, tap with multiple fingers, etc.), I 
// will make no assumptions and have only written the bare minimum as a template, 
// (which is being able to drag cards around) and leave the rest up to the programmer.
// See onMouseDown and onMouseUp above for a straightforward example on how to
// manipulate card stacks in response to input events.

Game.onTouchStart = (e, positions, touchedStacks) => { 

    // If we're not touching any card stacks, then there's nothing to do
    if(touchedStacks.length < 1) return;

    draggingStack = touchedStacks[0];
    mobileStartPos = Game.selfMousePos;

    mobileTouchHold = true;
    setTimeout(function() {
        if (mobileTouchHold) {
            if (Util.dist(Game.selfMousePos, mobileStartPos) < GAME_INFO.cardSnapDistance) {
                if (draggingStack) draggingStack.openContextMenu(Game.selfMousePos);
            }
        }
    }, 500);

    // Send our "mouse position" to the other client before dragging.
    // (Note: just before Game.onTouchStart is called, the engine automatically
    // sets Game.selfMousePos to positions[0], so we are actually sending positions[0])
    Game.sendMousePosition(true);

    // Notify the other client that our "mouse" is being "held down" (I. E.
    // that he should show us as having the "hand closed" icon)
    NetworkBuffer.write("mouseDown", true);

    // Begin dragging
    if (draggingStack) draggingStack.beginDrag();

    
    // Send all the network data to the other client
    NetworkBuffer.flush();
};

// We're going to hook this function to the game canvas' "touchend" event later on 
let onTouchEnd = e => { 
    // Prevent default mobile events
    e.preventDefault();
    e.stopImmediatePropagation();

    mobileTouchHold = false;

    // If we're dragging a stack...
    if(draggingStack) {
        draggingStack.endDrag(); // Stop dragging it
        
        // For every *other* stack of cards...
        for (const otherStack of CardStacks.active) {
            if(draggingStack == otherStack) continue;

            // If the stack that was being dragged is close enough to this
            // stack, combine the stacks together
            if(Util.dist(draggingStack.pos, otherStack.getTopCardRect()) < GAME_INFO.cardSnapDistance) {
                otherStack.combine(draggingStack);
                break;
            }
        }

        draggingStack = null;
    }
    
    // Tell the other client that our "mouse" is no longer held down.
    // (I. E. to use the "hand spread out" sprite)
    NetworkBuffer.write("mouseDown", false);
    NetworkBuffer.flush();
};

// Called exactly once before the game starts for the first time.
Game.onInit = () => {

    // Subscribe to some canvas events. These are regular old canvas events 
    // that anyone can look up on W3Schools or Mozilla web docs
    Game.canvasEvent("mouseup", onMouseUp);
    Game.canvasEvent("touchend", onTouchEnd);

    // Listen for keypresses
    window.addEventListener('keyup', onKeyUp, false);

    // Create 2 effect areas, one for the host's hand and one for the guest's hand.
    // We'll make it so that cards inside the zone will only be visible to the zone's
    // owner.
    const hostHand = new EffectArea(GameNetwork.isHost? "Your hand" : "The other player's hand", 10, 10, Game.WIDTH - 20, 100);
    const guestHand = new EffectArea(GameNetwork.isHost? "The other player's hand" : "Your hand", 10, Game.HEIGHT - 110, Game.WIDTH - 20, 100);
    
    // If this client isn't the host, then hide cards that go here
    hostHand.onStackEnter = stack => {
        if(!GameNetwork.isHost) stack.isHidden = true;
    };

    // If this client isn't the guest, then hide cards that go here
    guestHand.onStackEnter = stack => {
        if(GameNetwork.isHost) stack.isHidden = true;
    };

    // Removing a card from the zone will no longer make it hidden
    const reveal = stack => { stack.isHidden = false; };
    guestHand.onStackExit = reveal;
    hostHand.onStackExit = reveal;

    // Register these effect areas
    EffectAreas.active.push(hostHand);
    EffectAreas.active.push(guestHand);

    // Arrange the board
    Game.resetLocalClient();
}

// Called automatically every time the game board needs to be reset (including
// for initial setup of the game board). Can also be called manually to reset
// the game whenever required.
// IMPORTANT: Game.resetLocalClient is meant for resetting the **LOCAL** client. 
// Do not send network messages during Game.resetLocalClient.
Game.resetLocalClient = () => {
    CardStacks.reset(); // Delete all card stacks, if there are any
    DeckManager.createCardStacks();
}

// Called automatically every frame
Game.tick = (dt, g) => {
    Graphics.clear(g, "green");

    // Update and draw effect areas
    EffectAreas.updateAll(dt);
    EffectAreas.drawAll(g);

    // Update and draw card stacks
    CardStacks.updateAll(dt);
    CardStacks.drawAll(g);

    // Draw the other player's mouse cursor. If the other player's mouse is held down,
    // use HAND_CLOSED_SPRITE, otherwise use HAND_OPEN_SPRITE.
    let handSprite = Sprites.get(otherMouseDown? HAND_CLOSED_SPRITE : HAND_OPEN_SPRITE);
    try {
        g.drawImage(handSprite, Game.otherMousePosSmooth.x - handSprite.width / 2, Game.otherMousePosSmooth.y - handSprite.height / 2, handSprite.width, handSprite.height);
    } catch (error) {
        // Editor does not have same file path to images
        //console.log("Warning: Hand Sprite not found.");
    }

    // Draw context menus
    CardStacks.drawAllContextMenus(g);

    // Update and draw the messages at the bottom right
    Notifications.tick(dt, g);
}

// Called automatically whenever data is received from the other player
Game.netReceive = data => {

    // The game will synchronise everything* out of the box, as long as
    // you call this method.
    // * Not everything. Consult the documentation to see what exactly gets synchronised.
    Game.netReceiveDefault(data);

    // Some game-specific code which will update the other player's
    // "mouse down status" if "mouseDown" happens to be included in the data
    // we received
    if(data["mouseDown"] !== undefined)
        otherMouseDown = data["mouseDown"][0];
}

// Called automatically at GAME_INFO.networkTickrate times per second,
// the return value is what gets sent to the other player
Game.netTick = dt => {
    return {
        // Return some arbitrary JSON
    };
}