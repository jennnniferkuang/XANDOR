var DeckManager = {
	deckFilePath: window.location.pathname + "res/game/" + GAME_INFO.deckFolder + "/" + GAME_INFO.deckFileName,
	// [ [{"stack": ..., "index": ...}, ...], ... ]
	decks: [ ],
	background: null,
	json: null
};

// Loads /res/game/GAME_INFO.deckFileName.json from server, then processes it
$.getJSON(DeckManager.deckFilePath, function(data) {
	DeckManager.json = data;
	DeckManager.loadDeck(data); // Set up stacks for instantiation
	DeckManager.loadImages(data); // Load card images into cache
})
.fail(function(jqXHR, textStatus, errorThrown) { 
	console.log("Warning: Could not find deck at path '" + DeckManager.deckFilePath + "'");
	showErrorMessage("No deck with file name '" + GAME_INFO.deckFileName + "'");
});

// Sets up an array of cards to be
// used to instantiate a CardStack
DeckManager.loadDeck = json => {
	for (const stackName in json.stacks) {
		let newStack = []; 

		const cards = json.stacks[stackName].cards;
		for (const i in cards) {
			const card = cards[i];

			// Unique card identifier
			const data = {
				"stack" : stackName,
				"index" : i,
			};

			for (let j = 0; j < card.count; j++) newStack.push(data);
		}

		const stack = {
			pos: json.stacks[stackName].pos,
			cards: newStack,
			isFacedown: json.stacks[stackName].isFacedown
		}

		DeckManager.decks.push(stack);
	}
}

DeckManager.loadImages = json => {
	for (const stackIndex in DeckManager.decks) {
		const stack = DeckManager.decks[stackIndex].cards; // List of cards in stack

		const stackName = stack[0].stack; // Name of stack
		Sprites.loadOneBase64CardBack(stackName, json.stacks[stackName].image);

		// Pre-Loads image for every card in stack
		for (const cardIndex in stack) {
			const card = stack[cardIndex]; // Unique card identifier
			const base64 = json.stacks[card.stack].cards[card.index].base64;
			Sprites.loadOneBase64(card.stack, card.index, base64);
		}
	}

	if (json.background) Sprites.loadBackground(json.background);
}

// Instantiates all cards onto canvas
// and runs deck specific code on host
DeckManager.createCardStacks = () => {
	// Instantiate a stack for each deck
    for (const i in DeckManager.decks) {
        const stack = DeckManager.decks[i];

        CardStacks.instantiate(stack.cards, stack.pos, stack.isFacedown, true);
    }

    // Run deck specific code
	if (GameNetwork.isHost) {
    	try {
    		eval(DeckManager.json.code);
	    } catch (err) {
	    	console.log(err.message);
	    }
	}
}