const fetchCurrentFires = require('./scripts/fetch-current-fires');


// VARS
const data_dir = 'data';
const current_fires_url = 'https://pub.data.gov.bc.ca/datasets/2790e3f7-6395-4230-8545-04efb5a18800/prot_current_fire_points.zip'
const wildfire_rss_feed = 'http://bcfireinfo.for.gov.bc.ca/FTP/!Project/WildfireNews/xml/All-WildfireNews.xml';

async function init() {
	// get RSS feed for fires of note
	// const fon_ids = await parseRssFeed(wildfire_rss_feed);

	// get current fires from BC data
	fetchCurrentFires(data_dir, current_fires_url);

	// get latest firesmoke data
}

init();