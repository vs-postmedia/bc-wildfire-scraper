const fs = require('fs');
const AWS = require('aws-sdk');

// '.' not '..' b/c this is run from index.js
require('dotenv').config({ path: './config/.env' });

async function uploadFile(bucket, filename, filetype, localpath) {
	const spacesEndpoint = new AWS.Endpoint('sfo2.digitaloceanspaces.com');
	const s3 = new AWS.S3({
		endpoint: spacesEndpoint,
		accessKeyId: process.env.SPACES_KEY,
		secretAccessKey: process.env.SPACES_SECRET
	});

	try {
		s3.putObject({
			ACL: 'public',
			Body: fs.createReadStream(`${localpath}/${filename}`),
			Bucket: bucket,
			Key: filename
		})
		.on('build', req => {
			req.httpRequest.headers.Host = 'https://vs-postmedia-data.sfo2.digitaloceanspaces.com';
			req.httpRequest.headers['Content-Type'] = filetype === 'json' ? 'application/json' : 'text/csv';
			req.httpRequest.headers['x-amz-acl'] = 'public-read';
		})
		.send((err, data) => {
			if (err) console.log(err);
			else (JSON.stringify(data, '', 2));
		});

		console.log(`${localpath}/${filename} uploaded to ${bucket}.`);
	} catch (err) {
		console.log(err);
	}
}

module.exports = uploadFile;

// local test
// uploadFile('vs-postmedia-data', 'last-update.json', '../data')