const fs = require('fs');
const Line = require('./line.js');
const csv = require('csv')
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
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
    line = Line.fromBitstamp(row)
    if (!line) {
      return;
    }
    return line.toString() + "\n";
  }))
  .pipe(process.stdout);
