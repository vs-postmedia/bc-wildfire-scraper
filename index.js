const fetchCurrentFires = require('./scripts/fetch-current-fires');


// VARS
const data_dir = 'data';

async function init() {
	// get current fires from BC data
	fetchCurrentFires(data_dir);
	
	// get latest firesmoke data

}

init();