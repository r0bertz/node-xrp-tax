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
    var ol = _.cloneDeep(l);
    var buyOrders = [];
    while (l.volume.gte(last.volume)) {
      l.merge(last);
      buyOrders.push(lines.pop());
      last = lines[lines.length-1]
    }
    last.merge(l);
    l.action = 'BUY';
    l.price = last.price;
    buyOrders.push(l);
    var cost = BigNumber(0);
    buyOrders.forEach(o => {
      cost = cost.plus(o.volume.times(o.price));
    });
    var proceeds = ol.volume.times(ol.price);
    var gains = proceeds.minus(cost);
    if (proceeds.eq(0)) {
      return;
    }
    console.log(ol.date.toISOString(), ol.volume.toFixed(6),
      proceeds.toFixed(2), cost.toFixed(2), gains.toFixed(2));
  })
