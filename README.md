# polymahket

Minimal Polymarket trading agent using the Polymarket SDK (`@polymarket/clob-client`).

## Setup

```bash
cd /tmp/workspace/bijinc/polymahket
npm install
cp .env.example .env
```

Fill in `.env` with your wallet key, funder address, and token id.

## Run

```bash
npm start
```

By default `DRY_RUN=true`, so it only prints the order it would place.
Set `DRY_RUN=false` to submit a real GTC buy order when best ask is less than or equal to `BUY_THRESHOLD`.
