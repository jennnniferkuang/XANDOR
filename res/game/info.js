const GAME_INFO = {
    name: "Card Game Template", // Game title, used in various places

    // Game canvas dimentions
    gameWidth: 1024,
    gameHeight: 576,

    targetFramerate: 60, // Game render and update framerate per second
    networkTickrate: 10, // Network tickrate per second

    deckFolder: "decks", // The folder to look for decks
    deckFileName: "xandor.json", // The deck filename to load relative to deckFolder

    // Default card dimensions (these can be overriden per-instance)
    defaultCardWidth: 88,
    defaultCardHeight: 120,
    defaultCardVerticality: 2, // Offset of each additional card in a stack
    defaultCardShiftCap: 20, // Max cards to draw in a stack

    cardSnapDistance: 30, // Max distance to snap cards

    contextMenuWidth: 150, // Context menu total width
    contextMenuItemHeight: 25, // The height of each context menu item

    // Interval in milliseconds in which 2 successive clicks will be counted 
    // as a double-click
    doubleClickInterval: 500,
    
    // Same as doubleClickInterval but for mobile taps
    doubleTapInterval: 1000
};