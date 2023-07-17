const fs = require('fs');
const path = require('path')
const axios = require('axios');
const unzipper = require('unzipper');
const saveData = require('./save-data');

// VARS
const kml_file = 'data/dispersion.kml';
const tmp_zip_file = 'data/dispersion.kmz';
const output_file = '../data/daily-max-dispersion.png'
const url = 'https://firesmoke.ca/forecasts/current/dispersion.kmz';

async function init() {
    console.log('Fetching firesmoke data...')

    // get the kmz file & unzip it
    await fetchFile(url);
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
    // stream writer where we'll download the data
    const writeStream = fs.createWriteStream(tmp_zip_file, {flag: 'wx'});
        
    try {
        writeStream.on('open', async f => {
            // request
            streamResponse = await axios({
                url,
                method: 'GET',
                responseType: 'stream'
            });

            // write zip file data
            streamResponse.data.pipe(writeStream);
        });

        writeStream.on('finish', unzipKMZ);
    } catch(err) {
        console.err(err)
    }
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
        .pipe(fs.createWriteStream(path.join(__dirname, output_file), {flag: 'wx'}))
		// .pipe(unzipper.Extract({ path: kml_file }))
        .on('close', cleanUp);
}

module.exports = init;