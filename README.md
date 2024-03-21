# B.C. wildfire data scraper    

Downloads:
* Current wildfire data from 'https://pub.data.gov.bc.ca/datasets/2790e3f7-6395-4230-8545-04efb5a18800/prot_current_fire_points.zip' & converts to csv/json.
* FireSmoke PM2.5 data from https://firesmoke.ca/forecasts/current/dispersion.kmz
* AQHI forecast data from: https://envistaweb.env.gov.bc.ca/aqo/csv/AQHIWeb.csv

Scheduled to run daily at 2a.m. (wildfire data is typically updated around midnight daily)


Powers the Vancouver Sun wildfire tracker map:
* map: https://github.com/vs-postmedia/wildfire-tracker-v3
* fire bans: https://app.flourish.studio/visualisation/13660496/edit
* aqhi: https://github.com/vs-postmedia/aqhi-forecast-table