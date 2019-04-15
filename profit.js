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
  .option('exclude_source', {
    describe: 'Exclude sales for this source only',
    type: 'string'
  })
  .option('easytxf', {
    describe: 'If true, export in easytxf.com format',
    type: 'boolean'
  })
  .option('combine', {
    describe: 'If true, combine sales for the same symbol, bought and sold in the same day',
    type: 'boolean'
  })
  .conflicts('source', 'exclude_source')
  .help()
  .strict()
  .argv

output = [];
symbols = {};
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
    if (argv.exclude_source && l.source === argv.exclude_source) {
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
      let lastT = output[output.length-1]
      if (argv.combine &&lastT &&
          t.symbol === lastT.symbol &&
          t.openingDate === lastT.openingDate &&
          t.closingDate === lastT.closingDate
      ) {
        lastT.volume = lastT.volume.plus(t.volume);
        lastT.cost = lastT.cost.plus(t.cost);
        lastT.proceeds = lastT.proceeds.plus(t.proceeds);
        lastT.profit = lastT.proceeds.minus(lastT.cost);
      } else {
        output.push(t);
      }
    }
  })
  .on('end', () => {
    output.forEach(t => {
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
    });
  });
