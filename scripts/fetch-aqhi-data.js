const fs = require('fs');
const path = require('path')
const axios = require('axios');
const saveData = require('./save-data');

// VARS
const data_dir = 'data';
const filename = 'aqhi-data';
const url = 'https://envistaweb.env.gov.bc.ca/aqo/csv/AQHIWeb.csv';


// FUNCTIONS
async function init() {
	console.log(`Fetching AQHI data from ${url}`)
	const csv = await axios.get(url);
	let json = csv2JSON(csv.data);

	const results = json.map(d => {
		return {
			name: d.AQHI_AREA.includes('Metro') ? setName(d.AQHI_AREA) : d.AQHI_AREA,
			current_risk: d.AQHICURRENT_Text1,
			current_at_risk: d.AQHICURRENT_Text2,
			current_no_risk: d.AQHICURRENT_Text3,
			date: d.DATE_LOCAL,
			today: d.VALUE_CHAR,
			tonight: d.FORECAST_TONIGHT,
			tomorrow: d.FORECAST_TOMORROW,
			tomorrow_night: d.FORECAST_TOMORROW_NIGHT
		}
	});

	// save to local file
	saveData(results, 'aqhi-data', 'csv', data_dir, true);
}

// Function to convert CSV data to JSON
function csv2JSON(csv) {
    const lines = csv.split('\n');
    const result = [];
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
        const obj = {};
        const currentLine = lines[i].split(',');

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentLine[j];
        }

        result.push(obj);
    }

    return result;
}

function setName(area) {
	let name;
	switch(area) {
		case 'Metro Vancouver NE':
			name = 'Coquitlam, Ridge-Meadows';
			break;
		case 'Metro Vancouver NW':
			name = 'Vancouver, Burnaby, North Shore & New West.';
			break;
		case 'Metro Vancouver SE':
			name = 'Surrey & Langley';
			break;
		case 'Metro Vancouver SW':
			name = 'Richmond, Delta & Tsawwassen';
			break;
	}
	return name;
}

// kick isht off!!!
init();


module.exports = init;
