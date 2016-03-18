---
layout: post
title:  "Adding damped wall collisions"
gif:    assets/20160317-wall-damping-desktop.gif
date:   2016-03-17
---

Now when the rocket hits the walls, it bounces off with a velocity that is 50%
of the velocity that it hit with:

![damped wall collisions]({{site.baseurl}}assets/20160317-wall-damping-desktop.gif)

More precisely, the velocity is damped in the component perpendicular to the wall.

So if the rocket hits the top wall, the y-component of the velocity is reduced to
half, while the x-component remains unchanged. I think this makes sense?? The wall
shouldn't be effecting the velocity in the direction _along_ the wall, because ...
because physics??!

To see why this is true, maybe thing of the rocket skidding along
the top wall with no y-velocity at all. In the absence of friction, the rocket's
x-velocity isn't effected at all. If you suddenly add a small y-velocity (say by
tipping the phone and giving a small acceleration in the y direction), the rocket would
bounce off a bit, but that wouldn't change the speed in the x-direction. Man it's
hard to prove things like this. It's just a strange and amazing thing that physical
forces separate cleanly into separate orthogonal components!
