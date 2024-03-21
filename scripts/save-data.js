const fs = require('fs');
let Parser = require('@json2csv/plainjs').Parser;

async function saveData(data, filename, format, data_dir, header) {
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
			const parser = new Parser({
				// header: false,
				header: header !== undefined ? true: false,
				withBOM: true
			});
			fs.writeFileSync(`${data_dir}/${filename}.${format}`, parser.parse(data));
		} catch (err) {
			console.error(err);
		}
	}
}


module.exports = saveData;