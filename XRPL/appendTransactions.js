const fs = require('fs');
const RippleAPI = require('ripple-lib').RippleAPI;
const argv = require('yargs')
  .option('account', {
    describe: 'The account to get transactions for'
  })
  .option('input', {
    describe: 'The path of the input file'
  })
  .demandOption(['account', 'input'])
  .help()
  .strict()
  .argv

const api = new RippleAPI({
  // Public full history rippled server hosted by Ripple, Inc.
  server: 'wss://s2.ripple.com',
  maxFeeXRP: '0.0002'
});

api.on('error', (errorCode, errorMessage, data) => {
  console.log('api error: ', errorCode + ': ' + errorMessage + ': ' + data);
});
api.on('connected', () => {
  console.log('connected');
});
api.on('disconnected', (code) => {
  // code - [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent) sent by the server
  // will be 1000 if this was normal closure
  console.log('disconnected, code:', code);
});

api.connect().then(() => {
  var transactions = JSON.parse(fs.readFileSync(argv.input, 'utf8'));
  return api.getTransactions(argv.account, {
    'excludeFailures': true,
    'earliestFirst': true,
    'minLedgerVersion': Number(transactions[transactions.length-1].outcome.ledgerVersion) + 1
  }).then(response => {
    transactions = transactions.concat(response);
    return fs.writeFile(argv.input, JSON.stringify(transactions, null, 2), function(err) {
      if(err) {
        return console.log(err);
      }
      console.log("The file was saved!");
      process.exit();
    })
  })
}).then(() => {
  api.disconnect().then(() => {
    console.log('api disconnected');
    process.exit();
  });
}).catch(console.error);
