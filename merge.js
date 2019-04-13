// Merges SEND with the immediate next RECEIVE. These transactions moves fund
// between the accounts that I own.

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

lines = []

fs.createReadStream(argv.input)
  .pipe(csv.parse())
  .on('data', (row) => {
    if (row === null) {
      return;
    }
    lines.push(new Line(...row))
  })
  .on('end', () => {
    var i = 0;
    while (i < lines.length-1) {
      let n = i;
      if (lines[n].action === 'SEND' && lines[n+1].action === 'RECEIVE' &&
          lines[n].volume.gte(lines[n+1].volume)) {
        lines[n].merge(lines[n+1]);
        i += 1;
      }
      i += 1
      if (lines[n].volume.eq(0) && lines[n].fee.eq(0)) {
        continue;
      }
      console.log(lines[n].toString());
    }
    console.log(lines[i].toString());
  })
