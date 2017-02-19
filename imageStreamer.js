const http  = require('http');
const fs    = require('fs');
const sharp = require('sharp');
const async = require('async');

const TMP_LOC = '/tmp/newBackground.jpg';

let client  = null;
let results = {
    'briandotjp': 'http://pbs.twimg.com/media/C5BmMCTVMAAHWgj.jpg'
};

const start = (twitterClient) => {

    client     = twitterClient;
    var stream = client.stream('statuses/filter', {track: '#briansbackground'});

    console.info('Starting streamer');

    stream.on('data', (event) => {

        const { entities } = event;
        const { media } = entities;

        if (media === undefined) {
            console.warn('No media found in Twete');
            return;
        }

        results[event.user.screen_name] = media[0].media_url;
        console.log('Registering or updating user', event.user.screen_name, 'with image:', media[0].media_url);

    });

    stream.on('error', (err) => {
        console.error('Error when streaming:', err.message);
    });

    setInterval(beginProcess, (60 * 1000) * 30);

};


const pickWinner = () => {

    const keys   = Object.keys(results);

    if (keys.length === 0) {

        console.warn('No winner found...');
        return false;

    }

    const winner = keys[Math.floor(Math.random() * (keys.length - 1))];
    console.info('Found a winner:', winner, results[winner]);
    return [winner, results[winner]];


};

const downloadImage = (url, cb) => {

    console.info('Beginning downloading', url);

    const file    = fs.createWriteStream(TMP_LOC);
    const request = http.get(url, function(response) {

        response.pipe(file);

        file.on('finish', function() {

            file.close(cb);

        });

    });

    request.on('error', function(err) {

        console.error('Error when fetching image:', err.message);

        fs.unlink(TMP_LOC, () => {
            cb(err);
        });

    });

};

const processImage = (cb) => {

    sharp(TMP_LOC)
        .resize(500, 500)
        .overlayWith(`${__dirname}/overlay.png`, { gravity: sharp.gravity.southwest })
        .jpeg({quality: 90})
        .toBuffer()
        .then(function(outputBuffer) {
            cb(null, outputBuffer.toString('base64'));
        })
        .catch(cb);
};

const beginProcess = () => {

    const [winner, url] = pickWinner();
    let base64Img       = null;

    async.series([

        (next) => {

            downloadImage(url, next);

        },

        (next) => {

            processImage((err, image) => {

                if (err) {
                    next(err);
                    return;
                }

                base64Img = image;
                next();

            });

        },

        (next) => {

            client.post('account/update_profile_image', {image: base64Img}, next);

        }

    ], (err) => {

        if (err !== null) {
            console.error('Could not process image:', err.message);
            return;
        }

        results = {};
        console.error('Hehe');

    });

};

exports.start = start;