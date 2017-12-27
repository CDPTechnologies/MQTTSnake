var client = new studio.api.Client(window.location.host);

var board = {};
board.size = 64;
board.squareSize = 1;
board.directionmap = [{x:1,y:0}, {x:0,y:1}, {x:-1,y:0}, {x:0,y:-1}];
board.food = [];

var snake = {};
snake.body = [{x:32,y:32}];
snake.direction = 0;

client.find("MQTTSnakeApp.MQTTClient.SubscribeTopic").then(function (child) {
    child.subscribeToValues(function (value, time) {
        snake.move = value;
        
        if(value == 0)
            snake.forward();
        else if(value == 2)
            snake.turnLeft();
        else if(value == 3)
            snake.turnRight();
    });
});

board.spawnFood = function(){
    board.food[floor(random()*board.size)][floor(random()*board.size)] = true;
}

snake.forward = function(){
    snake.body.unshift({
            x:(snake.body[0].x + board.directionmap[snake.direction].x + board.size)%board.size,
            y:(snake.body[0].y + board.directionmap[snake.direction].y + board.size)%board.size
        });
    if(board.food[snake.body[0].x][snake.body[0].y] == true)
        board.food[snake.body[0].x][snake.body[0].y] = false;
    else
        snake.body.pop();
    
    if(random()<0.2)
        board.spawnFood();
}

snake.turnRight = function(){
    snake.direction += 3;
    snake.direction %= 4;
}

snake.turnLeft = function(){
    snake.direction += 1;
    snake.direction %= 4;
}

function setup() {
    var canvasSize = min(windowHeight,windowWidth);
    createCanvas(canvasSize, canvasSize);
    board.squareSize = canvasSize / board.size;
    for(i = 0; i<board.size; i++)
        board.food[i]=[];
}

function draw() {
    background(0);

    for(var i=0; i<snake.body.length; i++){
        var p = snake.body[i];
        fill(color(255,0,0));
        rect(p.x * board.squareSize, p.y * board.squareSize, board.squareSize, board.squareSize);
    }

    for(i = 0; i<board.size; i++)
        for(j = 0; j<board.size; j++)
            if(board.food[i][j]){
                fill(color(0,255,0));
                rect(i * board.squareSize, j * board.squareSize, board.squareSize, board.squareSize);
            }
}