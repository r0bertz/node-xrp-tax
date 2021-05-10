// Extracts timestamps at which the XRP price in USD/Bistamp needs to be filled.
// The output is an object which looks like:
// {
//   "2014-07-29T08:31:30.000Z": null,
//   ...
// }

const fs = require('fs');
const csv = require('csv')
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .option('output', {
    describe: 'The path of the output file'
  })
  .demandOption(['input', 'output'])
  .help()
  .strict()
  .argv

var pricePoints = JSON.parse(fs.readFileSync(argv.output, 'utf8'));

function isGift(source) {
  let hint = source.split(':')[0];
  return hint === 'Gift';
}

fs.createReadStream(argv.input)
  .pipe(csv.parse())
  .on('data', (row) => {
    if (row === null) {
      return;
    }
    let date = row[0];
    // Find out the price in USD if this is gift or if the currency is not USD.
    if (isGift(row[1]) || row[5] !== 'USD') {
      if (!pricePoints.hasOwnProperty(date)) {
        pricePoints[date] = null;
      }
    }
  })
  .on('end', () => {
    ordered = Object.fromEntries(Object.entries(pricePoints).sort());
    fs.writeFile(argv.output, JSON.stringify(ordered, null, 2), function(err) {
      if(err) {
        return console.log(err);
      }
      console.log("The file was saved!");
      process.exit();
    })
  })
