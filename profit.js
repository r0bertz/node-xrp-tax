// Calculate profit in LIFO manner.

const _ = require('lodash');
const fs = require('fs');
const csv = require('csv')
const BigNumber = require('bignumber.js');
const Line = require('./line.js');
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .option('year', {
    describe: 'export sales for this year only'
  })
  .option('easytxf', {
    describe: 'if true, export in easytxf.com format',
    type: 'boolean'
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
    let l = new Line(...row);
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
    var sales = [];
    while (l.volume.gte(last.volume)) {
      sales.push(l.merge(last));
      lines.pop();
      last = lines[lines.length-1]
    }
    sales.push(last.merge(l));
    if (l.date.getUTCFullYear() !== argv.year) {
      return;
    }
    while (sales.length > 0) {
      let t = sales.pop();
      if (t.profit.toFixed(2) === '0.00' ||
          t.profit.toFixed(2) === '-0.00') {
        continue;
      }
      if (argv.easytxf) {
        console.log(t.symbol + ',' +
          t.volume.toFixed(6) + ',' +
          t.openingDate + ',' +
          t.cost.toFixed(2) + ',' +
          t.closingDate + ',' +
          t.proceeds.toFixed(2)
        );
      } else {
        console.log(t.symbol,
          t.volume.toFixed(6),
          t.openingDate,
          t.cost.toFixed(2),
          t.closingDate,
          t.proceeds.toFixed(2),
          t.profit.toFixed(2)
        );
      }
    }
  })
