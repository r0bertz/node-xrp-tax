// Replace price in non-USD currency with price is USD. Also fill price for
// Gift.

const fs = require('fs');
const Line = require('../line.js');
const csv = require('csv')
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .option('price_file', {
    demandOption: true,
    describe: 'The path of the usd price file'
  })
  .help()
  .strict()
  .argv

function isGift(source) {
  let hint = source.split(':')[0];
  return hint === 'Gift';
}

var m = new Map(JSON.parse(fs.readFileSync(argv.price_file, 'utf8')));

fs.createReadStream(argv.input)
  .pipe(csv.parse())
  .pipe(csv.transform(function(row){
    if (row[0] === 'Date') {
      // Skip header.
      return;
    }
    line = new Line(...row);
    if (isGift(line.source) || line.currency !== 'USD') {
      line.currency = 'USD';
      line.price = m.get(row[0]);
    }
    return line.toString() + '\n';
  }))
  .pipe(process.stdout);
