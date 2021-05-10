// Fill the XRP price in USD/Bitstamp in the output of extractPricePoint.js
// The input file will be overwritten. Some url fetch may fail due to
// rate-limiting. If that happens, repeat the same command till all prices are
// filled.

const BigNumber = require('bignumber.js');
const fs = require('fs');
const Line = require('../line.js');
const csv = require('csv')
const fetch = require('node-fetch');
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .help()
  .strict()
  .argv

// DelayPromise returns a promise that is resolved after delay seconds.
function DelayPromise(delay) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() {
      resolve();
    }, 1500 * delay);
  });
}

var promises = []
var counter = 0;
var pricePoints = JSON.parse(fs.readFileSync(argv.input, 'utf8'));

process.on('SIGINT', () => {
  console.info('SIGINT signal received.');
  fs.writeFile(argv.input, JSON.stringify(pricePoints, null, 2), function(err) {
    if(err) {
      return console.log(err);
    }
    console.log("The file was saved!");
    process.exit();
  })
});

for (const [d, price] of Object.entries(pricePoints)) {
  if (price) {
    continue;
  }

  let url = 'https://data.ripple.com/v2/exchange_rates/'
    + 'XRP/USD+rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B/?date=' + d;
  promises.push(DelayPromise(counter)
    .then(() => {
      return fetch(url);
    })
    .then(res => res.json())
    .then(json => {
      console.log(d, json);
      if (json.result === 'success') {
        pricePoints[d] = json.rate;
      }
      return;
    })
  );
  counter++;
};

Promise.all(promises).then(_ => {
  fs.writeFile(argv.input, JSON.stringify(pricePoints, null, 2), function(err) {
    if(err) {
      return console.log(err);
    }
    console.log("The file was saved!");
    process.exit();
  })
});
