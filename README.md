# Polymarket FIFA 2026 World Cup Copy Trading Bot

TypeScript CLI bot for [Polymarket](https://docs.polymarket.com/) that mirrors **whale wallets** and **super traders**, with manual **Draw** token control for World Cup match markets.

## Features

- **FIFA 2026** ASCII banner on startup
- Copy trades from configured whale / super-trader wallets
- **4 copy strategies**
  - `scaled` — mirror at `1 / copy_divisor`
  - `fixed_usd` — fixed USD per copied trade
  - `percent_leader` — percentage of leader trade size
  - `whale_gate` — only copy when leader trade ≥ whale minimum, then scaled
- Interactive CLI: start/stop engine, settings, leader management, draw buys
- World Cup market filter (optional)
- Dry-run mode for safe testing

## Quick start

```bash
cp .env.example .env
# Edit .env — set LEADER_WALLETS and keys for live trading

npm install
npm run dev
```

## Environment

| Variable | Description |
|----------|-------------|
| `POLYMARKET_PRIVATE_KEY` | Signer private key |
| `POLYMARKET_FUNDER_ADDRESS` | Proxy / Safe holding USDC |
| `POLYMARKET_SIGNATURE_TYPE` | `EOA`, `POLY_PROXY`, `POLY_GNOSIS_SAFE`, `POLY_1271` |
| `LEADER_WALLETS` | `whale:0xabc:Label,trader:0xdef:TopTrader` |
| `DRY_RUN` | `true` (default) or `false` |
| `REDIS_ENABLED` | `true` to persist seen leader trades across restarts |
| `REDIS_URL` | Full Redis URL (or use `REDIS_HOST` / `REDIS_PORT`) |

## Config (`config/bot.toml`)

Adjust trade size, strategy, poll interval, draw defaults, and World Cup filter without code changes.

## CLI menu

1. **Start copy trading** — polls leader activity and mirrors new trades
2. **Stop copy trading**
3. **Settings** — amount, strategy, min order, whale gate, dry-run
4. **Buy Draw token** — pick a FIFA 2026 match and buy the Draw outcome manually
5. **Manage leaders** — add wallets or import from Polymarket leaderboard
6. **Status**
7. **Quit**

## Leader wallet format

```env
LEADER_WALLETS=whale:0x204f72f35326db932158cba6adff0b9a1da95e14:WhaleAlpha,trader:0x56687bf447db6ffa42ffe2204a05edaa20f55839:TopTrader
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run with tsx |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled bot |

## Disclaimer

Prediction market trading involves risk. Test with `DRY_RUN=true` first. Ensure you comply with [Polymarket geographic restrictions](https://docs.polymarket.com/api-reference/geoblock.md) and local laws.
