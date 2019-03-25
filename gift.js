const fs = require('fs');
const Line = require('./line.js');
const csv = require('csv')
const fetch = require('node-fetch');
const argv = require('yargs')
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .help()
  .strict()
  .argv

promises = []

fs.createReadStream(argv.input)
  .pipe(csv.parse({columns: true}))
  .on('data', (row) => {
    if (row === null) {
      return;
    }
    if (row.Source === 'Gift') {
      let d = row.Date
      p = fetch('https://data.ripple.com/v2/exchange_rates/XRP/USD+rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B/?date=' + d)
        .then(res => res.json())
        .then(json => {
          return [d, json.rate];
        });
      promises.push(p);
    }
  })
  .on('end', () => {
    Promise.all(promises).then(values => {
      m = new Map(values);
      fs.createReadStream(argv.input)
        .pipe(csv.parse({columns: true}))
        .pipe(csv.transform(function(row) {
          if (row.Source === 'Gift') {
            row.Price = m.get(row.Date);
          }
          return row;
        }))
        .pipe(csv.stringify())
        .pipe(process.stdout);
    });
  })
