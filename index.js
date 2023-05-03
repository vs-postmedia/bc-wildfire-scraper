const fs = require('fs');
const axios = require('axios');
// const unzip = require('unzip');
const unzipper = require('unzipper');
const Parser = require('rss-parser');
const shp2json = require('shapefile');
// // const JSONStream = require('JSONStream');

const uploadFile = require('./scripts/upload-file');
// const fetchFire = require('./modules/fetch-fire');


// VARS
const data_dir = 'data';
const bucket = 'vs-postmedia-data'; // cloud storage bucket


//  WILDFIRE URLS
const current_fire_url = 'https://pub.data.gov.bc.ca/datasets/2790e3f7-6395-4230-8545-04efb5a18800/prot_current_fire_points.zip'
const wildfire_rss_feed = 'http://bcfireinfo.for.gov.bc.ca/FTP/!Project/WildfireNews/xml/All-WildfireNews.xml';
const wildfire_perimeters_url = 'https://pub.data.gov.bc.ca/datasets/cdfc2d7b-c046-4bf0-90ac-4897232619e1/prot_current_fire_polys.zip';

// WILDFIRE SHAPEFILE DATA
const shape_file_directory = `${data_dir}/current-fires`;
const tmp_zip_file = `${shape_file_directory}/current-fires.zip`;
const current_fires_shp = `${shape_file_directory}/prot_current_fire_points.shp`;
const fon_perims_shp = `${shape_file_directory}/prot_current_fire_polys.shp`;


// FUNCTIONS

// download & unzip current fire data in shapefile form
async function downloadAndUnzip(url) {
	let streamResponse;
	// stream writer where we'll download the data
	const writeStream = fs.createWriteStream(tmp_zip_file, {flag: 'wx'});
	
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

	writeStream.on('finish', unzipCurrentFires);
	writeStream.on('error', (err) => console.log(err));
}



function saveData(data, filename, format) {
	console.log(`Saving data to ${filename}`);

	// save file locally
	if (format === 'json') {
		try {
			fs.writeFileSync(`${data_dir}/${filename}`, JSON.stringify(data));
		} catch (err) {
			console.error(err);
		}
	} else {
		try {
			const parser = new Parser();
			fs.writeFileSync(`${data_dir}/${filename}`, parser.parse(data));
		} catch (err) {
			console.error(err);
		}
	}
	
	// upload to Google Cloud
	// uploadFile(bucket, filename, format, './data');
}

function unzipCurrentFires() {
	fs.createReadStream(tmp_zip_file)
		.pipe(unzipper.Extract({ path: shape_file_directory }))
		.on('close', convert2json);
}

function convert2json() {
	console.log('Finished writing zip file!');
}

async function init() {
	// download & convert current fires to geojson
	await downloadAndUnzip(current_fire_url);

	console.log('DAAAAAAMN.... son!')
}

init();