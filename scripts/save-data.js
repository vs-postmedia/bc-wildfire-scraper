const fs = require('fs');

async function saveData(data, filename, format, data_dir) {
	console.log(`Saving data to ${filename}`);

	// save file locally
	if (format === 'json') {
		try {
			fs.writeFileSync(`${data_dir}/${filename}.${format}`, JSON.stringify(data));
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
}


module.exports = saveData;