const fs = require('fs');
const axios = require('axios');
const { Parser } = require('json2csv');
const uploadFile = require('./scripts/upload-file');
const cheerioScraper = require('./scripts/cheerioScraper');
const puppeteerScraper = require('./scripts/puppeteerScraper');

// VARS
const data_dir = './data';
const urls = ['https://www.gasbuddy.com/GasPrices/British%20Columbia/']; // URL to scrape
const bucket = 'vs-postmedia-data'; // cloud storage bucket
const filename = 'data.csv'; // temp file for data


async function downloadHTML(urls, useCheerio) {
	let html;
	// get first url in the list
	const url = urls.shift();
	// clean it up a bit to use as a filename
	const cleanUrl = url.split('//')[1].replace(/\//g, '_');
	const htmlFilename = `${data_dir}/${cleanUrl}.html`;
	
	// check if we already have the file downloaded
	const fileExists = fs.existsSync(htmlFilename);
	
	if (!fileExists) {
		// download the HTML from the web server
		console.log(`Downloading HTML from ${url}...`);
		// fetchDeaths & fetchCases & other files
		html = await axios.get(url);
		
		// save the HTML to disk
		try {
			await fs.promises.writeFile(htmlFilename, html);
		} catch(err) { 
			console.log(err);
		}
	} else {
		console.log(`Skipping download for ${url} since ${cleanUrl} already exists.`);
	}
	
	// load local copy of html
	html = await fs.readFileSync(htmlFilename);

	// scrape downloaded file
	const results = await processHTML(html, true);

	// if there's more links, let's do it again!
	if(urls.length > 0) {
		console.log('Downloading next url...');
		downloadHTML(urls, true);
	} else {
		saveData(results, filename, 'csv');
	}
}

// scrape & cache results
async function processHTML(html, useCheerio) {
	return (useCheerio) ? await cheerioScraper(html) : puppeteerScraper(html);
}

function saveData(data, filename, format) {
	console.log(`Saving data to ${filename}`);

	// save file locally
	if (format === 'json') {
		try {
			fs.writeFileSync(`${data_dir}/${filename}`, JSON.stringify(data));
		} catch (err) {
			console.error(err);
		}
	} else {
		try {
			const parser = new Parser();
			fs.writeFileSync(`${data_dir}/${filename}`, parser.parse(data));
		} catch (err) {
			console.error(err);
		}
	}
	
	// upload to Google Cloud
	// uploadFile(bucket, filename, format, './data');
}

// 
downloadHTML(urls, true); // set 'useCheerio' to false to run puppeteer




