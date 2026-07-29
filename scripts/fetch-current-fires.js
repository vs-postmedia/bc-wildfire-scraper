const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
const unzipper = require('unzipper');
const shapefile = require('shapefile');
const proj4 = require('proj4');
const saveData = require('./save-data');

proj4.defs('EPSG:3005', '+proj=aea +lat_1=50 +lat_2=58.5 +lat_0=45 +lon_0=-126 +x_0=1000000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

// VARS
let data_dir, current_year;
const fireMetadataLookup = new Map();

function buildDownloadConfigs(currentFireUrl, currentFirePerimetersUrl) {
	return [
		{
			label: 'current fires',
			url: currentFireUrl,
			zipFileName: 'current-fires.zip',
			shpFileName: 'prot_current_fire_points.shp',
			outputName: 'wildfires',
			candidateUrls: buildCandidateUrls(currentFireUrl, 'prot_current_fire_points.zip')
		},
		{
			label: 'current fire perimeters',
			url: currentFirePerimetersUrl,
			zipFileName: 'current-fire-perimeters.zip',
			shpFileName: 'prot_current_fire_polys.shp',
			outputName: 'fire-perimeters',
			candidateUrls: buildCandidateUrls(currentFirePerimetersUrl, 'prot_current_fire_polys.zip')
		}
	];
}

function buildCandidateUrls(url, fallbackFileName) {
	if (!url) {
		return [];
	}

	if (url.endsWith('.zip') || url.endsWith('.shp')) {
		return [url];
	}

	const normalizedUrl = url.endsWith('/') ? url : `${url}/`;
	return [
		`${normalizedUrl}${fallbackFileName}`,
		`${normalizedUrl}${fallbackFileName.replace(/\.zip$/, '.shp')}`
	];
}

// FUNCTIONS
function normalizeFireKey(value) {
	return String(value || '').trim().toUpperCase();
}

function transformCoordinate(coordinate) {
	if (!Array.isArray(coordinate) || coordinate.length < 2) {
		return coordinate;
	}

	const [x, y] = coordinate;
	if (typeof x !== 'number' || typeof y !== 'number') {
		return coordinate;
	}

	return proj4('EPSG:3005', 'EPSG:4326', [x, y]);
}

function reprojectGeometry(geometry) {
	if (!geometry || typeof geometry !== 'object') {
		return geometry;
	}

	if (Array.isArray(geometry.coordinates)) {
		return {
			...geometry,
			coordinates: reprojectCoordinates(geometry.coordinates)
		};
	}

	if (Array.isArray(geometry.geometries)) {
		return {
			...geometry,
			geometries: geometry.geometries.map(reprojectGeometry)
		};
	}

	return geometry;
}

function reprojectCoordinates(coordinates) {
	if (!Array.isArray(coordinates)) {
		return coordinates;
	}

	if (coordinates.length === 0) {
		return coordinates;
	}

	if (typeof coordinates[0] === 'number') {
		return transformCoordinate(coordinates);
	}

	return coordinates.map(reprojectCoordinates);
}

function ensureDataDirectory() {
	if (!fs.existsSync(data_dir)) {
		fs.mkdirSync(data_dir, { recursive: true });
	}
}

function loadFireMetadataFromWildfires() {
	try {
		const wildfiresPath = path.join(data_dir, 'wildfires.json');
		if (!fs.existsSync(wildfiresPath)) {
			return;
		}

		const wildfires = JSON.parse(fs.readFileSync(wildfiresPath, 'utf8'));
		if (!wildfires || !Array.isArray(wildfires.features)) {
			return;
		}

		wildfires.features.forEach((feature) => {
			const props = feature.properties || {};
			const fireNumber = normalizeFireKey(props.FIRE_NUM);
			const fireName = props.fire_name || props.INCIDNT_NM || props.GEOGRAPHIC || 'Unnamed fire';
			if (fireNumber) {
				fireMetadataLookup.set(fireNumber, {
					fire_name: fireName && fireName !== 'null' ? String(fireName) : 'Unnamed fire',
					ignition_date: props.ignition_date,
					GEOGRAPHIC: props.GEOGRAPHIC,
					FIRE_CAUSE: props.FIRE_CAUSE
				});
			}
		});
	} catch (err) {
		console.error(err.stack || err);
	}
}

async function convert2json(config) {
	console.log(`Processing shapefile for ${config.label}...`);

	if (config.label === 'current fire perimeters') {
		loadFireMetadataFromWildfires();
	}

	const geojson = {
		type: 'FeatureCollection',
		features: []
	};

	try {
		const source = await shapefile.open(path.join(data_dir, config.shpFileName));
		let result = await source.read();

		while (!result.done) {
			const data = result.value;
			data.geometry = reprojectGeometry(data.geometry);
			data.properties.last_update = Date.now();
			const name = data.properties.INCIDNT_NM || data.properties.GEOGRAPHIC || 'Unnamed fire';
			data.properties.fire_name = name === 'null' ? 'Unnamed fire' : name;

			if (config.label === 'current fires' && data.properties.FIRE_NUM) {
				const fireNumber = normalizeFireKey(data.properties.FIRE_NUM);
				fireMetadataLookup.set(fireNumber, {
					fire_name: data.properties.fire_name,
					ignition_date: data.properties.ignition_date,
					GEOGRAPHIC: data.properties.GEOGRAPHIC,
					FIRE_CAUSE: data.properties.FIRE_CAUSE
				});
			}

			if (config.label === 'current fires') {
				if (String(data.properties.STATUS || '').trim().toLowerCase() === 'out') {
					result = await source.read();
					continue;
				}

				data.properties.ignition_date = returnHumanReadableDate(data.properties.IGNITN_DT);

				if (data.properties.CURRENT_SI === null) {
					data.properties.CURRENT_SI = 0;
				}
				if (data.properties.CURRENT_SZ === null) {
					data.properties.CURRENT_SZ = 0;
				}
			}

			if (config.label === 'current fire perimeters') {
				const fireNumber = normalizeFireKey(data.properties.FIRE_NUM);
				const metadata = fireMetadataLookup.get(fireNumber);
				if (metadata) {
					data.properties.fire_name = metadata.fire_name || data.properties.fire_name || 'Unnamed fire';
					if (metadata.ignition_date) {
						data.properties.ignition_date = metadata.ignition_date;
					}
					if (metadata.GEOGRAPHIC !== undefined) {
						data.properties.GEOGRAPHIC = metadata.GEOGRAPHIC;
					}
					if (metadata.FIRE_CAUSE !== undefined) {
						data.properties.FIRE_CAUSE = metadata.FIRE_CAUSE;
					}
				} else {
					data.properties.fire_name = data.properties.fire_name || 'Unnamed fire';
				}

				if (data.properties.FIRE_STAT === 'Out') {
					result = await source.read();
					continue;
				}

				if (data.properties.FIRE_STAT !== undefined) {
					data.properties.STATUS = data.properties.FIRE_STAT;
				}
				if (data.properties.FIRE_SZ_HA !== undefined && data.properties.FIRE_SZ_HA !== null) {
					data.properties.CURRENT_SZ = Number(data.properties.FIRE_SZ_HA);
				}
				if (data.properties.IGNITN_DT !== undefined) {
					data.properties.ignition_date = returnHumanReadableDate(data.properties.IGNITN_DT);
				}

				const propertiesToDrop = ['OBJECTID', 'VERSN_NUM', 'SOURCE', 'TRACK_DATE', 'LOAD DATE', 'LOAD_DATE', 'FEATURE_CD', 'FIRE_STAT', 'FIRE_SZ_HA'];
				propertiesToDrop.forEach((property) => {
					delete data.properties[property];
				});

				if (data.properties.FIRE_SIZE_HA !== undefined && data.properties.FIRE_SIZE_HA !== null) {
					data.properties.fire_size_km2 = Number(data.properties.FIRE_SIZE_HA) * 0.01;
				}
				delete data.properties.FIRE_SIZE_HA;
			}

			geojson.features.push(data);
			result = await source.read();
		}
	} catch (err) {
		console.error(err.stack || err);
	}

	console.log(`Done processing shapefile for ${config.label}...`);
	await saveData(geojson, config.outputName, 'json', data_dir);
	if (config.label === 'current fires') {
		loadFireMetadataFromWildfires();
	}
	cleanUp(config);
}

function cleanUp(config) {
	const ext = ['dbf', 'prj', 'shp', 'shx'];

	ext.forEach((d) => {
		try {
			fs.rmSync(path.join(data_dir, `${path.basename(config.shpFileName, '.shp')}.${d}`), { recursive: true, force: true });
		} catch (err) {
			console.error(err);
		}
	});

	try {
		fs.rmSync(path.join(data_dir, config.zipFileName), { recursive: true, force: true });
	} catch (err) {
		console.error(err);
	}
}

// download & unzip current fire data in shapefile form
async function downloadAndUnzip(config) {
	for (const candidateUrl of config.candidateUrls) {
		try {
			console.log(`Downloading ${config.label} from ${candidateUrl}`);
			const response = await axios({
				url: candidateUrl,
				method: 'GET',
				responseType: 'stream',
				validateStatus: status => status < 500,
				httpsAgent: new https.Agent({
					rejectUnauthorized: false
				})
			});

			if (response.status !== 200) {
				continue;
			}

			ensureDataDirectory();

			if (config.label === 'current fire perimeters') {
				loadFireMetadataFromWildfires();
			}

			await new Promise((resolve, reject) => {
				const writeStream = fs.createWriteStream(path.join(data_dir, config.zipFileName), { flags: 'w' });
				response.data.pipe(writeStream);
				writeStream.on('finish', resolve);
				writeStream.on('error', reject);
			});

			await unzipCurrentFires(config);
			await convert2json(config);
			return;
		} catch (err) {
			console.error(`Failed to download ${config.label} from ${candidateUrl}: ${err.message}`);
			if (err.response && err.response.data) {
				console.error(err.response.data);
			}
		}
	}

	throw new Error(`Unable to download ${config.label}`);
}

function returnHumanReadableDate(str) {
	const month_lookup = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

	const d = new Date(str);
	const month = month_lookup[parseInt(d.getUTCMonth())];
	return `${month} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function unzipCurrentFires(config) {
	return new Promise((resolve, reject) => {
		fs.createReadStream(path.join(data_dir, config.zipFileName))
			.pipe(unzipper.Extract({ path: data_dir }))
			.on('close', resolve)
			.on('error', reject);
	});
}

async function init(dir, current_fire_url, current_fire_perimeters_url) {
	// set data directory & current year
	data_dir = dir ? path.resolve(__dirname, '..', dir) : path.resolve(__dirname, '..', 'data');
	current_year = new Date().getUTCFullYear();
	ensureDataDirectory();

	const downloadConfigs = buildDownloadConfigs(current_fire_url, current_fire_perimeters_url);

	for (const config of downloadConfigs) {
		if (!config.url) {
			continue;
		}

		try {
			await downloadAndUnzip(config);
		} catch (err) {
			console.error(err.message);
		}
	}
}

module.exports = init;
module.exports.buildDownloadConfigs = buildDownloadConfigs;