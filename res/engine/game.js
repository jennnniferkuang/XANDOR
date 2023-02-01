let ctx; // Canvas graphics context

let lastTimestamp;

let timeSinceLastFrame = 0.0;
let timeSinceLastNetFrame = 0.0;

const frameInterval = 1000.0 / GAME_INFO.targetFramerate;
const netFrameInterval = 1000.0 / GAME_INFO.networkTickrate;

var Game = {
    canvas: null, // READONLY. The canvas DOM element
    WIDTH: GAME_INFO.gameWidth, // READONLY
    HEIGHT: GAME_INFO.gameHeight, // READONLY
    selfMousePos: { x: 0, y: 0 }, // Local client's mouse position
    otherMousePos: { x: 0, y: 0 }, // READONLY. Other client's last known mouse position
    otherMousePosSmooth: { x: 0, y: 0 } // READONLY. Other client's interpolated mouse position
};

// The actual game loop
function frameLoop(timestamp) {
    requestAnimationFrame(frameLoop, Game.canvas); // Request the next frame

    if(!lastTimestamp)
        lastTimestamp = timestamp;

    let delta = timestamp - lastTimestamp;

    timeSinceLastFrame += delta;
    timeSinceLastNetFrame += delta;

    // If sufficient time has passed since the last frame, execute another frame
    if(timeSinceLastFrame >= frameInterval) {
        timeSinceLastFrame -= frameInterval;

        const dt = delta / 1000.0;

        // Calculate Game.otherMousePosSmooth
        if(Game.otherMousePos) {
            if(!Game.otherMousePosSmooth)
                Game.otherMousePosSmooth = Game.otherMousePos;
    
            Game.otherMousePosSmooth = Util.vecLerp(Game.otherMousePosSmooth, Game.otherMousePos, 5.0 * dt);
        }

        // Invoke the tick event
        Game.tick(dt, ctx);
    }

    // If sufficient time has passed since the last network tick, execute another network tick
    if(timeSinceLastNetFrame >= netFrameInterval) {
        timeSinceLastNetFrame -= netFrameInterval;

        // Send mouse position to the other player
        Game.sendMousePosition();

        // Also send whatever the player returns in Game.netTick()
        NetworkBuffer.writeAll(Game.netTick(delta / 1000.0));
        NetworkBuffer.flush();
    }

    lastTimestamp = timestamp;
}

// Sends data in the form of JSON to the other client, and the other 
// client will receive this data in his Game.netReceive()
Game.send = data => {
    GameNetwork.send({
        type: GameNetwork.EVENT_GAME_DATA,
        data: data || { }
    });
};

// Self explanatory
Game.canvasEvent = (eventName, callback) => {
    Game.canvas.addEventListener(eventName, callback, false);
};

// Called when the both players have connected to the room
Game.init = () => {
    Game.canvas = $("#game-canvas").get(0);
    ctx = Game.canvas.getContext("2d");

    // Automatically handle setting Game.selfMousePos
    Game.canvasEvent("mousemove", e => {
        Game.selfMousePos = Util.browserToCanvasCoords(Game.canvas, e);
    });
    Game.canvasEvent("touchmove", e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        Game.selfMousePos = Util.browserToCanvasCoords(Game.canvas, e.touches[0]);
    });

    // Emit Game.onMouseDown on the canvas' "mousedown" event
    Game.canvasEvent("mousedown", e => {
        if(Game.overrideMouseDown) return;

        Game.selfMousePos = Util.browserToCanvasCoords(Game.canvas, e);

        let clickedStack;
        
        const canSelectCard = !CardStacks.interactWithContextMenus();

        if(canSelectCard)
            clickedStack = CardStacks.getHoveredStack();
        
        Game.onMouseDown(e, Util.browserToCanvasCoords(Game.canvas, e), clickedStack);

        NetworkBuffer.flush();
    });

    // Emit Game.onTouchStart on the canvas' "touchstart" event
    Game.canvasEvent("touchstart", e => {
        if(Game.overrideTouchStart) return;

        e.preventDefault();
        e.stopImmediatePropagation();


        let touchedStacks = [ ];
        
        for (const touch of e.touches) {
            let pos = Util.browserToCanvasCoords(Game.canvas, touch);
            Game.selfMousePos = pos;
            const canSelectCard = !CardStacks.interactWithContextMenus(pos);

            if(canSelectCard)
                touchedStacks.push(CardStacks.getHoveredStack(pos));
        }

        Game.selfMousePos = Util.browserToCanvasCoords(Game.canvas, e.touches[0]);
        
        Game.onTouchStart(e, Array.from(e.touches).map(x => Util.browserToCanvasCoords(Game.canvas, x)), touchedStacks);
        
        NetworkBuffer.flush();
    });

    Game.canvasEvent("click", e => {
        if(window.isMobile()) {
            // https://www.w3schools.com/howto/howto_js_fullscreen.asp
            if (Game.canvas.requestFullscreen) {
                Game.canvas.requestFullscreen();
            } else if (Game.canvas.webkitRequestFullscreen) { /* Safari */
                Game.canvas.webkitRequestFullscreen();
            } else if (Game.canvas.msRequestFullscreen) { /* IE11 */
                Game.canvas.msRequestFullscreen();
            }
        }
    });

    Game.onInit();
    
    requestAnimationFrame(frameLoop, Game.canvas);
};

// Receive all built-in network events
Game.netReceiveDefault = data => {
    Game.receiveOtherMousePos(data); // Receive the other player's mouse position
    Game.receiveResetEvent(data); // Receive the "reset game" event if it ever comes
    CardStacks.receiveNetworkEvents(data); // Receive all the events related to card stacks
    EffectAreas.receiveNetworkEvents(data); // Receive all the events related to effect areas
    Notifications.receiveMessages(data); // Receive any event messages 
}

// Receive the other player's mouse position
Game.receiveOtherMousePos = data => {
    if(data.mousePos) {
        data.mousePos.forEach(function(e) {
            Game.otherMousePos = e.pos;
            if(e.immediate)
                Game.otherMousePosSmooth = e.pos;
        });
    }
}

// Resets the game for both clients
Game.reset = () => {
    Game.send({ resetGame: true });
    Game.resetLocalClient(); 
}

// Sends Game.selfMousePos to the other client so that 
Game.sendMousePosition = (immediate = false) => {
    NetworkBuffer.write("mousePos", {
        pos: Game.selfMousePos,
        immediate: immediate
    });
}

// Receive any reset requests
Game.receiveResetEvent = data => {
    // Not written through network buffer so not in an array
    if(data.resetGame) {
        Notifications.send("The other player has reset the game");
        Game.resetLocalClient();
    }
    
}

Game.onInit = Util.emptyClosure;
Game.resetLocalClient = Util.emptyClosure;
Game.tick = Util.emptyClosure;
Game.onMouseDown = Util.emptyClosure;
Game.onTouchStart = Util.emptyClosure;
Game.netReceive = Game.netReceiveDefault;
Game.netTick = () => ({ });
