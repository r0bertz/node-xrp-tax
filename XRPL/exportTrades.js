// Exports transactions that receive, send or trade 'symbol'.
const symbol = 'XRP'
const BigNumber = require('bignumber.js');
const fs = require('fs');
const Line = require('../line.js');

const argv = require('yargs')
  .option('account', {
    demandOption: true,
    describe: 'The account to export trade transactions for'
  })
  .option('input', {
    demandOption: true,
    describe: 'The path of the input file'
  })
  .option('addresses', {
    describe: 'The path of a file which maps from addresses to names'
  })
  .option('cost_basis_hint', {
    describe: 'The path of a file which maps from address name to a hint for ' +
    'cost basis. There is only one valid value for the hint which is "Gift" ' +
    'meaning the market price will be used as the cost basis. The "Source" ' +
    'column of an incoming fund will be replaced with this hint followed by ' +
    'an colon and the address name. The key of the map can have an optional ' +
    'timestamp (in form of "name:ts") which means the hint will be applied ' +
    'to the fund coming from the name at that timestamp only.'
  })
  .option('ignore_later_than', {
    describe: 'ISO date string. Ignore transactions later than this date.'
  })
  .coerce('ignore_later_than', (arg) => new Date(arg))
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


function getFundSource(action, timestamp, address) {
  if (typeof argv.addresses === 'undefined') {
    return '';
  }
  var name = addresses[address];
  var nameDate = name + ':' + (new Date(timestamp)).toISOString();
  if (action === 'RECEIVE' && typeof argv.cost_basis_hint !== 'undefined') {
    if (hints.hasOwnProperty(nameDate)) {
      return hints[nameDate] + ':' + name;
    }
    if (hints.hasOwnProperty(name)) {
      return hints[name] + ':' + name;
    }
  }
  return name;
}

var lines = []

transactions.forEach(function(tx, i) {
  var date = new Date(tx.outcome.timestamp);
  if (date > argv.ignore_later_than) {
    return;
  }
  if (!tx.outcome.balanceChanges.hasOwnProperty(argv.account)) {
    // This happens when unfunded order of 'account' is cancelled.
    return;
  }
  // currency to value map.
  var cv = {};
  var balances = tx.outcome.balanceChanges[argv.account]
  balances.forEach(function(b) {
    // Same currency can appear twice in balances.
    if (cv.hasOwnProperty(b.currency)) {
      cv[b.currency] = cv[b.currency].plus(BigNumber(b.value));
    } else {
      cv[b.currency] = BigNumber(b.value);
    }
  });
  // Exclude fee from XRP balance changes. Fee will be shown separately.
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
  var source = 'XRPL';
  var action;
  var currency = 'USD';
  var price = 0;
  var volume = cv.hasOwnProperty(symbol) ? cv[symbol].abs() : BigNumber(0);
  var fee = tx.address === argv.account ? tx.outcome.fee : '0';
  if (volume.eq(0)) {
    // This is not a symbol trade or not a trade transaction at all.
    if (symbol === 'XRP' && fee !== '0') {
      action = 'FEE';
      lines.push(new Line(
        tx.outcome.timestamp, source, action, symbol, volume, currency, price,
        fee, 'XRP')
      );
    }
    return;
  }
  if (currencies.length === 1) {
    action = cv[symbol].isGreaterThan(0) ? 'RECEIVE' : 'SEND';
    switch (tx.type) {
      case 'payment':
        source = getFundSource(action, tx.outcome.timestamp,
          action === 'RECEIVE' ?
          tx.specification.source.address :
          tx.specification.destination.address);
        break;
      case 'paymentChannelClaim':
        source = 'RECEIVE';
        break;
    }
  } else {  // currencies.length === 2
    action = cv[symbol].isGreaterThan(0) ? 'BUY' : 'SELL';
    delete cv[symbol];
    currency = Object.keys(cv)[0]
    price = cv[currency].dividedBy(volume).abs();
  }
  lines.push(new Line(
    tx.outcome.timestamp, source, action, symbol, volume, currency, price,
    fee, 'XRP')
  );
});

function strcmp(a, b) {
  return a < b ? 1 : a > b ? -1 : 0;
}

lines.sort(function(a, b) {
  var diff = a.date - b.date;
  if (diff !== 0) {
    return diff;
  }
  diff = strcmp(a.action, b.action)
  if (diff !== 0) {
    return diff;
  }
  return a.volume.lt(b.volume);
});

lines.forEach(function(l) {
  console.log(l.toString());
})
