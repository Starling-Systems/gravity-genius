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
    // target has a stronger gravity field:
    var oldG = constants.G;
    constants.G = constants.G * constants.targetForceMultiplier;
    var dvTarget = dvFromPlanet(gameState.targetPosition, gameState.rocketPos, constants);
    constants.G = oldG;
    //console.log("dvx, dvy = " + dvx + ", " + dvy);
    // update the velocity due to the pull of each planet:
    var vx = gameState.rocketVel[0];
    var vy = gameState.rocketVel[1];
    dvEachPlanet.forEach(function(dv) {
        vx += dv[0];
        vy += dv[1];
    });
    // update the velocity from the pull of the target:
    vx += dvTarget[0];
    vy += dvTarget[1];

    // update the velocity from the accelerometer
    var dvxAccelerometer = constants.accelerometerFactor * gameState.accelerometer[0] * constants.dt;
    var dvyAccelerometer = constants.accelerometerFactor * gameState.accelerometer[1] * constants.dt;
    vx += dvxAccelerometer;
    vy += dvyAccelerometer;

    //console.log('vx = ' + vx);
    //console.log('vy = ' + vy);
    // if the rocket is inside the target, the target slows it down:
    if ((gameState.rocketPos[0] <= gameState.targetPosition[0] + constants.targetWidth/2) &&
        (gameState.rocketPos[0] >= gameState.targetPosition[0] - constants.targetWidth/2) &&
        (gameState.rocketPos[1] <= gameState.targetPosition[1] + constants.targetWidth/2) &&
        (gameState.rocketPos[1] >= gameState.targetPosition[1] - constants.targetWidth/2)) {
            vx = 0.0;
            vy = 0.0;
    }
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
        rocketPos: [x, y], // FIXME: rename to rocketPosition
        rocketVel: [vx, vy], // FIXME: rename to rocketVelocity
        planetPositions: gameState.planetPositions, // approximately no movement in planets
        targetPosition: gameState.targetPosition
    };

    return newGameState;
}

function renderGame(gameState, constants, graphics) {
    // clear the canvas for the next draw:
    graphics.ctx.clearRect(0, 0, graphics.canvasWidth, graphics.canvasHeight);
    // draw the planets
    gameState.planetPositions.forEach(function(planetPos) {
        var xPlanet = planetPos[0];
        var yPlanet = planetPos[1];
        var xPlanetCanvas = xPlanet * graphics.canvasWidth;
        var yPlanetCanvas = (1.0 - yPlanet) * graphics.canvasHeight;
        /*
        var distx = (x - xPlanet);
        var disty = (y - yPlanet);
        var r = Math.sqrt(Math.pow(distx, 2) + Math.pow(disty, 2));
        //console.log(r*r);
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
    // draw the target
    var xTarget = gameState.targetPosition[0];
    var yTarget = gameState.targetPosition[1];
    var xTargetCanvas = xTarget * graphics.canvasWidth;
    var yTargetCanvas = (1.0 - yTarget) * graphics.canvasHeight;
    var targetWidthCanvas = constants.targetWidth * graphics.canvasWidth;
    graphics.ctx.fillStyle = 'red';
    graphics.ctx.fillRect(xTargetCanvas - targetWidthCanvas/2.0, yTargetCanvas - targetWidthCanvas/2.0, targetWidthCanvas, targetWidthCanvas);
    // draw the rocket
    var x = gameState.rocketPos[0];
    var y = gameState.rocketPos[1];
    //console.log("x, y = " + x + ", " + y);
    var xCanvas = x * graphics.canvasWidth;
    var yCanvas = (1.0 - y) * graphics.canvasHeight;
    graphics.ctx.lineWidth = 1.0;
    graphics.ctx.fillStyle = 'black';
    graphics.ctx.beginPath();
    graphics.ctx.arc(xCanvas, yCanvas, 5, 0, 2*Math.PI, false);
    graphics.ctx.fill();
    graphics.ctx.closePath();
}

function startGame() {
    var constants = {
        planetMass: 1.0,
        rocketMass: 0.0000001,
        G: 10.0, // gravitational constant
        dt: 0.001, // simulation time step
        targetForceMultiplier: 0.1,
        targetWidth: 0.06,
        accelerometerFactor: 1.0
    };

    var planetPositions = [[0.25, 0.25], [0.75, 0.75]];
    var targetPosition = [0.5, 0.5];
    var accelerometer = [0.0, 0.0];

    var initialGameState = {
        rocketPos: [0.75, 0.1],
        rocketVel: [-1.0, 1.0],
        planetPositions: planetPositions,
        targetPosition: targetPosition,
        accelerometer: accelerometer
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
        // TODO: using planetPositions as a singleton seems janky
        while (planetPositions.length > 2)
            planetPositions.pop();
        renderGame(gameState, constants, graphics);
    });

    window.addEventListener('devicemotion', function(event) {
        if (event.accelerationIncludingGravity) {
            accelerometer = [
                event.accelerationIncludingGravity.x,
                event.accelerationIncludingGravity.y
            ];
        }
    });

    function stepGameState() {
        if (!runningQ) return;
        requestAnimationFrame(stepGameState);
        gameState = stepRocket(gameState, constants);
        renderGame(gameState, constants, graphics);
    }

    stepGameState();

}

