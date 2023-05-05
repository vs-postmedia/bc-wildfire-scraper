// const fs = require('fs');
const cheerio = require('cheerio');
const axios = require('axios').default;
const saveData = require('./save-data');

// VARS
let data;
const data_dir = 'data/';
const filename = 'fire-bans.csv'; // temp file for data

const header_row = ['Fire centre', 'Campfires', 'Category 2 open burning', 'Category 3 open burning', 'Forest use restrictions'];
 
async function processHTML(html) {
	console.log('Processing html...');
	let data = [];
	const $ = await cheerio.load(html);

	const html_text = $.html();

	// add header row
	data.push(header_row);

	// do some scraping
	$('#body > table > tbody > tr').each((i, el) => {
		const row = [];
		// fire centre names
		row.push($(el).find('th > a').text());

		$(el).find('td').each((i, el) => {
			let alt_tag = $(el).find('img').attr('alt');

			// console.log(alt_tag)
			if (typeof(alt_tag) !== 'string') {
				alt_tag = 'None';
			} else if (alt_tag.includes('permitted')) {
				// alt_tag = 'U+2705';
				alt_tag = '✅';
			} else if (alt_tag.includes('more information')) {
				// alt_tag = 'U+26A0';
				alt_tag = '⚠️';
			} else if (alt_tag.includes('ban')) {
				// alt_tag = 'U+26D4';
				alt_tag = '🚫';
			}
			
			row.push(alt_tag);
		});
		
		data.push(row);
	});

	console.log(data)
	return data;
}

async function init(url) {
	let response;
	try {
		response = await axios.get(url, { 
			reponseType: "arraybuffer",
			headers: { "Accept-Encoding": "application/xml" }
		});
	} catch (err) {
		console.error(err);
	}

    // scrape the table data
    data = await processHTML(response.data);

	// save data
	saveData(data, 'fire-bans', 'csv', data_dir);
}


module.exports = init;