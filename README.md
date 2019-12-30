# XRP Tax

This is a collection of scripts to prepare tax for crpyto (not necessarily XRP)
sales. The majority of this project deals with XRP Ledger, so it is called "XRP
Tax".  The end product is a csv file that can be uploaded to
http://www.easytxf.com.

### Things to note
* Terminology:
  * __Symbol__: The currency being traded.
  * __Currency__: The currency you paid/got when buying/selling Symbol.
* USDT is considered USD.
* The csv format (except that of the end product) is [bitcoin.tax](
  http://bitcoin.tax) format<sup id="a1">[1](#f1)</sup>.
* The Source column is overloaded. If Action is SEND, Source is actually
  destination.
* Only LIFO (Last-In, First-Out) method is implemented.
* LIFO method is universally applied for a __Symbol__ no matter where the trade
  actually happened.
* [Like-kind exchange](
  https://www.investopedia.com/terms/l/like-kind_exchange.asp) is not supported.
  If __Currency__ is not USD, it will be converted into USD price.

## Install dependencies

```
npm install -g bignumber.js csv dateformat fs lodash node-fetch ripple-lib yargs
```

## Example

Suppose one guy has traded XRP on XRP Ledger,
[bitstamp](http://www.bitstamp.net) and [poloniex](http://www.poloniex.com). He
has transferred XRP back and forth between these exchanges. He wants to get a
TXF file for the XRP trades he did in 2018 so that he can import it into
TurboTax.

He has an addresses.json file which looks like:
```json
{
  "rvYAfWj5gh67oV6fW32ZzP3Aw4Eubs59B": "~Bitstamp",
  "rpdADzXQJrnHKDJV9p7A4UwHsjT3rhm2cx": "~RippleTradeXRPBonus",
}
```

A hint.json file which looks like:
```json
{
  "~RippleTradeXRPBonus": "Gift",
}
```

Bitstamp transaction history file:
```
bitstamp/Transactions.csv
```

Poloniex history files:
```
poloniex/depositHistory.csv
poloniex/tradeHistory.csv
poloniex/withdrawalHistory.csv
```

The following commands will generate a file that can uploaded to easytxf.com.
```bash
node XRPL/getTransactions.js --account $ACCOUNT --output transactions.json
node XRPL/exportTrades.js --account $ACCOUNT --input transactions.json --addresses addresses.json --cost_basis_hint hint.json  > xrpl.csv
# Find out the timestamp for all trades if it is a Gift or if Currency is not USD.
node XRPL/extractPricePoint.js --input xrpl.csv > usd.json
# Fill usd.json with XRP price in USD. Some requests may fail due to rate-limiting. Retry as needed.
node XRPL/fillPricePoint.js --input usd.json
# Replace price with price in USD if Currency is not USD.
node XRPL/replacePrice.js --input xrpl.csv --price_file usd.json > xrpl_usd.csv
node bitstamp.js --symbol XRP --input bitstamp/Transactions.csv > bitstamp.csv
node poloniex.js --type deposit --input poloniex/depositHistory.csv  > poloniex.csv
node poloniex.js --type trade --input poloniex/tradeHistory.csv  >> poloniex.csv
node poloniex.js --type withdraw --input poloniex/withdrawalHistory.csv  >> poloniex.csv
cat bitstamp.csv poloniex.csv xrpl_usd.csv > unsorted.csv
sort -t, -k1,1 -k3,3r -k5,5 unsorted.csv > sorted.csv
# Merge a SEND with the immediate next RECEIVE if RECEIVE is equal to or slightly less than SEND.
node mergeSendReceive.js --input sorted.csv > xrp.csv
node profit.js --input xrp.csv --year 2018 --combine --easytxf > easytxf.csv
```

Upload the last file to easytxf.com to get a txf file `XRP.txf`. easytxf.com
assumes the cost basis is either short-term covered or long-term covered. It
needs to be changed with:

```bash
# Change short-term covered (321) to short-term not reported (712)
# Change long-term covered (323) to long-term not reported (714)
sed -i -e 's/N321/N712/' -e 's/N323/N714/' XRP.txf
```

<b id="f1">1</b> The format doesn't really matter. I used to use [bitcoin.tax](
http://bitcoin.tax), not anymore. [↩](#a1)
