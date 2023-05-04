const fs = require('fs');
const axios = require('axios');
const unzipper = require('unzipper');
const Parser = require('rss-parser');
const shapefile = require('shapefile');


// VARS
let fon_ids;
const data_dir = 'data';
let currentFires = {
	type: 'FeatureCollection',
	features: []
};

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
async function convert2json() {
	console.log('Processing shapefile...');

	await shapefile.open(current_fires_shp)
		.then(src => src.read()
			.then(function next(result) {
				if (result.done) return;

				const data = result.value;
				data.properties.last_update = Date.now();
				// lon/lat coords
				data.geometry.coordinates = [data.properties.LONGITUDE, data.properties.LATITUDE];
				// data.properties.fon = fon_ids.includes(parseInt(fire.FIRE_NT_ID));
				data.properties.ignition_date = returnHumanReadableDate(data.properties.IGNITN_DT);
				
				// CURRENT_SI/CURRENT_SZ needs a value & sometimes comes back empty
				if (data.properties.CURRENT_SI === null) {
					data.properties.CURRENT_SI = 0;
				}
				if (data.properties.CURRENT_SZ === null) {
					data.properties.CURRENT_SZ = 0;
				}
				currentFires.features.push(data);

				// process the next line
				return src.read().then(next);
			})
		)
		.catch(err => console.error(err.stack));

	console.log('Done processing shapefiles...');
	saveData(currentFires, 'wildfires', 'json')
}

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

function returnHumanReadableDate(str) {
	const month_lookup = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	const d = new Date(str);
	const month = month_lookup[parseInt(d.getUTCMonth())];
	return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function saveData(data, filename, format) {
	console.log(`Saving data to ${filename}`);

	// save file locally
	if (format === 'json') {
		try {
			fs.writeFileSync(`${data_dir}/${filename}.${format}`, JSON.stringify(data));
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
}

function unzipCurrentFires() {
	fs.createReadStream(tmp_zip_file)
		.pipe(unzipper.Extract({ path: shape_file_directory }))
		.on('close', convert2json);
}

async function init() {
	// download & convert current fires to geojson
	await downloadAndUnzip(current_fire_url);

	console.log('DAAAAAAMN.... son!')
}

init();