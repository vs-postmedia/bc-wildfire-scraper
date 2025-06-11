const fetchCurrentFires = require('./scripts/fetch-current-fires');
const fetchSmokeData = require('./scripts/fetch-smoke-data');
const fetchFireBans = require('./scripts/fetch-fire-bans');
const fetchAqhiData = require('./scripts/fetch-aqhi-data');

// VARS
const data_dir = 'data';
const current_fires_url = 'https://pub.data.gov.bc.ca/datasets/2790e3f7-6395-4230-8545-04efb5a18800/prot_current_fire_points.zip';
const fire_bans_url = 'https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions';
const aqhi_url = 'https://envistaweb.env.gov.bc.ca/aqo/csv/AQHIWeb.csv';

async function init() {
	// get current fires from BC data
	fetchCurrentFires(data_dir, current_fires_url);

	// get latest firesmoke data
	fetchSmokeData();

	// get latest fire ban data
	fetchFireBans(fire_bans_url);

	// get latest AQHI forecasts
	fetchAqhiData(aqhi_url);
}

init();