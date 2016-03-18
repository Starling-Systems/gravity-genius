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
    // add the position to the tracked path
    gameState.highlightPath.push([x, y]);
    // keep the tracked path at the desired length
    if (gameState.highlightPath.length > constants.highlightPathLength) {
        gameState.highlightPath.shift();
    }
    // use periodic boundaries
    /*
    if (x > 1.0) x = x - 1.0;
    if (x < 0.0) x = x + 1.0;
    if (y > 1.0) y = y - 1.0;
    if (y < 0.0) y = y + 1.0;
    */
    // bounce off the walls
    if (x > 1.0 || x < 0.0) vx = -0.5 * vx;
    if (y > 1.0 || y < 0.0) vy = -0.5 * vy;
    var newGameState = {
        rocketPos: [x, y], // FIXME: rename to rocketPosition
        rocketVel: [vx, vy], // FIXME: rename to rocketVelocity
        planetPositions: gameState.planetPositions, // approximately no movement in planets
        targetPosition: gameState.targetPosition,
        accelerometer: gameState.accelerometer,
        highlightPath: gameState.highlightPath,
        debugQ: gameState.debugQ,
        runningQ: gameState.runningQ
    };

    return newGameState;
}

function renderBackground(graphics, constants) {
    // clear the canvas for the next draw:
    graphics.ctx.clearRect(0, 0, graphics.canvasWidth, graphics.canvasHeight);
    //renderAttractorBasins(graphics);
    renderForceVectors(graphics, constants);
}

function dvAtPoint(ptxy, gameState, constants) {
    var dvEachPlanet = gameState.planetPositions.map(function(planetPos) {
        return dvFromPlanet(planetPos, ptxy, constants);
    });
    // target has a stronger gravity field:
    var oldG = constants.G;
    constants.G = constants.G * constants.targetForceMultiplier;
    var dvTarget = dvFromPlanet(gameState.targetPosition, gameState.rocketPos, constants);
    constants.G = oldG;
    // update the velocity due to the pull of each planet:
    var dvx = dvy = 0.0;
    dvEachPlanet.forEach(function(dv) {
        dvx += dv[0];
        dvy += dv[1];
    });
    // update the velocity from the pull of the target:
    dvx += dvTarget[0];
    dvy += dvTarget[1];
    // update the velocity from the accelerometer
    /*
    var dvxAccelerometer = constants.accelerometerFactor * gameState.accelerometer[0] * constants.dt;
    var dvyAccelerometer = constants.accelerometerFactor * gameState.accelerometer[1] * constants.dt;
    dvx += dvxAccelerometer;
    dvy += dvyAccelerometer;
    */
    return [dvx, dvy];
}

function renderForceVectors(graphics, constants) {
    var vectors = graphics.forceVectors;
    var numYVectors = vectors.length;
    var numXVectors = vectors[0].length;
    var numCells = constants.numVectorFieldCells;
    var cellRadiusCanvas = graphics.canvasWidth / (2 * numCells);
    var vectorLengthFudgeFactor = 2.0;
    var x, y, dvNormalized, dvxNormalized, dvyNormalized, vectorRadius;
    var xCanvas, yCanvas, xEndCanvas, yEndCanvas;
    graphics.ctx.save();
    graphics.ctx.globalAlpha = 0.4;
    graphics.ctx.strokeStyle = '#000000'; // black
    for (var j = 0; j < numYVectors; j++) {
        for (var i = 0; i < numXVectors; i++) {
            dvNormalized = vectors[j][i];
            dvxNormalized = dvNormalized[0];
            dvyNormalized = dvNormalized[1];
            vectorRadius = Math.sqrt(dvxNormalized*dvxNormalized + dvyNormalized*dvyNormalized);
            x = (i / numXVectors);
            //y = (1.0 - (j / 100.0));
            y = j / numYVectors;
            xCanvas = x * graphics.canvasWidth;
            yCanvas = y * graphics.canvasHeight;
            xEndCanvas = xCanvas + dvxNormalized * cellRadiusCanvas * vectorLengthFudgeFactor;
            yEndCanvas = yCanvas + dvyNormalized * cellRadiusCanvas * vectorLengthFudgeFactor;
            graphics.ctx.beginPath();
            graphics.ctx.moveTo(xCanvas, yCanvas);
            graphics.ctx.lineTo(xEndCanvas, yEndCanvas);
            graphics.ctx.stroke();
        }
    }
    graphics.ctx.restore();
}

function computeForceVectors(gameState, constants) {
    var x, y, dvPt;
    var dvField = [];
    var maxVecLength = 0.0;
    var numCells = constants.numVectorFieldCells;
    // compute dv for each point in the grid
    for (var i = 0; i < numCells; i++) {
        for (var j = 0; j < numCells; j++) {
            if (i === 0) dvField[j] = [];
            x = (i / numCells);
            y = (1.0 - (j / numCells));
            dvPt = dvAtPoint([x, y], gameState, constants);
            dvField[j][i] = dvPt;
            dvVecLength = Math.sqrt(dvPt[0]*dvPt[0] + dvPt[1]*dvPt[1]);
            if (dvVecLength > maxVecLength) maxVecLength = dvVecLength;
        }
    }
    // normalize the vectors to the max vector in the field
    var dvx, dvy, dvxNormalized, dvyNormalized;
    for (var i = 0; i < numCells; i++) {
        for (var j = 0; j < numCells; j++) {
            dvPt = dvField[j][i];
            dvx = dvPt[0];
            dvy = dvPt[1];
            dvxNormalized = dvx / maxVecLength;
            dvyNormalized = dvy / maxVecLength;
            dvField[j][i] = [dvxNormalized, dvyNormalized];
        }
    }
    return dvField;
}

function renderAttractorBasins(graphics) {
    // render the basins of attraction of the planets:
    graphics.ctx.save();
    graphics.ctx.globalAlpha = 0.4;
    var fill, xCanvas, yCanvas;
    var cellWidthCanvas = graphics.canvasWidth / 100.0;
    var cellHeightCanvas = graphics.canvasHeight / 100.0;
    var cellOffsetX = 0;
    var cellOffsetY = cellHeightCanvas;
    for (var i = 0; i < 100; i++)
        for (var j = 0; j < 100; j++) {
            if (graphics.attractorBasins[j][i] === 0) {
                fill = '#008000'; // green
            } else {
                fill = '#0000ff'; // blue
            }
            graphics.ctx.fillStyle = fill;
            xCanvas = (i / 100.0) * graphics.canvasWidth;
            yCanvas = (1.0 - (j / 100.0)) * graphics.canvasHeight;
            graphics.ctx.beginPath();
            graphics.ctx.fillRect(xCanvas - cellOffsetX, yCanvas - cellOffsetY, cellWidthCanvas, cellHeightCanvas);
            graphics.ctx.closePath();
        }
    graphics.ctx.restore();
}

function attractorBasins(gameState, constants) {
    // compute planet attractor basins
    // cache the current position and velocity vectors
    var pos = gameState.rocketPos;
    var vel = gameState.rocketVel;
    var attractorBasins = [];
    var basinComputeSteps;
    for (var i = 0; i < 100; i++) {
        for (var j = 0; j < 100; j++) {
            if (i === 0) attractorBasins[j] = [];
            // TODO: use symmetries
            gameState.rocketPos = [i/100.0, j/100.0];
            gameState.rocketVel = [0.0, 0.0];
            basinComputeSteps = 100;
            while (basinComputeSteps-- > 0) gameState = stepRocket(gameState, constants);
            var p1Dist = Math.sqrt(
                Math.pow((gameState.rocketPos[0] - gameState.planetPositions[0][0]), 2) +
                Math.pow((gameState.rocketPos[1] - gameState.planetPositions[0][1]), 2));
            var p2Dist = Math.sqrt(
                Math.pow((gameState.rocketPos[0] - gameState.planetPositions[1][0]), 2) +
                Math.pow((gameState.rocketPos[1] - gameState.planetPositions[1][1]), 2));
            if (p1Dist >= p2Dist) {
                attractorBasins[j][i] = 0;
            } else {
                attractorBasins[j][i] = 1;
            }
        }
    }
    // reinstate the position and velocity
    gameState.rocketPos = pos;
    gameState.rocketVel = vel;
    return attractorBasins;
}

function renderGame(gameState, constants, graphics) {
    renderBackground(graphics, constants);
    // render debug panel
    if (gameState.debugQ) {
        var yInc = 0.02;
        var yIncCanvas = 0.02 * graphics.canvasHeight;
        var textPosX = 0.8;
        var textPosY = 0.9;
        var textPosXCanvas = textPosX * graphics.canvasWidth;
        var textPosYCanvas = (1.0 - textPosY) * graphics.canvasHeight;
        var xRounded = Math.round(gameState.rocketPos[0] * 100) / 100;
        var yRounded = Math.round(gameState.rocketPos[1] * 100) / 100;
        graphics.ctx.fillText('x: ' + xRounded, textPosXCanvas, textPosYCanvas);
        graphics.ctx.fillText('y: ' + yRounded, textPosXCanvas, textPosYCanvas + yIncCanvas);
        var vxRounded = Math.round(gameState.rocketVel[0] * 100) / 100;
        var vyRounded = Math.round(gameState.rocketVel[1] * 100) / 100;
        graphics.ctx.fillText('vx: ' + vxRounded, textPosXCanvas, textPosYCanvas + 2*yIncCanvas);
        graphics.ctx.fillText('vy: ' + vyRounded, textPosXCanvas, textPosYCanvas + 3*yIncCanvas);
    }
    // render rocket path
    if (gameState.runningQ) {
        graphics.ctx.beginPath();
        var numPathPts = gameState.highlightPath.length;
        var ptXCanvas = gameState.highlightPath[numPathPts - 1][0] * graphics.canvasWidth;
        var ptYCanvas = (1.0 - gameState.highlightPath[numPathPts - 1][1]) * graphics.canvasHeight;
        graphics.ctx.moveTo(ptXCanvas, ptYCanvas);
        var pathLength = Math.min(numPathPts, constants.highlightPathLength);
        var indexFromEnd;
        for (var i = 0; i < pathLength; i++) {
            indexFromEnd = numPathPts - i - 1;
            ptXCanvas = gameState.highlightPath[indexFromEnd][0] * graphics.canvasWidth;
            ptYCanvas = (1.0 - gameState.highlightPath[indexFromEnd][1]) * graphics.canvasHeight;
            graphics.ctx.lineTo(ptXCanvas, ptYCanvas);
            graphics.ctx.moveTo(ptXCanvas, ptYCanvas);
        }
        graphics.ctx.closePath();
        graphics.ctx.strokeStyle = '#d3d3d3';
        graphics.ctx.stroke();
    }
    // render planets
    var planetColors = ['blue', 'green'];
    gameState.planetPositions.forEach(function(planetPos, i) {
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
        graphics.ctx.fillStyle = planetColors[i];
        graphics.ctx.arc(xPlanetCanvas, yPlanetCanvas, constants.planetWidth * graphics.canvasWidth, 0, 2*Math.PI, false);
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
    // set canvas size to window size
    var canvas = document.getElementById('myCanvas');
    canvas.width = Math.min(window.innerWidth - 20, 500);
    canvas.height = Math.min(window.innerHeight - 120, 500); // leave room for buttons

    var constants = {
        planetMass: 1.0,
        rocketMass: 0.0000001,
        G: 10.0, // gravitational constant
        dt: 0.001, // simulation time step
        targetForceMultiplier: 0.1,
        targetWidth: 0.04,
        accelerometerFactor: 40.0,
        planetWidth: 0.04,
        highlightPathLength: 20,
        numVectorFieldCells: 50
    };

    var initialRocketPos = [0.75, 0.1];
    var initialRocketVel = [-1.0, 1.0];
    var planetPositions = [[0.25, 0.25], [0.75, 0.75]];
    var targetPosition = [0.5, 0.5];
    var accelerometer = [0.0, 0.0];
    var highlightPath = [initialRocketPos];
    var debugQ = false;
    var runningQ = false;

    var initialGameState = {
        rocketPos: initialRocketPos,
        rocketVel: initialRocketVel,
        planetPositions: planetPositions,
        targetPosition: targetPosition,
        accelerometer: accelerometer,
        highlightPath: highlightPath,
        debugQ: debugQ,
        runningQ: runningQ
    };

    var startButton = document.getElementById('start');
    startButton.addEventListener('click', function() {
        gameState.runningQ = true;
        stepGameState();
    });
    var pauseButton = document.getElementById('pause');
    pauseButton.addEventListener('click', function() {
        gameState.runningQ = false;
    });

    var graphics = {};
    graphics.canvas = canvas;
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
        graphics.forceVectors = computeForceVectors(gameState, constants);
        /*
        var cachedRocketPos = gameState.rocketPos;
        var cachedHighlightPath = gameState.highlightPath;
        graphics.attractorBasins = attractorBasins(gameState, constants);
        gameState.rocketPos = cachedRocketPos;
        gameState.highlightPath = cachedHighlightPath;
        */
    });

    var resetButton = document.getElementById('reset');
    resetButton.addEventListener('click', function() {
        gameState.runningQ = false;
        //gameState = initialGameState;
        // TODO: using planetPositions as a singleton seems janky
        while (planetPositions.length > 2) planetPositions.pop();
        while (highlightPath.length > 1) highlightPath.pop();
        // graphics.attractorBasins = attractorBasins(gameState, constants);
        gameState.rocketPos = [0.75, 0.1];
        gameState.rocketVel = [-1.0, 1.0];
        gameState.highlightPath = [[0.75, 0.1]]; // TODO: clone rocketPos here
        graphics.forceVectors = computeForceVectors(gameState, constants);
        renderGame(gameState, constants, graphics);
    });

    var debugCheckbox = document.getElementById('debug');
    debugCheckbox.addEventListener('click', function(e) {
        if (e.target.checked) gameState.debugQ = true;
        else gameState.debugQ = false;
        renderGame(gameState, constants, graphics);
    });

    window.addEventListener('devicemotion', function(event) {
        if (event.accelerationIncludingGravity) {
            accelerometer[0] = event.accelerationIncludingGravity.x;
            accelerometer[1] = event.accelerationIncludingGravity.y;
        }
    });

    var gameState = initialGameState;

    /*
    graphics.attractorBasins = attractorBasins(gameState, constants);
    gameState.highlightPath = [initialRocketPos];
    gameState.rocketPos = [0.75, 0.1],
    */
    graphics.forceVectors = computeForceVectors(gameState, constants);

    renderGame(gameState, constants, graphics);

    function stepGameState() {
        if (!gameState.runningQ) return;
        requestAnimationFrame(stepGameState);
        gameState = stepRocket(gameState, constants);
        renderGame(gameState, constants, graphics);
    }

    //console.log(initialGameState.rocketPos);

    stepGameState();

}

