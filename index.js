const fetchCurrentFires = require('./scripts/fetch-current-fires');
const fetchSmokeData = require('./scripts/fetch-smoke-data');
const fetchFireBans = require('./scripts/fetch-fire-bans');
const fetchAqhiData = require('./scripts/fetch-aqhi-data');

const path = require('path');

// VARS
const data_dir = path.resolve(__dirname, 'data');
const current_fires_url = 'https://pub.data.gov.bc.ca/datasets/2790e3f7-6395-4230-8545-04efb5a18800/prot_current_fire_points.zip';
const fire_bans_url = 'https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions';
const aqhi_url = 'https://envistaweb.env.gov.bc.ca/aqo/csv/AQHIWeb.csv';
const current_fire_perimeters_url = 'https://pub.data.gov.bc.ca/datasets/cdfc2d7b-c046-4bf0-90ac-4897232619e1/';

async function init() {
	try {
		// get current fires and perimeters from BC data
		await fetchCurrentFires(data_dir, current_fires_url, current_fire_perimeters_url);

		// get latest firesmoke data
		await fetchSmokeData();

		// get latest fire ban data
		await fetchFireBans(fire_bans_url);

		// get latest AQHI forecasts
		await fetchAqhiData(aqhi_url);
	} catch (err) {
		console.error('Scraper run failed:', err.message || err);
	}
}

init();