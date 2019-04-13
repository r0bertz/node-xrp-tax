// Convert to bitcoin.tax format.

const fs = require('fs');
const csv = require('csv')
const Line = require('./line.js');
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .help()
  .strict()
  .argv

console.log(Line.header());

fs.createReadStream(argv.input)
  .pipe(csv.parse())
  .pipe(csv.transform(function(row){
    if (row === null) {
      return;
    }
    line = new Line(...row)
    return line.toBitcoinTaxFormat() + "\n";
  }))
  .pipe(process.stdout);
