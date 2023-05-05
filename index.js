const fetchCurrentFires = require('./scripts/fetch-current-fires');
const fetchSmokeData = require('./scripts/fetch-smoke-data');

// VARS
const data_dir = 'data';
const current_fires_url = 'https://pub.data.gov.bc.ca/datasets/2790e3f7-6395-4230-8545-04efb5a18800/prot_current_fire_points.zip';

async function init() {

	// get current fires from BC data
	fetchCurrentFires(data_dir, current_fires_url);

	// get latest firesmoke data
	fetchSmokeData();
}

init();