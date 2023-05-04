const fetchCurrentFires = require('./scripts/fetch-current-fires');


// VARS
const data_dir = 'data';
const wildfire_rss_feed = 'http://bcfireinfo.for.gov.bc.ca/FTP/!Project/WildfireNews/xml/All-WildfireNews.xml';

async function init() {
	// get RSS feed for fires of note
	// const fon_ids = await parseRssFeed(wildfire_rss_feed);

	// get current fires from BC data
	fetchCurrentFires(data_dir);

	// get latest firesmoke data
}

init();