const fs = require('fs');
const Line = require('./line.js');
const csv = require('csv')
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .option('symbol', {
    describe: 'Export transactions for this symbol only',
    default: 'XRP'
  })
  .help()
  .strict()
  .argv

fs.createReadStream(argv.input)
  .pipe(csv.parse({columns: true}))
  .pipe(csv.transform(function(row){
    if (row === null) {
      return;
    }
    line = Line.fromBitstamp(row, argv.symbol)
    if (!line) {
      return;
    }
    return line.toString() + "\n";
  }))
  .pipe(process.stdout);
