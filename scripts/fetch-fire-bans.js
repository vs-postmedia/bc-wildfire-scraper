const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const saveData = require('./save-data');

// VARS
let content, data;
const data_dir = 'data/';
const tableCss = '.responsive-table-wrapper';
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
	$('.responsive-table-wrapper > table > tbody > tr').each((i, el) => {
		const row = [];
		// fire centre names
		row.push($(el).find('th > a').text());

		$(el).find('td').each((i, el) => {
			let url = $(el).find('a').attr('href');
			let alt_tag = $(el).find('img').attr('src');

			if (typeof(alt_tag) !== 'string') {
				alt_tag = 'None';
			} else if (alt_tag.includes('permitted')) {
				alt_tag = '✅';
			} else if (alt_tag.includes('attention')) {
				url = url.startsWith('https') ? url : `https://www2.gov.bc.ca${url}`;
				alt_tag = `[⚠️](${url})`;
			} else if (alt_tag.includes('bans')) {
				url = url.startsWith('https') ? url : `https://www2.gov.bc.ca${url}`;
				alt_tag = `[🚫](${url})`;
			}
			row.push(alt_tag);
		});
		
		data.push(row);
	});

	return data;
}

async function init(url) {
	let response;
	try {
		const browser = await puppeteer.launch({headless: true });
		const page = await browser.newPage();
		await page.goto(url);
		await page.waitForSelector(tableCss); // wait for dynamic html content
		content = await page.content(); // get the rendered html
	} catch (err) {
		console.error(err);
	}

    // scrape the table data
    data = await processHTML(content);

	// save data
	saveData(data, 'fire-bans', 'csv', data_dir);
}


module.exports = init;