const express = require('express');
const session = require('express-session');
const app = express();
const config = require('./config.json');
const queryString = require('query-string');
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const qs = require('qs');
const _ = require('lodash');

app.use(session({
    secret: config.secret,
    resave: false,
    saveUninitialized: true,
    rolling: true,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        httpOnly: false,
        secure: true
    }
}));

app.set('view engine', 'ejs');
app.use('/public', express.static('public'));

function getBasicAuth() {
    return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
}

function getBasicHeader() {
    return {
        'Authorization': getBasicAuth(),
        'Content-Type': 'application/x-www-form-urlencoded'
    }
}

function getHeader(token) {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
}

async function spotifyGetUserTopCrawler(params, token, page = 1) {
    return axios.request({
            baseURL: 'https://api.spotify.com/v1/me/top/tracks',
            headers: getHeader(token),
            method: 'get',
            params: {
                ...params,
                offset: (page - 1) * params.limit
            },
            paramsSerializer: (params) => {
                return queryString.stringify(params);
            }
        })
        .then(async r => {
            if (r.data.next && page < 5) {
                const tracks = await spotifyGetUserTopCrawler(params, token, page + 1);
                return _.concat(r.data.items, tracks);
            } else {
                return r.data.items;
            }
        })
}

function ensureAuthenticated(req, res, next) {
    if (req.session.spotify &&
        req.session.spotify.access_token &&
        req.session.spotify.access_token &&
        req.session.spotify.expire_at > Date.now()) {
        next();
    } else {
        res.redirect('/');
    }
}


app.get('/', function (req, res) {
    if (req.session.spotify &&
        req.session.spotify.access_token &&
        req.session.spotify.access_token &&
        req.session.spotify.expire_at > Date.now()) {
        res.redirect('/get-your-decade');
    } else {
        res.render('login');
    }
});

app.get('/api/login', function (req, res) {
    const scopes = 'user-top-read';
    res.send({
        redirect: `https://accounts.spotify.com/authorize?response_type=code&client_id=${config.clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(config.redirectUri)}&state=${req.sessionID}`
    });
});

app.get('/auth', function (req, res) {
    if (req.query && !req.query.error && req.query.state === req.sessionID) {
        const code = req.query.code;
        axios.request({
                method: 'post',
                url: 'https://accounts.spotify.com/api/token',
                data: qs.stringify({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: config.redirectUri
                }),
                headers: getBasicHeader()
            })
            .then(response => {
                const tokens = response.data;
                req.session.spotify = {
                    ...tokens,
                    expire_at: Date.now() + tokens.expires_in * 1000
                };
                res.render('windowCloser');
            });
    } else {
        res.status(400);
        res.send('None shall pass');
    }
});

app.get('/get-your-decade', ensureAuthenticated, function (req, res) {
    res.render('anticipationStep');
});

app.get('/your-decade', ensureAuthenticated, async function (req, res) {
    const topSongs = await spotifyGetUserTopCrawler({
        limit: 50,
        offset: 0,
        time_range: 'long_term'
    }, req.session.spotify.access_token);
    const decades = topSongs.map(topSong => {
        return topSong.album.release_date
            .replace(/.*?([0-9]{4,4}).*/g, '$1')
            .replace(/(...)./g, '$10');
    });
    const counted = _.countBy(decades, d => d);
    const topN = _.slice(topSongs, 0, 5);

    const yourDecade = _.reduce(counted, (acc, value, key) => {
        if (value > acc.noSongs) {
            return {
                decade: key,
                noSongs: value
            };
        }

        return acc;
    }, {
        decade: '',
        noSongs: 0
    });

    res.render('rewardStep', {
        yourDecade,
        totalSongs: topSongs.length,
        topNSongs: topN
    });
});

https.createServer({
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.cert')
    }, app)
    .listen(3000);