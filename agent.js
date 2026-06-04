import { Wallet } from "@ethersproject/wallet";
import { ClobClient, OrderType, Side } from "@polymarket/clob-client";
import dotenv from "dotenv";

dotenv.config();

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const asNumber = (name, fallback) => {
  const value = process.env[name] ?? fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return parsed;
};

const asBoolean = (name, fallback = false) => {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  return raw.toLowerCase() === "true";
};

async function run() {
  const host = process.env.POLYMARKET_HOST ?? "https://clob.polymarket.com";
  const chainId = asNumber("POLYMARKET_CHAIN_ID", 137);
  const signatureType = asNumber("POLYMARKET_SIGNATURE_TYPE", 1);

  const privateKey = requireEnv("POLYMARKET_PRIVATE_KEY");
  const funder = requireEnv("POLYMARKET_FUNDER");
  const tokenID = requireEnv("POLYMARKET_TOKEN_ID");

  const buyThreshold = asNumber("BUY_THRESHOLD", 0.5);
  const orderSize = asNumber("ORDER_SIZE", 5);
  const tickSize = process.env.POLYMARKET_TICK_SIZE ?? "0.001";
  const tickSizeNumber = Number(tickSize);
  if (!Number.isFinite(tickSizeNumber) || tickSizeNumber <= 0) {
    throw new Error("POLYMARKET_TICK_SIZE must be a positive number");
  }
  const negRisk = asBoolean("POLYMARKET_NEG_RISK", false);
  const dryRun = asBoolean("DRY_RUN", true);

  const signer = new Wallet(privateKey);

  const authClient = new ClobClient(host, chainId, signer);
  const creds = await authClient.createOrDeriveApiKey();
  const client = new ClobClient(host, chainId, signer, creds, signatureType, funder);

  const orderBook = await client.getOrderBook(tokenID);
  if (!Array.isArray(orderBook?.asks)) {
    throw new Error("Order book response did not include asks");
  }

  if (orderBook.asks.length === 0) {
    throw new Error(`No asks available in order book for token ${tokenID}`);
  }

  const bestAsk = Number(orderBook.asks[0]?.price);
  if (!Number.isFinite(bestAsk)) {
    throw new Error(`Invalid best ask price in order book for token ${tokenID}`);
  }

  if (bestAsk > buyThreshold) {
    console.log(`No trade placed. Best ask ${bestAsk} is above threshold ${buyThreshold}.`);
    return;
  }

  const orderArgs = {
    tokenID,
    price: bestAsk,
    side: Side.BUY,
    size: orderSize,
  };

  if (dryRun) {
    console.log("DRY_RUN=true, would place order:", orderArgs);
    return;
  }

  const order = await client.createAndPostOrder(
    orderArgs,
    { tickSize, negRisk },
    OrderType.GTC,
  );

  console.log("Order placed:", order);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
