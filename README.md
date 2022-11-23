# web-scraper-template
Bootstraped node/cheerio script to scrape a webpage then upload the data as json to Google Cloud services where it can be accessed by a react-app.

TO UPLOAD TO DIGITAL OCEAN SPACE (vs-postmedia-data): 
1. get KEY & SECRET from DO space
2. create .env file in `config` directory. Should look like so:
SPACES_KEY="XXX"
SPACES_SECRET="XXX"

Sync git & heroku
https://devcenter.heroku.com/articles/git#creating-a-heroku-remote