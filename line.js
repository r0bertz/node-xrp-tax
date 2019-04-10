const BigNumber = require('bignumber.js');
const dateformat = require('dateformat');

// Line converts csv from various formats to BitcoinTax format.
class Line {
  constructor(
    date, source, action, symbol, volume, currency, price, fee, feeCurrency) {
    this.date = new Date(date);
    this.source = source;
    this.action = action;
    this.symbol = symbol;
    this.volume = volume;
    this.currency = currency;
    this.price = price;
    this.fee = fee;
    this.feeCurrency = feeCurrency;
  }

  static header() {
    return 'Date,Source,Action,Symbol,Volume,Currency,Price,Fee,FeeCurrency';
  }

  // Type,Datetime,Account,Amount,Value,Rate,Fee,Sub Type
  // Market,"Apr. 05, 2017, 04:14 AM",Main Account,752.42380800 XRP,29.34 USD,0.03899 USD,,Sell
  static fromBitstamp(row) {
    var date = new Date([row.Datetime, 'UTC'].join(' '));
    var source = row.Type;
    var action = row['Sub Type']
    if (!action) {
      if (source.match(/[Dd]eposit/)) {
        action = 'RECEIVE'
      } else if (source.match(/[Ww]ithdraw/) ||
                 source.match(/[Pp]ayment/)) {
        action = 'SEND'
      }
    }
    var volume, symbol;
    [volume, symbol] = row.Amount.split(' ');
    // TODO(r0bertz): support other currencies.
    if (symbol !== 'XRP') {
      return;
    }
    var totalPrice, currency;
    [totalPrice, currency] = row.Value.split(' ');
    var fee = 0, feeCurrency = 'USD';
    if (row.Fee) {
      [fee, feeCurrency] = row.Fee.split(' ');
    }
    totalPrice = BigNumber(totalPrice).minus(fee)
    var price = totalPrice.dividedBy(volume);
    fee = 0 // Reset fee
    return new Line(date, source, action, symbol, volume, currency, price, fee, feeCurrency);
  }

  // Date,Market,Category,Type,Price,Amount,Total,Fee,Order Number,Base Total Less Fee,Quote Total Less Fee
  // 2017-04-13 20:25:08,XRP/USDT,Exchange,Sell,0.03599000,1579.40523900,56.84279455,0.15%,39761950375,56.75753036,-1579.40523900
  // 2017-04-14 16:55:20,XRP/USDT,Exchange,Buy,0.03400120,1669.28021200,56.75753034,0.15%,39818390878,-56.75753034,1666.77629169
  static fromPoloniex(row) {
    var date = new Date([row.Date, 'UTC'].join(' '));
    var source = row.Category;
    var action = row.Type.toUpperCase();
    var symbol, currency;
    [symbol, currency] = row.Market.split('/');
    if (currency === 'USDT') {
      currency = 'USD';
    }
    var volume = BigNumber(row['Quote Total Less Fee']).abs();
    var totalPrice = BigNumber(row['Base Total Less Fee']).abs();
    var price = totalPrice.dividedBy(volume);
    var fee = 0, feeCurrency = 'USD';
    return new Line(date, source, action, symbol, volume, currency, price, fee, feeCurrency);
  }

  // Date,Currency,Amount,Address,Status
  // 2017-04-14 19:17:43,XRP,4970.35000000,rxxxxx,COMPLETE
  static fromPoloniexDeposit(row) {
    var date = new Date([row.Date, 'UTC'].join(' '));
    var source = 'XRPL';
    var action = 'RECEIVE';
    var symbol = row.Currency;
    var volume = row.Amount;
    var currency, price, fee, feeCurrency;
    return new Line(date, source, action, symbol, volume, currency, price, fee, feeCurrency);
  }

  // Date,Currency,Amount,Address,Status
  // 2017-05-28 08:01:23,XRP,6225.79027239,rxxxx,COMPLETE
  static fromPoloniexWithdraw(row) {
    var date = new Date([row.Date, 'UTC'].join(' '));
    var source = 'XRPL';
    var action = 'SEND';
    var symbol = row.Currency;
    var volume = row.Amount;
    var currency, price, fee, feeCurrency;
    return new Line(date, source, action, symbol, volume, currency, price, fee, feeCurrency);
  }

  toString() {
    return this.date.toISOString() + ',' +
      this.source + ',' +
      this.action + ',' +
      this.symbol + ',' +
      this.volume + ',' +
      this.currency + ',' +
      this.price + ',' +
      this.fee + ',' +
      this.feeCurrency;
  }

  toBitcoinTaxFormat() {
    return dateformat(this.date, 'yyyy-mm-dd HH:MM:ss Z') + ',' +
      this.source + ',' +
      this.action + ',' +
      this.symbol + ',' +
      this.volume + ',' +
      this.currency + ',' +
      this.price + ',' +
      this.fee + ',' +
      this.feeCurrency;
  }
}

module.exports = Line
