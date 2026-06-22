# FIFA World Cup 2026 AI Trading Agent

TypeScript CLI **AI trading agent** for [Polymarket](https://docs.polymarket.com/). It models World Cup match outcomes with a statistical (or optional LLM) engine, hunts for value versus live market prices, and can both **gate copy-trades** from whale / super-trader wallets and place its own **autonomous value buys** — plus manual **Draw** token control.

## Features

- **AI match model** — Elo + Poisson statistical engine, or an OpenAI-compatible LLM
  - Estimates Home / Draw / Away probabilities for each fixture
  - Blends model belief with vig-free market-implied probabilities
  - Finds edge, sizes positions with fractional **Kelly**, and reports expected value
  - **Backtest harness** with Brier score and log loss for calibration
- **AI copy gate** — only mirror a leader's trade when the model agrees there is edge
- **Autonomous value scan** — rank every open fixture by model edge and execute
- Copy trades from configured whale / super-trader wallets
- **4 copy strategies**
  - `scaled` — mirror at `1 / copy_divisor`
  - `fixed_usd` — fixed USD per copied trade
  - `percent_leader` — percentage of leader trade size
  - `whale_gate` — only copy when leader trade ≥ whale minimum, then scaled
- Interactive CLI: start/stop engine, settings, leader management, draw buys, AI menu
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
| `AI_ENABLED` | `true` to switch the AI agent on |
| `AI_PROVIDER` | `local` (offline model) or `llm` |
| `AI_API_KEY` | API key for the LLM provider (only for `llm`) |
| `AI_BASE_URL` | OpenAI-compatible base URL (default `https://api.openai.com/v1`) |
| `AI_MODEL` | LLM model name (default `gpt-4o-mini`) |

## Config (`config/bot.toml`)

Adjust trade size, strategy, poll interval, draw defaults, World Cup filter, and the `[ai]` agent section (provider, edge / confidence thresholds, Kelly fraction, bankroll, market blend weight, temperature) without code changes.

## CLI menu

1. **Start copy trading** — polls leader activity and mirrors new trades (AI-gated when enabled)
2. **Stop copy trading**
3. **Settings** — amount, strategy, min order, whale gate, dry-run
4. **Buy Draw token** — pick a FIFA 2026 match and buy the Draw outcome manually
5. **Manage leaders** — add wallets or import from Polymarket leaderboard
6. **AI agent** — analyze a match, scan fixtures for value, backtest, AI settings
7. **Status**
8. **Quit**

## AI agent

The agent turns ratings + Elo into expected goals, runs a Poisson model for
Home / Draw / Away probabilities, blends that with the vig-free market, and only
acts when both the edge and confidence clear the configured thresholds.

- **Analyze a match** — probabilities, per-outcome edge, EV, and a sized signal
- **Scan fixtures for value** — ranks every open fixture by edge and can execute
- **Copy gate** — vetoes mirrored buys the model disagrees with (fails open on errors)
- **Backtest** — replays the model over sample fixtures and reports ROI, Brier, log loss

Set `AI_PROVIDER=llm` (with `AI_API_KEY`) to back the agent with any
OpenAI-compatible endpoint; otherwise the offline statistical model is used.

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
