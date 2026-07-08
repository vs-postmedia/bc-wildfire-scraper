const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const saveData = require('./save-data');

// VARS
let data;
const data_dir = 'data/';
const tableCss = '.responsive-table-wrapper';
const filename = 'fire-bans.csv'; // temp file for data
const base_url = 'https://www2.gov.bc.ca/gov/content/safety/wildfire-status/prevention/fire-bans-and-restrictions/'

const header_row = ['Fire centre', 'Campfires', 'Category 2 open burning', 'Category 3 open burning', 'Forest use restrictions'];
 
async function processHTML(html) {
	console.log('Processing fire ban html...');
	
	let data = [];
	const $ = await cheerio.load(html);
	const html_text = $.html();

	// add header row
	data.push(header_row);

	// do some scraping
	$('.responsive-table-wrapper > table > tbody > tr').each((i, el) => {
		const row = [];
		// fire centre names
		let fire_centre = $(el).find('th > a').text();
		row.push(fire_centre);

		// console.log(fire_centre)

		$(el).find('td').each((i, el) => {
			// let url = $(el).find('a').attr('href');
			let alt_tag = $(el).find('img').attr('src');

			if (typeof(alt_tag) !== 'string' || !alt_tag) {
				alt_tag = 'None';
			} else if (alt_tag.includes('permitted')) {
				alt_tag = '✅';
			} else if (alt_tag.includes('attention')) {
				// url = url.startsWith('https') ? url : `https://www2.gov.bc.ca${url}`;
				url = `${base_url}${fire_centre.toLowerCase().replaceAll(' ', '-')}-bans`;
				alt_tag = `[⚠️](${url})`;
			} else if (alt_tag.includes('bans')) {
				// url = url.startsWith('https') ? url : `https://www2.gov.bc.ca${url}`;
				url = `${base_url}${fire_centre.toLowerCase().replaceAll(' ', '-')}-bans`;
				alt_tag = `[🚫](${url})`;
			}
			row.push(alt_tag);
		});
		
		data.push(row);
	});

	return data;
}

const WAIT_STRATEGIES = ['networkidle2', 'load', 'domcontentloaded'];
const MAX_RETRIES = 3;

async function fetchWithRetry(url) {
	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		let browser;
		const waitUntil = WAIT_STRATEGIES[attempt - 1] || 'domcontentloaded';
		try {
			console.log(`Fire bans fetch attempt ${attempt}/${MAX_RETRIES} (waitUntil: ${waitUntil})`);
			browser = await puppeteer.launch({
				headless: true,
				args: [
					'--no-sandbox',
					'--disable-setuid-sandbox',
					'--disable-blink-features=AutomationControlled',
					'--disable-dev-shm-usage',
				]
			});
			const page = await browser.newPage();
			await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
			await page.setViewport({ width: 1280, height: 800 });
			await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
			await page.goto(url, { waitUntil, timeout: 60000 });
			await page.waitForSelector(tableCss, { timeout: 30000 });
			await new Promise(resolve => setTimeout(resolve, 1500));
			const content = await page.content();
			return content;
		} catch (err) {
			console.error(`Attempt ${attempt} failed: ${err.message}`);
			if (attempt === MAX_RETRIES) throw err;
			const delay = attempt * 5000;
			console.log(`Retrying in ${delay / 1000}s...`);
			await new Promise(resolve => setTimeout(resolve, delay));
		} finally {
			if (browser) browser.close();
		}
	}
}

async function init(url) {
	let content;
	try {
		content = await fetchWithRetry(url);
	} catch (err) {
		console.error(`Failed to fetch fire bans after ${MAX_RETRIES} attempts: ${err.message}`);
		console.warn('Keeping existing fire-bans.csv data.');
		return;
	}

    // scrape the table data
    data = await processHTML(content);

	// save data
	saveData(data, 'fire-bans', 'csv', data_dir);
}


module.exports = init;