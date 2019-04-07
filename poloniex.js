const fs = require('fs');
const Line = require('./line.js');
const csv = require('csv')
const argv = require('yargs')
  .option('input', {
    describe: 'The path of the input file'
  })
  .option('type', {
    describe: 'The type of history file',
    choices: ['trade', 'deposit', 'withdraw']
  })
  .demandOption(['input', 'type'])
  .help()
  .strict()
  .argv

fs.createReadStream(argv.input)
  .pipe(csv.parse({columns: true}))
  .pipe(csv.transform(function(row){
    if (row === null) {
      return;
    }
    var line;
    switch (argv.type) {
      case 'trade':
        line = Line.fromPoloniex(row);
        break;
      case 'deposit':
        line = Line.fromPoloniexDeposit(row);
        break;
      case 'withdraw':
        line = Line.fromPoloniexWithdraw(row);
        break;
    }
    return line.toString() + "\n";
  }))
  .pipe(process.stdout);
