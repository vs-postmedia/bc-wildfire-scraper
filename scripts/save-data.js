const fs = require('fs');
const path = require('path');
let Parser = require('@json2csv/plainjs').Parser;

async function saveData(data, filename, format, data_dir, header) {
	console.log(`Saving data to ${filename}`);

	const outputDir = path.resolve(data_dir);
	const outputPath = path.join(outputDir, `${filename}.${format}`);

	try {
		fs.mkdirSync(outputDir, { recursive: true });
	} catch (err) {
		console.error(err);
	}

	// save file locally
	if (format === 'json') {
		try {
			fs.writeFileSync(outputPath, JSON.stringify(data));
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
			fs.writeFileSync(outputPath, parser.parse(data));
		} catch (err) {
			console.error(err);
		}
	}
}


module.exports = saveData;