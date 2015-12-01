# Fantasy Golf Web App

My friends and I play a version of fantasy golf that we keep track of on Google Docs.  I built a single page app to track scores using data from pgatour.com.

## Overview

This app is using the MEAN stack.  On the FE I'm using Angular + UI Router for the SPA routing.  But my routes are also included in the node routes file so deep linking is supported.
I get the real time data from REST web services I discovered on pgatour.com.  I was planning on scraping the page for data, but discovered their API while browsing their site.
Because I have to make many calls to retrieve the individual scorecards of a group of players, I'm using [promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) to ensure that I have all data available before making any calculations.

## The full list of tech I'm using is:

* Bower (for FE dependencies)
* MongoDB
* Express
* Angular (including UI Router)
* Node (including NPM for BE dependencies)
* Twitter Bootstrap