# How to Set-Up

Everything required for the game(s) is inside the folder 
"card-game". If you want to have this set up on a server 
then make sure the entire folder is uploaded to the 
server.

There is no other set up needed. Just connect to the 
root index.html on both clients and everything *should*
work.
	https://domain/card-game/index.html

If you are trying to use the editor, then go to
	https://domain/card-game/res/editor/index.html


If being set up on a node server the devserver.js can 
then be used. This is can be done with the command
```
node devserver.js port
```
where port is the port number you want the server to 
run on. This can then be connected to via
	https://domain:port/


A web example can be found at https://www.jacobhuber.ca/cards 
which is being hosted on GitHub.


# Changing which deck is used

This is all done inside the *res/game/info.js*

- Defaulted to look for the deck inside of *res/game/decks*
- Change the variable *deckFileName* inside of *info.js* to swap the deck
- Change the variable *deckFolder* inside of *info.js* to change the folder to look for decks in
- Current working directory is inside of *res/game*