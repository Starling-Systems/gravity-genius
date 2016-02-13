window.addEventListener('load', startGame);

function stepRocket(gameState, constants) {
    var distx = (gameState.planetPos[0] - gameState.rocketPos[0]);
    var disty = (gameState.planetPos[1] - gameState.rocketPos[1]);
    var r = Math.sqrt(dx^2 + dy^2);
    var cosTheta = distx / r;
    var sinTheta = disty / r;

    // find the (radial) acceleration on the rocket due to the planet
    var aRadial = constants.G * constants.planetMass / r^2;
    // find the velocity change of the rocket in the (radial) direction of the planet
    // a = dv / dt  => dv = a * dt
    var dvRadial = aRadial * constants.dt;
    // resolve the radial velocity change into x and y components:
    var dvx = dvRadial * cosTheta;
    var dvy = dvRadial * sinTheta;
    // find the new velocity
    var vx = gameState.rocketVel[0] + dvx;
    var vy = gameState.rocketVel[1] + dvy;
    // find the change in position in x and y
    var dx = vx * constants.dt;
    var dy = vy + constants.dt;
    // find the updated position
    var x = gameState.rocketPos[0] + dx;
    var y = gameState.rocketPos[1] + dy;

    var newGameState = {
        rocketPos: [x, y],
        rocketVel: [vx, vy],
        planetPos: gameState.planetPos // approximately no movement in planet
    };

    return newGameState;
}

function startGame() {
    var constants = {
        planetMass: 1.0,
        rocketMass: 0.0001,
        G: 1.0, // gravitational constant
        dt: 0.001, // simulation time step
    };

    var initialGameState = {
        rocketPos: [0.6, 0.6],
        rocketVel: [0.0, 0.0],
        planetPos: [0.5, 0.5]
    };

    var canvas = document.getElementById("myCanvas");
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var ctx = canvas.getContext("2d");

    var gameState = initialGameState;
    function stepGameState() {
        requestAnimationFrame(stepGameState);

        gameState = stepRocket(gameState, constants);
        // clear the canvas for the next draw:
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        var x = gameState.rocketPos[0];
        var y = gameState.rocketPos[1];
        var xCanvas = x * canvasWidth;
        var yCanvas = y * canvasHeight;
        // draw the rocket
        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.arc(xCanvas, yCanvas, 5, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.closePath();
        // draw the planet
        var xPlanet = gameState.planetPos[0];
        var yPlanet = gameState.planetPos[1];
        var xPlanetCanvas = xPlanet * canvasWidth;
        var yPlanetCanvas = yPlanet * canvasHeight;
        // draw the rocket
        ctx.beginPath();
        ctx.fillStyle = 'blue';
        ctx.arc(xPlanetCanvas, yPlanetCanvas, 15, 0, 2*Math.PI, false);
        ctx.fill();
        ctx.closePath();
    }

    stepGameState();

}
