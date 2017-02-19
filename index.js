#!/usr/bin/env node

const Twitter  = require('twitter');
const args     = require('minimist')(process.argv);
const yaml     = require('js-yaml');
const fs       = require('fs');

const streamer = require('./imageStreamer');

if ('c' in args === false) {
    console.error('Missing -c flag for configuration, e.g namechanger -c /etc/namechanger.yml');
    process.exit(1);
}

const config = yaml.safeLoad(fs.readFileSync(args.c));
const client = new Twitter({
    consumer_key:        config.twitter.consumerKey,
    consumer_secret:     config.twitter.consumerSecret,
    access_token_key:    config.twitter.accessTokenKey,
    access_token_secret: config.twitter.accessTokenSecret
});

const MAX_NAME_LENGTH = 20;
let adjectives        = [];

const loadAdjective = () => {

    const adjs = fs.readFileSync(`${__dirname}/adjectives.txt`).toString().split('\n');
    adjectives = adjs.reduce((prev, adj) => {

        if (constructName(adj).length > MAX_NAME_LENGTH) {
            return prev;
        }

        prev.push(`${adj[0].toUpperCase()}${adj.slice(1)}`);
        return prev;

    }, []);

    console.info('Filtered out', adjs.length - adjectives.length, 'adjectives due to length constraints');

};

const constructName = (adjective) => {
    return `${adjective} ${config.baseName}`;
};

const updateName = () => {

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length - 1)];
    const name      = constructName(adjective);

    console.info('Attempting to update name to', name);

    client.post('account/update_profile', {name: name}, (err) => {

        if (err !== null) {
            console.error('Failed to update profile:', err);
            return;
        }

        console.info('Successfully updated profile to', name);

    });

};

//loadAdjective();
//updateName();
//setInterval(updateName, config.updateInterval * 1000);
streamer.start(client);