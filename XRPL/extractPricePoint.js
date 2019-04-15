// Extracts timestamps at which the XRP price in USD/Bistamp needs to be filled.
// The output is an array which looks like:
// [
//   [
//     "2014-07-29T08:31:30.000Z",
//     null
//   ],
//   ...
// ]

const fs = require('fs');
const csv = require('csv')
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .help()
  .strict()
  .argv

promises = []

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
    // Find out the price in USD if this is gift or if the currency is not USD.
    if (isGift(row[1]) || row[5] !== 'USD') {
      let date = row[0];
      promises.push(new Promise(function(resolve, reject) {
        resolve([date, undefined]);
      }));
    }
  })
  .on('end', () => {
    Promise.all(promises).then(values => {
      console.log(JSON.stringify(values, null, 2));
    });
  })
