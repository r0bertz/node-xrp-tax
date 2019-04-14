// Generate input for www.easytxf.com

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
    describe: 'export sales that happened in this year only',
  })
  .coerce('ignore_later_than', (arg) => new Date(arg))
  .help()
  .strict()
  .argv

lines = []

function FormatDate(date) {
  var month = date.getMonth() + 1
  var day = date.getDay() + 1
  return month + '/' + day + '/' + date.getUTCFullYear();
}

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
    var closing = _.cloneDeep(l);
    var openings = [];
    while (l.volume.gte(last.volume)) {
      l.merge(last);
      openings.push(lines.pop());
      last = lines[lines.length-1]
    }
    last.merge(l);
    l.action = 'BUY';
    l.price = last.price;
    l.date = last.date;
    openings.push(l);
    var openingNA = BigNumber(0);
    openings.forEach(o => {
      openingNA = openingNA.plus(o.volume.times(o.price));
    });
    var closingNA = closing.volume.times(closing.price);
    if (closingNA.eq(0)) {
      return;
    }
    if (closing.date.getUTCFullYear() !== argv.year) {
      return;
    }
    console.log('XRP,' +
      closing.volume.toFixed(6) + ',' +
      FormatDate(openings[0].date) + ',' +
      openingNA.toFixed(2) + ',' +
      FormatDate(closing.date) + ',' +
      closingNA.toFixed(2)
    );
  })
