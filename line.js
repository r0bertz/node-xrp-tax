const dateformat = require('dateformat');

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
