## Short description

Simple spotify connector, that will show which decade is user's favourite one and along with that it will show top 5 songs.

## HTTPS Only

Its build specifically for https only (reasons below), so you need to add **server.key** file and **server.cert** to main folder. If you want to have self signed certificate for testing purposes you can run:

`openssl req -nodes -new -x509 -keyout server.key -out server.cert`

## Spotify set up

To get clientId and clientSecret you have to register an app on spotify. To do that go to *https://developer.spotify.com/dashboard* . You have to login there and create new app. As soon as you do that client ID should be visible for you and you should be able to get your client secret as well with additional click. While you are there you should also **register your redirect uri, otherwise Spotify will not redirect us to our app after login.**

## How to run

1. Run `npm install` (or alternativaly run `npm ci` to get packages on which I've tested this ;) unless there were some important security updates to packages and I was too lazy too update package-lock.json!)
2. Copy **example.config.json** file and name it **config.json**
3. Fill all varialbles:
    * *secret*: something very secret, so we can hash properly and secretely
    * *clientId*: spotify client id
    * *clientSecret*: spotify client secret
    * *redirectUri*: this has to point to your domain for that app for */auth* path. So assuming that your domain is *example.com* this should be set to *https://example.com/auth*
4. Run `npm start`
5. Go to https://localhost:3000/

## Purpose of that

This app was built to support upcoming music viz of https://public.tableau.com/profile/kasia.gasiewska.holc#!/ for Tableau IronViz. Thats the reason for https, requirement of Tableau. 

