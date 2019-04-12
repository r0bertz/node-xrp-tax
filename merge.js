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
      if (lines[i].action === 'SEND' && lines[i+1].action === 'RECEIVE' &&
          lines[i].volume.gte(lines[i+1].volume)) {
        lines[i].merge(lines[i+1]);
        i += 1;
      }
      i += 1
      console.log(lines[n].toString());
    }
    console.log(lines[i].toString());
  })
