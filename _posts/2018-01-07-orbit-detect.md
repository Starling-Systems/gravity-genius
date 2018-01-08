---
layout: post
title:  "Adding orbit detection"
gif:    assets/20180107-gravity-genius-orbit-detect.gif
date:   2018-01-07
---

Over the holiday break I finally got around to adding orbit detection to
Gravity Genius!

![nearest planet]({{site.baseurl}}assets/20180107-gravity-genius-orbit-detect.gif)

The orbit detection algorithm looks for when the rocket path
(highlighted as a line behind the rocket) crosses itself. There are cases
where this fails, for example when the path quickly reverses direction
(eg when bouncing off a wall), the path crosses itself but has not orbited anything.
It seems to work most of the time though, and doesn't require computing
if a planet is inside the rocket path polygon.
