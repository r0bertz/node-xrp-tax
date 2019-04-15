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
  })
  .option('exclude_symbol', {
    describe: 'Exclude transactions for this symbol',
    type: 'array'
  })
  .check((args, options) => {
    if ((typeof args.symbol === 'undefined') ===
        (typeof args.exclude_symbol === 'undefined')) {
      throw 'must define exactly one of --symbol and --exclude_symbol'
    }
    return true;
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
    line = Line.fromBitstamp(row, argv.symbol, argv.exclude_symbol)
    if (!line) {
      return;
    }
    return line.toString() + "\n";
  }))
  .pipe(process.stdout);
