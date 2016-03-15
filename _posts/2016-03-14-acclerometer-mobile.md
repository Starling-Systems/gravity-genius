---
layout: post
title:  "Adding accelerometer control"
gif:    assets/20160314-vector-field-mobile.gif
date:   2016-03-14
---

A friend [Hypolite](https://twitter.com/MrPetovan) and I did some pair programming
on Gravity Genius a few weeks back.
I'm just getting around to blogging about our progress now. We added
accelerometer control on mobile devices!

![gravity genius with accelerometer control on mobile]({{site.baseurl}}assets/20160314-vector-field-mobile.gif)

To capture the accelerometer data, we added an event listener for the 'devicemotion'
event. The event handler then updates a global (yuck) that holds the
acceleration due to gravity in the x and y directions:

```javascript
    window.addEventListener('devicemotion', function(event) {
        if (event.accelerationIncludingGravity) {
            accelerometer[0] = event.accelerationIncludingGravity.x;
            accelerometer[1] = event.accelerationIncludingGravity.y;
        }
    });
```

The acceleration due to gravity in the x and y directions from the accelerometer
are then converted to a velocity change by multiplying by the simulation time step
(right now set to 1 millisecond). The velocity change is then added to the
net velocity change due to the gravitational force from the planets, and the
final velocity is computed in the x and y directions:

```javascript
    // update the velocity from the accelerometer
    var dvxAccelerometer = constants.accelerometerFactor * gameState.accelerometer[0] * constants.dt;
    var dvyAccelerometer = constants.accelerometerFactor * gameState.accelerometer[1] * constants.dt;
    vx += dvxAccelerometer;
    vy += dvyAccelerometer;
```
