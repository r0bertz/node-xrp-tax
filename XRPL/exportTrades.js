// Exports transactions that receive, send or trade 'symbol'.
const symbol = 'XRP'
const BigNumber = require('bignumber.js');
const fs = require('fs');
const Line = require('../line.js');

const argv = require('yargs')
  .option('account', {
    demandOption: true,
    describe: 'The account to get transactions for'
  })
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .option('addresses', {
    describe: 'The path of a file which maps from address to name'
  })
  .option('cost_basis_hint', {
    describe: 'The path of a file which maps from address name to symblic name which helps to determine cost basis'
    // It only applies to incoming fund.
    // Valid values are:
    //   * Self: Fund originates from this account. Use the original price when
    //           bought on this account. The account after comma is the receiver
    //           of the fund when it was sent out. Otherwise, the sender was the
    //           receiver.
    //   * Gift: Use market price on that day.
    //   * Name of an exchange: Use the price when bought on exchange.
  })
  .help()
  .strict()
  .argv

var transactions = JSON.parse(fs.readFileSync(argv.input, 'utf8'));

if (typeof argv.addresses !== 'undefined') {
  var addresses = JSON.parse(fs.readFileSync(argv.addresses, 'utf8'));
}

if (typeof argv.cost_basis_hint !== 'undefined') {
  var hints = JSON.parse(fs.readFileSync(argv.cost_basis_hint, 'utf8'));
}


function getFundSource(action, address) {
  if (typeof argv.addresses === 'undefined') {
    return '';
  }
  var name = addresses[address];
  if (action === 'Receive' && typeof hints !== 'undefined' &&
    hints.hasOwnProperty(name)) {
    return hints[name] + ':' + name;
  }
  return name;
}

var lines = []

transactions.forEach(function(tx) {
  if (tx.type === 'payment' || tx.type === 'order') {
    if (!tx.outcome.balanceChanges.hasOwnProperty(argv.account)) {
      // This happens when unfunded order of 'account' is cancelled.
      return;
    }
    var balances = tx.outcome.balanceChanges[argv.account]
    // currency to value.
    var cv = {};
    balances.forEach(function(b) {
      // Same currency can appear twice in balances.
      if (cv.hasOwnProperty(b.currency)) {
        cv[b.currency] = cv[b.currency].plus(BigNumber(b.value));
      } else {
        cv[b.currency] = BigNumber(b.value);
      }
    });
    // Ignore fee, since some fees (fee of transactions that doesn't trade XRP)
    // are ignored anyway.
    if (cv.hasOwnProperty('XRP') && tx.address === argv.account) {
      cv.XRP = cv.XRP.plus(BigNumber(tx.outcome.fee))
      if (cv.XRP.eq(0)) {
        delete cv.XRP;
      }
    }
    var currencies = Object.keys(cv)
    if (currencies.length > 2) {
      throw 'More than 2 currencies'
    }
    if (!cv.hasOwnProperty(symbol)) {
      return;
    }
    var source = 'XRPL';
    var action;
    // Use USD as default currency.
    var currency = 'USD';
    var price = undefined;
    if (currencies.length === 1) {
      if (cv[symbol].isGreaterThan(0)) {
        action = 'Receive';
      } else {
        action = 'Send';
      }
      source = getFundSource(action, action === 'Receive' ?
        tx.specification.source.address :
        tx.specification.destination.address)
    } else {  // currencies.length === 2
      if (cv[symbol].isGreaterThan(0)) {
        action = 'Buy';
      } else {
        action = 'Sell';
      }
      currencies.forEach(function(c) {
        if (c !== symbol) {
          currency = c
          price = cv[c].dividedBy(cv[symbol]).negated();
        }
      });
    }
    if (cv[symbol].isLessThan(0)) {
      cv[symbol] = cv[symbol].negated();
    }
    lines.push(new Line(
      tx.outcome.timestamp,
      source,
      action,
      symbol,
      cv[symbol],
      currency,
      price,
      '0',  // Fee. Ignore it.
      'XRP'))
  }
});

lines.sort(function(a, b) {
  return a.date - b.date;
});

console.log(Line.header());

lines.forEach(function(l) {
  console.log(l.toString());
})
