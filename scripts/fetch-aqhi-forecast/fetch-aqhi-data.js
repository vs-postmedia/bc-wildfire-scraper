import fs from 'fs';
import path from 'path';
import axios from 'axios';
import saveData from './scripts/save-data.js';


// VARS
const data_dir = 'data';
const filename = 'aqhi-data';
const url = 'https://envistaweb.env.gov.bc.ca/aqo/csv/AQHIWeb.csv'; // URL to scrape

async function init(url) {
	console.log(`Fetching data from ${url}`)
	const csv = await axios.get(url);
	let json = csv2JSON(csv.data);

	const results = json.map(d => {
		return {
			name: d.AQHI_AREA.includes('Metro') ? setName(d.AQHI_AREA) : d.AQHI_AREA,
			// color_today: colourLookup(d.FORECAST_TODAY),
			// color_tonight: colourLookup(d.FORECAST_TONIGHT),
			// color_tomorrow: colourLookup(d.FORECAST_TOMORROW),
			// color_tomorrow_night: colourLookup(d.FORECAST_TOMORROW_NIGHT),
			current_risk: d.AQHICURRENT_Text1,
			current_at_risk: d.AQHICURRENT_Text2,
			current_no_risk: d.AQHICURRENT_Text3,
			date: d.DATE_LOCAL,
			today: d.FORECAST_TODAY,
			tonight: d.FORECAST_TONIGHT,
			tomorrow: d.FORECAST_TOMORROW,
			tomorrow_night: d.FORECAST_TOMORROW_NIGHT
			// today_text: d.AQHITODAY_Text1,
			// tonight_text: d.AQHITONIGHT_Text1,
			// tomorrow_text: d.AQHITOMORROW_Text1,
			// tomorrow_night_text: d.AQHITOMORROW_NIGHT_Text1
		}
	});


	// save to local file
	saveData(results, path.join(`./${data_dir}/${filename}`), 'csv');
}

function colourLookup(aqhi) {
	// console.log(aqhi)
	const score = aqhi === '+' ? 11 : parseInt(aqhi);
	const colours = ['#00CCFF','#0099CC','#006699','#FFFF0','#FFCC00','#FF9933','#FF6666','#FF0000','#CC0000','#990000','#660000']; // AQHI COLOUR VALUES
	
	return colours[score - 1];
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
init(url);

