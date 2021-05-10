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
    this.volume = BigNumber(volume);
    this.currency = currency;
    this.price = price;
    this.fee = BigNumber(fee);
    this.feeCurrency = feeCurrency;
  }

  static header() {
    return 'Date,Source,Action,Symbol,Volume,Currency,Price,Fee,FeeCurrency';
  }

  // Type,Datetime,Account,Amount,Value,Rate,Fee,Sub Type
  // Market,"Apr. 05, 2017, 04:14 AM",Main Account,752.42380800 XRP,29.34 USD,0.03899 USD,,Sell
  static fromBitstamp(row, onlySymbol='', excludeSymbols=[]) {
    if ((onlySymbol === '') === (excludeSymbols.length === 0)) {
      throw 'must set exactly one of onlySymbol and excludeSymbol'
    }
    var date = new Date([row.Datetime, 'UTC'].join(' '));
    var source = row.Type;
    var action = row['Sub Type'].toUpperCase();
    if (!action) {
      if (source.match(/[Dd]eposit/)) {
        action = 'RECEIVE'
      } else if (source.match(/[Ww]ithdraw/) ||
                 source.match(/[Pp]ayment/)) {
        action = 'SEND'
      } else if (source == 'Sub Account Transfer') {
        // ignore 'Sub Account Tranfer'.
        return;
      } else {
        throw new Error(`No sub type and unknown type: ${source}`);
      }
    }
    var volume, symbol;
    [volume, symbol] = row.Amount.split(' ');
    if (onlySymbol && symbol !== onlySymbol) {
      return;
    }
    if (excludeSymbols.length > 0 && excludeSymbols.includes(symbol)) {
      return;
    }
    var totalPrice = 0, currency = 'USD', fee = 0, feeCurrency = 'USD';
    if (row.Value) {
      [totalPrice, currency] = row.Value.split(' ');
    }
    if (row.Fee) {
      [fee, feeCurrency] = row.Fee.split(' ');
    }
    totalPrice = BigNumber(totalPrice).minus(fee)
    var price = !totalPrice.eq(0) ? totalPrice.dividedBy(volume) : 0;
    fee = 0 // Reset fee. Fee deducted from totalPrice.
    return new Line(date, source, action, symbol, volume, currency, price, fee, feeCurrency);
  }

  // Date,Market,Category,Type,Price,Amount,Total,Fee,Order Number,Base Total Less Fee,Quote Total Less Fee
  // 2017-04-13 20:25:08,XRP/USDT,Exchange,Sell,0.03599000,1579.40523900,56.84279455,0.15%,39761950375,56.75753036,-1579.40523900
  // 2017-04-14 16:55:20,XRP/USDT,Exchange,Buy,0.03400120,1669.28021200,56.75753034,0.15%,39818390878,-56.75753034,1666.77629169
  static fromPoloniex(row) {
    var date = new Date([row.Date, 'UTC'].join(' '));
    var source = row.Category;
    var action = row.Type.toUpperCase();
    var symbol, currency = 'USD';
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
    var currency = 'USD', price = 0, fee = 0, feeCurrency = 'USD';
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
    var currency = 'USD', price = 0, fee = 0, feeCurrency = 'USD';
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

  direction() {
    switch (this.action) {
      case 'SEND':
      case 'FEE':
      case 'SELL':
        return -1;
        break;
      case 'RECEIVE':
      case 'BUY':
        return 1;
        break;
      default:
        throw new Error(`unknown action: "${this.action}"`);
    }
  }

  canMerge(line) {
    return this.direction() != line.direction();
  }

  mergeFee() {
    if (this.fee.eq(0)) {
      return
    }
    if (this.fee.lt(0)) {
      throw 'negative fee'
    }
    if (this.feeCurrency !== 'XRP') {
      throw 'fee is not in XRP'
    }
    this.volume = this.volume.minus(this.fee.times(this.direction()));
    this.fee = 0
  }

  static formatDate(date) {
    var month = date.getUTCMonth() + 1;
    var day = date.getUTCDate();
    return month + '/' + day + '/' + date.getUTCFullYear();
  }

  merge(line) {
    if (this.symbol !== line.symbol) {
      throw 'different symbols'
    }
    if (this.currency != line.currency) {
      throw 'different currencies'
    }
    this.volume = this.volume.minus(line.volume)
    let rv = {
      symbol: line.symbol,
      volume: line.volume,
    };
    if (this.direction() > 0) {
      rv.openingDate = Line.formatDate(this.date);
      rv.cost =  rv.volume.times(this.price);
      rv.closingDate = Line.formatDate(line.date);
      rv.proceeds = rv.volume.times(line.price);
    } else {
      rv.openingDate = Line.formatDate(line.date);
      rv.cost =  rv.volume.times(line.price);
      rv.closingDate = Line.formatDate(this.date);
      rv.proceeds = rv.volume.times(this.price);
    }
    rv.profit = rv.proceeds.minus(rv.cost);
    return rv;
  }
}

module.exports = Line
