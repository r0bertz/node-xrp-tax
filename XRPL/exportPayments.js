const fs = require('fs');

const argv = require('yargs')
  .option('account', {
    demandOption: true,
    describe: 'The account to export payment transactions for'
  })
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .option('addresses', {
    describe: 'The path of a file which maps from address to name'
  })
  .help()
  .strict()
  .argv

var transactions = JSON.parse(fs.readFileSync(argv.input, 'utf8'));

var addresses = JSON.parse(fs.readFileSync(argv.addresses, 'utf8'));

var currency = 'XRP'

console.log(
  'Timestamp,' +
  'LedgerVersion,' +
  'Hash,' +
  'Sender,' +
  'SenderName,' +
  'Receiver,' +
  'ReceiverName,' +
  'Fee,' +
  'Currency,' +
  'Vaue'
);

for (var i = 0; i < transactions.length; i++) {
  var tx = transactions[i]
  if (tx.type === 'payment') {
    if (!tx.outcome.balanceChanges.hasOwnProperty(argv.account)) {
      // This happens when unfunded order of 'account' is cancelled.
      continue;
    }
    var sender = tx.specification.source.address
    var receiver = tx.specification.destination.address
    if ((sender === argv.account) === (receiver === argv.account)) {
      // Skip payments in which neither sender nor receiver is 'account' or both
      // sender and receiver are 'account'.
      //
      // This happens when this payment pays with a different currency, i.e.
      // market order.
      continue;
    }
    var line =
      tx.outcome.timestamp + ',' +
      tx.outcome.ledgerVersion + ',' +
      tx.id + ',' +
      sender + ',' +
      addresses[sender] + ',' +
      receiver + ',' +
      addresses[receiver] + ',' +
      tx.outcome.fee;
    var balances = tx.outcome.balanceChanges[argv.account]
    for (var j = 0; j < balances.length; j++) {
      var value = Number(balances[j].value)
      if (balances[j].currency === 'XRP' && sender === argv.account) {
        value += Number(tx.outcome.fee)
      }
      if (value === 0) {
        // This is just fee. Skip it.
        continue
      }
      line += ',' + balances[j].currency + ',' + value
    }
    console.log(line);
  }
}
