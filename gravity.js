;(function() {
    window.addEventListener('load', startGame);
})();

function dvFromPlanet(planetPos, rocketPos, constants) {
    var distx = (rocketPos[0] - planetPos[0]);
    var disty = (rocketPos[1] - planetPos[1]);
    var r = Math.sqrt(Math.pow(distx, 2) + Math.pow(disty, 2));
    //console.log("r = " + r);
    var dvx = dvy = 0.0;
    if (r > 0.05) {
        var cosTheta = distx / r;
        var sinTheta = disty / r;
        //console.log('sin = ' + sinTheta);
        //console.log('cos = ' + cosTheta);
        // find the (radial) acceleration on the rocket due to the planet
        var aRadial = -1.0 * constants.G * constants.planetMass / Math.pow(r, 2);
        //console.log('ar = ' + aRadial);
        // find the velocity change of the rocket in the (radial) direction of the planet
        // a = dv / dt  => dv = a * dt
        var dvRadial = aRadial * constants.dt;
        // resolve the radial velocity change into x and y components:
        dvx = dvRadial * cosTheta;
        dvy = dvRadial * sinTheta;
        //console.log('dvx = ' + dvx);
        //console.log('dvy = ' + dvy);
    }
    return [dvx, dvy];
}

function stepRocket(gameState, constants) {
    var dvEachPlanet = gameState.planetPositions.map(function(planetPos) {
        return dvFromPlanet(planetPos, gameState.rocketPos, constants);
    });
    //console.log("dvx, dvy = " + dvx + ", " + dvy);
    // update the velocity using the velocity change due to each planet:
    var vx = gameState.rocketVel[0];
    var vy = gameState.rocketVel[1];
    dvEachPlanet.forEach(function(dv) {
        vx += dv[0];
        vy += dv[1];
    });
    //console.log('vx = ' + vx);
    //console.log('vy = ' + vy);
    // find the change in position in x and y
    var dx = vx * constants.dt;
    var dy = vy * constants.dt;
    // find the updated position
    var x = gameState.rocketPos[0] + dx;
    var y = gameState.rocketPos[1] + dy;
    // use periodic boundaries
    if (x > 1.0) x = x - 1.0;
    if (x < 0.0) x = x + 1.0;
    if (y > 1.0) y = y - 1.0;
    if (y < 0.0) y = y + 1.0;
    var newGameState = {
        rocketPos: [x, y],
        rocketVel: [vx, vy],
        planetPositions: gameState.planetPositions // approximately no movement in planets
    };

    return newGameState;
}

function renderGame(gameState, constants, graphics) {
    // clear the canvas for the next draw:
    graphics.ctx.clearRect(0, 0, graphics.canvasWidth, graphics.canvasHeight);
    // draw the rocket
    var x = gameState.rocketPos[0];
    var y = gameState.rocketPos[1];
    //console.log("x, y = " + x + ", " + y);
    var xCanvas = x * graphics.canvasWidth;
    var yCanvas = (1.0 - y) * graphics.canvasHeight;
    graphics.ctx.lineWidth = 1.0;
    graphics.ctx.beginPath();
    graphics.ctx.fillStyle = 'black';
    graphics.ctx.arc(xCanvas, yCanvas, 5, 0, 2*Math.PI, false);
    graphics.ctx.fill();
    graphics.ctx.closePath();
    // draw the planets
    gameState.planetPositions.forEach(function(planetPos) {
        var xPlanet = planetPos[0];
        var yPlanet = planetPos[1];
        var xPlanetCanvas = xPlanet * graphics.canvasWidth;
        var yPlanetCanvas = (1.0 - yPlanet) * graphics.canvasHeight;
        var distx = (x - xPlanet);
        var disty = (y - yPlanet);
        var r = Math.sqrt(Math.pow(distx, 2) + Math.pow(disty, 2));
        //console.log(r*r);
        /*
        graphics.ctx.beginPath();
        graphics.ctx.lineWidth = Math.min(0.1/(r*r), 3.0);
        graphics.ctx.moveTo(xCanvas, yCanvas);
        graphics.ctx.lineTo(xCanvas + 0.2*(xPlanetCanvas - xCanvas), yCanvas + 0.2*(yPlanetCanvas - yCanvas));
        graphics.ctx.stroke();
        graphics.ctx.closePath();
        */
        graphics.ctx.lineWidth = 1.0;
        graphics.ctx.beginPath();
        graphics.ctx.fillStyle = 'blue';
        graphics.ctx.arc(xPlanetCanvas, yPlanetCanvas, 15, 0, 2*Math.PI, false);
        graphics.ctx.fill();
        graphics.ctx.closePath();
    });
}

function startGame() {
    var constants = {
        planetMass: 1.0,
        rocketMass: 0.0000001,
        G: 10.0, // gravitational constant
        dt: 0.001, // simulation time step
    };

    var planetPositions = [[0.25, 0.25], [0.75, 0.75]];

    var initialGameState = {
        rocketPos: [0.75, 0.1],
        rocketVel: [-1.0, 1.0],
        planetPositions: planetPositions
    };

    var runningQ = false;
    var startButton = document.getElementById('start');
    startButton.addEventListener('click', function() {
        runningQ = true;
        stepGameState();
    });
    var pauseButton = document.getElementById('pause');
    pauseButton.addEventListener('click', function() {
        runningQ = false;
    });

    var graphics = {};
    graphics.canvas = document.getElementById("myCanvas");
    graphics.canvasWidth = graphics.canvas.width;
    graphics.canvasHeight = graphics.canvas.height;
    graphics.ctx = graphics.canvas.getContext("2d");

    graphics.canvas.addEventListener('click', function(event) {
        var xCanvas = event.pageX - graphics.canvas.offsetLeft;
        var yCanvas = event.pageY - graphics.canvas.offsetTop;
        var x = xCanvas / graphics.canvas.width;
        var y = yCanvas / graphics.canvas.height;
        y = 1.0 - y;
        planetPositions.push([x, y]);
    });

    var gameState = initialGameState;
    renderGame(gameState, constants, graphics);

    var resetButton = document.getElementById('reset');
    resetButton.addEventListener('click', function() {
        runningQ = false;
        gameState = initialGameState;
        renderGame(gameState, constants, graphics);
    });


    function stepGameState() {
        if (!runningQ) return;
        requestAnimationFrame(stepGameState);
        gameState = stepRocket(gameState, constants);
        renderGame(gameState, constants, graphics);
    }

    stepGameState();

}

