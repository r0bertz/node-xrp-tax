// Calculate cost basis in LIFO manner.

const fs = require('fs');
const csv = require('csv')
const Line = require('./line.js');
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .option('ignore_later_than', {
    describe: 'ISO date string. Ignore transactions later than this date.'
  })
  .coerce('ignore_later_than', (arg) => new Date(arg))
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
    let l = new Line(...row);
    if (l.date > argv.ignore_later_than) {
      return;
    }
    l.mergeFee()
    if (lines.length == 0) {
      lines.push(l);
      return;
    }
    let last = lines[lines.length-1];
    if (l.date < last.date) {
      throw 'going backwards!'
    }
    if (!last.canMerge(l)) {
      lines.push(l);
      return;
    }
    while (l.volume.gte(last.volume)) {
      l.merge(last);
      lines.pop();
      last = lines[lines.length-1]
    }
    last.merge(l);
  })
  .on('end', () => {
    lines.forEach(l => {
      console.log(l.toString());
    });
  })
