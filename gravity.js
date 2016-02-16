;(function() {
    window.addEventListener('load', startGame);
})();

function stepRocket(gameState, constants) {
    var distx = (gameState.rocketPos[0] - gameState.planetPos[0]);
    var disty = (gameState.rocketPos[1] - gameState.planetPos[1]);
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
    //console.log("dvx, dvy = " + dvx + ", " + dvy);
    // find the new velocity
    var vx = gameState.rocketVel[0] + dvx;
    var vy = gameState.rocketVel[1] + dvy;
    //console.log('vx = ' + vx);
    //console.log('vy = ' + vy);
    // find the change in position in x and y
    var dx = vx * constants.dt;
    var dy = vy * constants.dt;
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
        rocketMass: 0.0000001,
        G: 10.0, // gravitational constant
        dt: 0.001, // simulation time step
    };

    var initialGameState = {
        rocketPos: [0.7, 0.7],
        rocketVel: [-1.0, 0.0],
        planetPos: [0.5, 0.5]
    };

    var runningQ = false;
    var startButton = document.getElementById('start');
    startButton.addEventListener('click', function() {
        runningQ = true;
        stepGameState();
    });
    var stopButton = document.getElementById('stop');
    stopButton.addEventListener('click', function() {
        runningQ = false;
    });

    var canvas = document.getElementById("myCanvas");
    var canvasWidth = canvas.width;
    var canvasHeight = canvas.height;
    var ctx = canvas.getContext("2d");

    var gameState = initialGameState;
    function stepGameState() {
        if (!runningQ) return;
        requestAnimationFrame(stepGameState);

        gameState = stepRocket(gameState, constants);
        // clear the canvas for the next draw:
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        var x = gameState.rocketPos[0];
        var y = gameState.rocketPos[1];
        //console.log("x, y = " + x + ", " + y);
        var xCanvas = x * canvasWidth;
        var yCanvas = (1.0 - y) * canvasHeight;
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
