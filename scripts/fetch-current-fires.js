const fs = require('fs');
const axios = require('axios');
const unzipper = require('unzipper');
const Parser = require('rss-parser');
const shapefile = require('shapefile');
const saveData = require('./save-data');


// VARS
let current_year, data_dir, fon_ids, shape_file_directory, tmp_zip_file, current_fires_shp, fon_perims_shp;
let currentFires = {
	type: 'FeatureCollection',
	features: []
};

//  WILDFIRE URLS
const current_fire_url = 'https://pub.data.gov.bc.ca/datasets/2790e3f7-6395-4230-8545-04efb5a18800/prot_current_fire_points.zip'
const wildfire_rss_feed = 'http://bcfireinfo.for.gov.bc.ca/FTP/!Project/WildfireNews/xml/All-WildfireNews.xml';
const wildfire_perimeters_url = 'https://pub.data.gov.bc.ca/datasets/cdfc2d7b-c046-4bf0-90ac-4897232619e1/prot_current_fire_polys.zip';



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

				if (data.properties.FIRE_YEAR === current_year) {
                    currentFires.features.push(data);
                }

				// process the next line
				return src.read().then(next);
			})
		)
		.catch(err => console.error(err.stack));

	console.log('Done processing shapefiles...');
	saveData(currentFires, 'wildfires', 'json', data_dir);
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

function unzipCurrentFires() {
	fs.createReadStream(tmp_zip_file)
		.pipe(unzipper.Extract({ path: shape_file_directory }))
		.on('close', convert2json);
}

async function fetchCurrentFires(dir) {
    // set data directory & current year
    data_dir = dir;
    current_year = new Date().getUTCFullYear();

    // WILDFIRE SHAPEFILE DATA
    shape_file_directory = `${data_dir}/current-fires`;
    tmp_zip_file = `${shape_file_directory}/current-fires.zip`;
    current_fires_shp = `${shape_file_directory}/prot_current_fire_points.shp`;
    fon_perims_shp = `${shape_file_directory}/prot_current_fire_polys.shp`;
	
    // download & convert current fires to geojson
	downloadAndUnzip(current_fire_url);
}

module.exports = fetchCurrentFires;