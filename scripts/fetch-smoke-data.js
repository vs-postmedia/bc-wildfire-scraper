const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const unzipper = require('unzipper');
const saveData = require('./save-data');

// VARS
const data_dir = path.resolve(__dirname, '..', 'data');
const kml_file = path.join(data_dir, 'dispersion.kml');
const tmp_zip_file = path.join(data_dir, 'dispersion.kmz');
const output_file = path.join(data_dir, 'daily-max-dispersion.png');
const url = 'https://firesmoke.ca/forecasts/current/dispersion.kmz';

async function init() {
    console.log('Fetching firesmoke data...')

    fs.mkdirSync(data_dir, { recursive: true });

    try {
        // get the kmz file & unzip it
        await fetchFile(url);
    } catch (err) {
        console.error(`Failed to fetch smoke data: ${err.message || err}`);
    }
}

function cleanUp() {
    console.log('Removing KMZ file...');
    // delete kmz file
    fs.unlink(tmp_zip_file, err => {
        if (err && err.code === 'ENOENT') console.info('Error: No such file');
        else if (err) console.error(err);
    });
}

async function fetchFile(url) {
    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(tmp_zip_file, { flag: 'w' });

        writeStream.on('error', reject);

        axios({
            url,
            method: 'GET',
            responseType: 'stream',
            validateStatus: status => status < 500,
            httpsAgent: new https.Agent({
                rejectUnauthorized: false
            })
        })
            .then((response) => {
                response.data.on('error', reject);
                response.data.pipe(writeStream);
                writeStream.on('finish', () => {
                    unzipKMZ()
                        .then(resolve)
                        .catch(reject);
                });
            })
            .catch(reject);
    });
}

function getCurrentDate() {
    const d = new Date();
    const day = `0${d.getUTCDate()}`;
    const month = `0${d.getUTCMonth() + 1}`;

    return `${d.getUTCFullYear()}${month.slice(-2)}${day.slice(-2)}`
}

async function unzipKMZ() {
    const current_date = getCurrentDate();
    const regex = new RegExp(`10m_daily_maximum_${current_date}`);

    fs.createReadStream(tmp_zip_file)
        .pipe(unzipper.ParseOne(regex))
        .pipe(fs.createWriteStream(output_file, {flag: 'wx'}))
		// .pipe(unzipper.Extract({ path: kml_file }))
        .on('close', cleanUp);
}

module.exports = init;