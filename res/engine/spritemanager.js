// The directory to search for when looking for sprites
const IMAGE_DIR = "res/images/";

var Sprites = { 
    _sprites: [ ] // Internal cache of sprites
};

const loadImage = src => {
    const img = new Image();
    img.src = src;
    return img;
};

Sprites.loadBackground = (base64) => {
    const image = loadImage(base64);
    DeckManager.background = image;
}

// Loads one base64 image as a sprite
// when loading custom decks
Sprites.loadOneBase64 = (stack, index, base64) => {
    const name = stack + index.toString();
    Sprites._sprites[name] = loadImage(base64);
}

Sprites.loadOneBase64CardBack = (stack, base64) => {
    Sprites._sprites[stack] = loadImage(base64);
}

// Loads many sprites in advance, given an array of filenames
// inside res/images
Sprites.load = list => {
    for (const name of list) {
        Sprites._sprites[name] = loadImage(IMAGE_DIR + name);
    }
};

// Loads one sprite in advance
Sprites.loadOne = name => {
    Sprites.load([ name ]);
}

// Gets a sprite by its filename (of type Image)
Sprites.get = name => {
    let sprite = Sprites._sprites[name];
    if(!sprite) {
        Sprites.loadOne(name);
        sprite = Sprites._sprites[name];
    }
    return sprite;
};

// Returns whether or not a sprite is loaded already
Sprites.isLoaded = name => Sprites._sprites[name];