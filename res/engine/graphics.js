var Graphics = { };

// Clears the canvas
Graphics.clear = (g, col="black") => {
    if (DeckManager.background) {
        Graphics.fillCanvasBackground(g);
    } else {
        Graphics.fillCanvasColour(g, col);
    }
};

// I expected I'd need a lot more graphical functions
// but apparently not. Feel free to add your own.

// Clears the canvas a certain colour
Graphics.fillCanvasColour = (g, col) => {
    g.fillStyle = col;
    g.fillRect(0, 0, Game.WIDTH, Game.HEIGHT);
}

// Clears the canvas to the bg image
Graphics.fillCanvasBackground = (g) => {
    g.drawImage(DeckManager.background, 0, 0, Game.WIDTH, Game.HEIGHT);
}