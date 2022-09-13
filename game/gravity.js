;(function() {
    window.addEventListener('load', startGame);
})();

function xToCanvas(x, graphics) {
    return x * graphics.canvasWidth;
}

function yToCanvas(y, graphics) {
    return (1.0 - y) * graphics.canvasHeight;
}

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
    // detect an orbit
    gameState.orbit = {};
    gameState.orbit.orbitStartIndex = null;
    gameState.orbit.orbitStartPoint = null;
    if (!gameState.renderingOrbit && gameState.highlightPath.length > 4) {
        var lastIndex = gameState.highlightPath.length - 1;
        var lastPoint = gameState.highlightPath[lastIndex];
        // find the closest point in the highlight path to the last one:
        var secondLastPointIndex = gameState.highlightPath.length - 2;
        var secondLastPoint = gameState.highlightPath[secondLastPointIndex];
        var leastDistance = math.distance(lastPoint, secondLastPoint);
        var closestPointIndex = null;
        // find the smallest distance of the end of the path to an internal point
        // but don't consider points at the tail end of the path, because a
        // wall bounce brings the end of the path close to itself
        gameState.highlightPath.slice(0, -20).forEach(function(innerPoint, innerPointIndex) {
            var distInnerLast = math.distance(lastPoint, innerPoint);
            if (distInnerLast < leastDistance) {
                leastDistance = distInnerLast;
                closestPointIndex = innerPointIndex;
            }
        });
        if (
            closestPointIndex
            && closestPointIndex != secondLastPointIndex
            // a wall bounce brings the rocket close to the highlight path:
            // && closestPointIndex < constants.highlightPathLength/4.0
        ) {
            // the highlight path is closing into a loop
            var closestPoint = gameState.highlightPath[closestPointIndex];
            var closestPointNeighborIndex = closestPointIndex + 1;
            if (closestPointNeighborIndex <= lastIndex) {
                var closestPointNeighbor = gameState.highlightPath[closestPointNeighborIndex];
                var intersection = math.intersect(lastPoint, secondLastPoint, closestPoint, closestPointNeighbor);
                if (intersection) {
                    // detected an orbit
                    gameState.orbitCount++;
                    gameState.orbit.orbitStartPoint = intersection;
                    gameState.orbit.orbitStartIndex = closestPointIndex;
                    gameState.orbit.orbitFramesLeft = constants.orbitAnimationFrames;
                    gameState.orbit.path = JSON.parse(JSON.stringify(gameState.highlightPath));
                    gameState.renderingOrbit = {};
                    Object.assign(gameState.renderingOrbit, gameState.orbit);
                }
            }
        }
    }
    // bounce off the walls
    if (x > 1.0 || x < 0.0) vx = -0.5 * vx;
    if (y > 1.0 || y < 0.0) vy = -0.5 * vy;
    // deep clone the existing game state:
    // TODO: (why do I need to return a clone of the game state again?)
    var newGameState = JSON.parse(JSON.stringify(gameState));
    newGameState.rocketPos = [x, y]; // TODO: rename to rocketPosition
    newGameState.rocketVel = [vx, vy]; // TODO: rename to rocketVelocity

    return newGameState;
}

function renderBackground(graphics, constants) {
    // clear the canvas for the next draw:
    graphics.ctx.clearRect(0, 0, graphics.canvasWidth, graphics.canvasHeight);
    renderAttractorBasins(graphics);
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
        graphics.ctx.fillStyle = 'black';
        graphics.ctx.strokeStyle = 'black';
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
        graphics.ctx.fillText('orbits: ' + gameState.orbitCount, textPosXCanvas, textPosYCanvas + 4*yIncCanvas);
        if (gameState.renderingOrbit && gameState.renderingOrbit.orbitFramesLeft) {
            graphics.ctx.fillText('orbit frames: ' + gameState.renderingOrbit.orbitFramesLeft, textPosXCanvas, textPosYCanvas + 5*yIncCanvas);
        }
    }
    // render rocket path
    var numPathPts = gameState.highlightPath.length;
    var ptXCanvas = gameState.highlightPath[numPathPts - 1][0] * graphics.canvasWidth;
    var ptYCanvas = (1.0 - gameState.highlightPath[numPathPts - 1][1]) * graphics.canvasHeight;
    graphics.ctx.beginPath();
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
    //graphics.ctx.closePath();
    graphics.ctx.strokeStyle = '#d3d3d3';
    graphics.ctx.stroke();
    // render planets
    var planetColors = ['blue', 'green', 'purple', 'yellow', 'orange', 'pink'];
    var rocketPosX = gameState.rocketPos[0];
    var rocketPosY = gameState.rocketPos[1];
    var minPlanetDistance;
    var nearestPlanetIndex;
    gameState.planetPositions.forEach(function(planetPos, i) {
        var xPlanet = planetPos[0];
        var yPlanet = planetPos[1];
        var xPlanetCanvas = xPlanet * graphics.canvasWidth;
        var yPlanetCanvas = (1.0 - yPlanet) * graphics.canvasHeight;
        var distx = (rocketPosX - xPlanet);
        var disty = (rocketPosY - yPlanet);
        var r = Math.sqrt(Math.pow(distx, 2) + Math.pow(disty, 2));
        if (i === 0 || r < minPlanetDistance) {
            minPlanetDistance = r;
            nearestPlanetIndex = i;
        }
        graphics.ctx.lineWidth = 1.0;
        graphics.ctx.beginPath();
        graphics.ctx.fillStyle = planetColors[i];
        graphics.ctx.arc(xPlanetCanvas, yPlanetCanvas, constants.planetWidth * graphics.canvasWidth, 0, 2*Math.PI, false);
        graphics.ctx.closePath();
        graphics.ctx.fill();
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
    var xCanvas = rocketPosX * graphics.canvasWidth;
    var yCanvas = (1.0 - rocketPosY) * graphics.canvasHeight;
    graphics.ctx.lineWidth = 1.0;
    graphics.ctx.fillStyle = 'black';
    graphics.ctx.beginPath();
    graphics.ctx.arc(xCanvas, yCanvas, 5, 0, 2*Math.PI, false);
    graphics.ctx.closePath();
    graphics.ctx.fill();
    // draw line to nearest planet
    var nearestPlanetXY = gameState.planetPositions[nearestPlanetIndex];
    var nearestPlanetXCanvas = nearestPlanetXY[0] * graphics.canvasWidth;
    var nearestPlanetYCanvas = (1.0 - nearestPlanetXY[1]) * graphics.canvasHeight;
    graphics.ctx.beginPath();
    graphics.ctx.strokeStyle = 'black';
    graphics.ctx.setLineDash([5, 15]);
    graphics.ctx.lineWidth = 1.0; // TODO: calibrate this
    graphics.ctx.moveTo(nearestPlanetXCanvas, nearestPlanetYCanvas);
    graphics.ctx.lineTo(xCanvas, yCanvas);
    graphics.ctx.stroke();
    graphics.ctx.closePath();
    // render the orbit
    if (gameState.renderingOrbit) {
        var startIndex = gameState.renderingOrbit.orbitStartIndex;
        var startPoint = gameState.renderingOrbit.path[startIndex];
        graphics.ctx.lineWidth = 1.0;
        graphics.ctx.strokeStyle = 'black';
        graphics.ctx.fillStyle = 'yellow';
        graphics.ctx.globalAlpha = 0.5;
        graphics.ctx.beginPath();
        graphics.ctx.moveTo(xToCanvas(startPoint[0], graphics), yToCanvas(startPoint[1], graphics));
        gameState.renderingOrbit.path.slice(startIndex).forEach(function(orbitPoint) {
            graphics.ctx.lineTo(xToCanvas(orbitPoint[0], graphics), yToCanvas(orbitPoint[1], graphics));
        });
        graphics.ctx.fill();
        gameState.renderingOrbit.orbitFramesLeft--;
        if (gameState.renderingOrbit.orbitFramesLeft === 0) {
            gameState.renderingOrbit = null;
        }
        graphics.ctx.fillStyle = null;
        graphics.ctx.globalAlpha = 1.0;
    }
}

function startGame() {
    // set canvas size to window size
    var canvas = document.getElementById('myCanvas');
    canvas.width = Math.min(document.documentElement.clientWidth - 20, 400);
    canvas.height = Math.min(document.documentElement.clientHeight, 500);

    var constants = {
        planetMass: 1.0,
        rocketMass: 0.0000001,
        G: 10.0, // gravitational constant
        dt: 0.001, // simulation time step
        targetForceMultiplier: 0.1,
        targetWidth: 0.04,
        accelerometerFactor: 40.0,
        planetWidth: 0.04,
        highlightPathLength: 100,
        numVectorFieldCells: 50,
        orbitAnimationFrames: 100 // number of frames an orbit is shown for
    };

    var initialGameState = {
        rocketPos: [0.75, 0.1],
        rocketVel: [-1.0, 1.0],
        planetPositions: [[0.25, 0.25], [0.75, 0.75]],
        targetPosition: [0.5, 0.5],
        accelerometer: [0.0, 0.0],
        highlightPath: [[0.75, 0.1]],
        orbitCount: 0,
        debugQ: false,
        runningQ: false
    };

    var startButton = document.getElementById('start');
    startButton.addEventListener('click', function() {
        gameState.runningQ = true;
        stepGameState();
    });
    var pauseButton = document.getElementById('pause');
    pauseButton.addEventListener('click', function() {
        gameState.runningQ = false;
        renderGame(gameState, constants, graphics);
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
        gameState.planetPositions.push([x, y]);
        graphics.forceVectors = computeForceVectors(gameState, constants);
        /*
        var cachedRocketPos = gameState.rocketPos;
        var cachedHighlightPath = gameState.highlightPath;
        graphics.attractorBasins = attractorBasins(gameState, constants);
        gameState.rocketPos = cachedRocketPos;
        gameState.highlightPath = cachedHighlightPath;
        */
        renderGame(gameState, constants, graphics);
    });

    var debugCheckbox = document.getElementById('debug');
    debugCheckbox.addEventListener('click', function(e) {
        if (e.target.checked) gameState.debugQ = true;
        else gameState.debugQ = false;
        renderGame(gameState, constants, graphics);
    });

    var resetButton = document.getElementById('reset');
    resetButton.addEventListener('click', function() {
        var debugQ = gameState.debugQ;
        //gameState = JSON.parse(JSON.stringify(initialGameState));
        gameState = initialGameState;
        gameState.runningQ = false;
        gameState.debugQ = debugQ;
        graphics.forceVectors = computeForceVectors(gameState, constants);
        renderGame(gameState, constants, graphics);
    });

    window.addEventListener('devicemotion', function(event) {
        if (event.accelerationIncludingGravity) {
            gameState.accelerometer[0] = event.accelerationIncludingGravity.x;
            gameState.accelerometer[1] = event.accelerationIncludingGravity.y;
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

