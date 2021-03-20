let app = require("express")();
let http = require("http").createServer(app);
//const { default: Player } = require("../client/src/game/Player.js");
let Game = require("./GameClass.js");
let Player = require("./PlayerClass.js");
const PORT = 8080;

let games = {};

let io = require("socket.io")(http);

app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
})

//app.use(require("express").static("public"));

http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});

io.of("/").adapter.on("delete-room", room => {
    if(games[room]) delete games[room];
});

io.sockets.on("connection", socket => {
    socket.on("try join game", data => {
        let gameID = data.gameID;
        let activeGame = null;

        if(games[gameID]) {
            activeGame = games[gameID];
        }
        else {
            activeGame = new Game(data);
            activeGame.setMod(socket);
            games[gameID] = activeGame;

        }
        socket.nickname = data.nickname;
        let player = new Player(socket);
        activeGame.joinGame(socket, ()=>{
            socket.join(gameID);
            socket.gameID = gameID;
            activeGame.updateAllPlayers();
        }, (err) => {
            socket.emit("error", `There was an error connecting to the game: ${err}`);
        });
    });
    socket.on("disconnecting", () => {
        let gameID = socket.gameID;
        if(gameID !== undefined) {
            games[gameID].playerLeavesGame(socket);
        }
    });

    //actual game logic goes here

    socket.on("make thief", thiefSocketID => {
        let gameID = socket.gameID;
        if(gameID !== undefined) {
            //games[gameID].playerLeavesGame(socket);
            let game = games[gameID];
            if(game !== undefined) {
                game.authenticateUser(socket.client.id, () => {
                    //console.log(socket.to(thiefSocketID), thiefSocketID, gameID);
                    game.setThief(thiefSocketID);
                    game.updateAllPlayers();
                });
            }
            else socket.emit("error", "There was an error making the thief: No Game found");
        }
        else socket.emit("error", "There was an error making the thief: No Game found");
    })
});