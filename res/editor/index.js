/*
* This file handles all javascript for the editor. This means it
* is in control of all DOM interactions as well as any deck
* creation and saving/loading.
*/


// Framework todo list:
//
// - stack.js draw() [x]
// 		- load proper card back
// - stack.js updateEffectAreaInfluence()
// 		- can only stack cards from same stack? or can only stack cards of same size?
// - stack.js constructor()
// 		- change card data structure
//		- change card size based off of image
// - spritemanager.js loadImage() [x]
// 		- load from json base64
// - gamelogic.js Game.resetLocalClient() [x]
// - util.js card names (maybe just remove) [x]

// Editor todo list:
//
// - Add card modal to change count and remove card
// - Add delete button for stack
// - Add error checking for image size within same stack
// - Comments!
// - File/deck name?
// - Stack starting position
// - Canvas colour

// { deckName: "...", background: "...", stacks: {stacks} }
let jsonOutput = {
	deckName: "Deck",
	background: "",
	stacks: null
};

// stackName : { image: base64, cards: [arrayOfCards], pos: {x, y} }
// cards : [ { base64: "...", count: 1 }, ... ]
let stacks = {};
let currentCard = 0;

let editor;

// Keeps canvas blank from deck.json
Game.resetLocalClient = Util.emptyClosure;

// Adds button functionality
$(document).ready(() => {
	const deckCreateBtn = $("#deck-create-btn");
	const deckBgBtn = $("#deck-bg-btn");
	const deckCodeBtn = $("#deck-code-btn");
	const deckSaveBtn = $("#deck-save-btn");
	const deckExitBtn = $("#deck-exit-btn");
	const modalCancelBtn = $(".modal-cancel-btn");
	const stackConfirmBtn = $("#stack-confirm-btn");
	const stackDeleteBtn = $("#stack-delete-btn");
	const cardConfirmBtn = $("#card-confirm-btn");
	const cardDeleteBtn = $("#card-delete-btn");
	//const stackClass = $(".stack");

	// Canvas Settings
	$("canvas").bind('contextmenu', () => false); // Disable canvas context menu
    $("canvas").attr("width", GAME_INFO.gameWidth);
    $("canvas").attr("height", GAME_INFO.gameHeight);

    GameNetwork.offline = true;
    onGameBegin();

	// Switches to deck create screen
	deckCreateBtn.click(() => {
		resetEditor();
		switchToDeckEditor();
	});

	// Clicking deckBgBtn will click file input #bg-upload
	deckBgBtn.click(() => {
		$("#bg-upload").click();
	})

	deckCodeBtn.click(() => {
		$("#modal-container").show();
		$("#modal-edit-code").show();
	});

	// Saves the deck to a .json file
	deckSaveBtn.click(() => {
		downloadDeck();
	});

	// Exits deck create screen
	deckExitBtn.click(() => {
		$(".join-menu-container").show();
    	$("#game").hide();
		$("#deck-menu").show();
		$("#deck-editor").hide();
	});

	modalCancelBtn.click(() => {
		closeModal();
	});

	stackConfirmBtn.click(createStack);
	stackDeleteBtn.click(deleteStack);
	cardConfirmBtn.click(cardEditConfirm);
	cardDeleteBtn.click(deleteCard);


	editor = ace.edit("editor");
    editor.session.setUseWorker(false);
    editor.session.setMode("ace/mode/javascript");
});

/*
* Event to setup canvas
*
* Called when clicking 'Create a Deck'
*/
$(document).on("gamebegin", () => {
    Game.init();
});

function switchToDeckEditor() {
	$("#deck-menu").hide();
    $(".join-menu-container").hide();
	$("#deck-editor").show();
    $("#game").show();
}


/*
* Hides all modals
*/
function closeModal() {
	$("#modal-container").hide();
	$("#modal-container").children().hide();
}

/*
* Resets internal data structures
* representing deck
*/
function resetEditor() {
	jsonOutput = {
		deckName: "Deck",
		background: "",
		stacks: null
	};

	stacks = {};
	currentCard = 0;

	DeckManager.background = null;

	initializeStacks();

	$("#section-cards").hide();
}

/*
* Adds every stack from stacks object
* to DOM.
*
* Useful for loading a deck file.
*/
function initializeStacks() {
	// Remove all stacks that aren't '#add-stack'
	$(".stack:not(:last)").remove();

	// Remove stacks from canvas
	CardStacks.reset();

	// Makes '+ stack' create a new stack when clicked
	$("#add-stack").click(callbackAddStack);

	for (let name in stacks) {
		const cards = stacks[name].cards;

		addStackToBoard(name);
		addStackToDom(name);
	}

	// Select first stack
	const allStacks = $(".stack:not(:last)");

	if (allStacks.length) {
		allStacks[0].click();
	}
}

/*
* Callback for onchange of #deck-upload input
*
* Reads file into global stacks object
* then adds all stacks to dom and
* switches to editor view.
*/
function uploadDeck(element) {
	const deck = element.files[0]; // stacks object as type File
	const reader = new FileReader(); // reader to read File

	// Function after deck File is read
	reader.onloadend = function() {
		// set global stacks object to stacks object from file
		jsonOutput = JSON.parse(reader.result);
		stacks = jsonOutput.stacks;

		initializeStacks(); // Add all stacks to DOM
		setNewBackground(jsonOutput.background);
		
		switchToDeckEditor();

		editor.session.getDocument().setValue(jsonOutput.code);
	}

	reader.readAsText(deck); // Read deck JSON as text
}

/*
* Callback for deckSaveBtn onclick
* 
* Saves the deck to a .json file
* https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
*/
function downloadDeck() {
	// Add stack positions to json
	saveStackPosition();

	jsonOutput.stacks = stacks;
	jsonOutput.code = editor.session.getDocument().getValue();

	const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(jsonOutput));
	const dlAnchorElem = $("#downloadAnchorElem");
	dlAnchorElem.attr("href", dataStr);
	dlAnchorElem.attr("download", jsonOutput.deckName + ".json");
	dlAnchorElem[0].click();
}

/*
* For all CardStacks on the game board
* save their current position to their
* representation.
*/
function saveStackPosition() {
	for (const stackName in stacks) {
		const stack = stacks[stackName];
		const cardStack = CardStacks.find(stack.stackID);
		stack.pos = cardStack.pos;
	}
}

/*
* Callback function for onchange of #bg-upload
*
* The file (image) uploaded is converted into
* base64, which is passed to the setNewBackground
* function setting the bg image of the canvas to it.
*/
async function uploadNewBackground(element) {
	const src = await convertFileToURL(element.files[0]);

	setNewBackground(src);
}

/*
* Stores background image into jsonOutput
* as well as setting the editor's canvas
* bg image
*/
function setNewBackground(base64) {
	jsonOutput.background = base64;

	if (base64) Sprites.loadBackground(base64);
	else DeckManager.background = null;
}

/*
* Callback for #add-stack card
*
* Shows modal for adding a stack
*/
function callbackAddStack() {
	$("#modal-container").show();
	$("#modal-add-stack").show();
}

/*
* Callback for modal confirm
*
* Adds a new stack to stacks object and
* adds the stack to the DOM.
*/
async function createStack() {
	const name = $("#modal-text-field").val();

	if (name == null || name.length == 0) return;
	if (name in stacks) return;

	const files = $("#modal-file-field").prop("files");
	if (files.length != 1) return;

	const src = await convertFileToURL(files[0]);
	const isFacedown = $("#modal-facedown-field").is(":checked");


	closeModal();

	stacks[name] = {
		image : src,
		cards : [],
		pos : {x: 0, y: 0},
		isFacedown : isFacedown
	};

	addStackToBoard(name);
	addStackToDom(name);
}

function deleteStack() {
	const name = getCurrentStack();

	delete stacks[name];
	saveStackPosition();
	initializeStacks();

	closeModal();
}

function deleteCard() {
	const stackName = getCurrentStack();

	stacks[stackName].cards.splice(currentCard, 1);
	switchStack();

	closeModal();
}

function addStackToBoard(name) {
	const stack = stacks[name];

	// Board placement
	Sprites.loadOneBase64CardBack(name, stack.image);
	Sprites.loadOneBase64(name, 0, stack.image);

	// Unique card identifier
	const data = {
		"stack" : name,
		"index" : 0,
	};

	const cardStack = CardStacks.instantiate([data], stack.pos, false, true);

	stack["stackID"] = cardStack.id;
}

/*
* Uses name as a key to add a stack to the DOM
*/
function addStackToDom(name) {
	const newStack = $("<span></span>"); // New span to use as DOM stack
	
	// Visual 
	newStack.text(name);
	newStack.addClass("stack");
	newStack.css("background-image", "url(" + stacks[name].image + ")");

	// Functional
	newStack.click(stackOnClick);

	// Adds to end of stack list (but before '+ stack')
	newStack.insertBefore($("#add-stack"));
}

function getCurrentStack() {
	return $(".stack.selected").text();
}

/*
* Callback for clicking a stack
*/
function stackOnClick() {
	if ($(this).text() == getCurrentStack()) {
		openStackSettings();
		return;
	}

	let name;
	let cardStack;
	
	name = getCurrentStack();
	if (name) {
		cardStack = CardStacks.find(stacks[name].stackID);
		if (cardStack) cardStack.isSelected = false;
	}

	$(".stack").removeClass("selected");
	$(this).addClass("selected");

	$("#section-cards").show();

	switchStack(); // Switches all card DOM

	name = getCurrentStack();
	if (name) {
		cardStack = CardStacks.find(stacks[name].stackID);
		if (cardStack) cardStack.isSelected = true;
	}
}

/*
* Called when clicking a stack that's
* already selected.
*
* Opens stack edit modal and sets
* image to stack image
*/
function openStackSettings() {
	$("#modal-edit-stack").children().first().text("Delete " + getCurrentStack() + "?");

	$("#modal-container").show();
	$("#modal-edit-stack").show();

	const stack = stacks[getCurrentStack()];

	$("#image-edit-stack").prop("src", stack.image);
}

/*
* Removes all currently displayed cards from DOM
* then adds all cards in current stack to DOM
*/
function switchStack() {
	// Removes all cards that aren't "#add-card"
	$(".card:not(:last)").remove();

	// Gets list of cards in current stack
	const name = getCurrentStack();

	if (name) {
		const cards = stacks[name].cards;

		// Adds every card in stack to DOM
		for (let i = 0; i < cards.length; i++) {
			addCardToDom(cards[i].base64);
		}
	}
}

/*
* Given a File (via input type=file), will
* read it as a URL and return the result
* asynchronously.
*
* Used to convert images to base64
*/
function convertFileToURL(file) {
	let readerPromise = new Promise((resolve, reject) => {
		const reader = new FileReader();

		reader.onloadend = function() {
			resolve(reader.result);
		}

		reader.readAsDataURL(file);
	});

	return readerPromise;
}

/*
* Callback function for onchange of #card-upload
*
* For every file (image) uploaded, will get its
* base64 representation, add it to the DOM and
* stacks object
*/
async function uploadNewCards(element) {
	for (let i = 0; i < element.files.length; i++) {
		const src = await convertFileToURL(element.files[i])
		addCard(src);
	}
}

/*
* Adds a card to current stack in stacks object
* and adds the card to the DOM
*
* src = base64 image
*/
function addCard(src) {
	const key = getCurrentStack();
	stacks[key].cards.push({ base64 : src, count : 1});

	addCardToDom(src);
}

/*
* Creates a new span to add to the DOM,
* adding a class and setting its background
* to the src
*
* src = base64 image
*/
function addCardToDom(src) {
	const newCard = $("<span></span>"); // New span to use as DOM stack
	
	// Visual
	
	// Without this, CSS layout of cards
	// does not align with the '+ card'.
	newCard.text(".");

	newCard.addClass("card");
	newCard.css("background-image", "url(" + src + ")");

	// Functional
	const index = $(".card").length - 1;
	newCard.click(() => {
		cardOnClick(index);
	});

	// Adds to end of card list (but before '+ card')
	newCard.insertBefore($("#add-card"));
}

/*
* Callback for clicking a card
*
* Opens the card edit modal for
* changing card count or deleting
* a card.
*/
function cardOnClick(index) {
	currentCard = index;

	$("#modal-container").show();
	$("#modal-edit-card").show();

	const card = stacks[getCurrentStack()].cards[currentCard];

	$("#image-edit-card").prop("src", card.base64);
	$("#modal-card-count").val(parseInt(card.count));
}

/*
* Callback for #card-confirm-btn click
*
* Updates card count
*/
function cardEditConfirm() {
	const card = stacks[getCurrentStack()].cards[currentCard];
	
	// Can't have 0 or negative cards
	let val = $("#modal-card-count").val();
	if (val <= 0) val = 1;
	card.count = val; 

	closeModal();
}