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
    describe: 'Export sales for this year only',
    type: 'integer'
  })
  .option('source', {
    describe: 'Export sales for this source only',
    type: 'string'
  })
  .option('easytxf', {
    describe: 'If true, export in easytxf.com format',
    type: 'boolean'
  })
  .help()
  .strict()
  .argv

symbols = {}

fs.createReadStream(argv.input)
  .pipe(csv.parse())
  .on('data', (row) => {
    if (row === null) {
      return;
    }
    let l = new Line(...row);
    l.mergeFee()
    if (!symbols.hasOwnProperty(l.symbol)) {
      symbols[l.symbol] = [];
    }
    let lines = symbols[l.symbol];
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
    while (last && l.volume.gte(last.volume)) {
      sales.push(l.merge(last));
      lines.pop();
      last = lines[lines.length-1]
    }
    if (last) {
      sales.push(last.merge(l));
    }
    if (argv.source && l.source !== argv.source) {
      return;
    }
    if (argv.year && l.date.getUTCFullYear() !== argv.year) {
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
