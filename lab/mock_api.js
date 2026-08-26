// =========================================================================
// mock_api.js — Fake data layer for the Research Lab demo
// Intercepts all fetch() calls and returns realistic mock data
// =========================================================================

(function() {
  const EXCHANGES = ["Hyperliquid", "Paradex", "GRVT", "Aevo", "Asterdex", "Binance", "Variational", "Interactive Brokers"];
  const COINS = ["BTC", "ETH", "SOL", "HYPE", "AVAX", "DOGE", "LINK", "ARB", "OP", "SUI", "APT", "NEAR", "INJ", "TIA", "SEI", "MATIC", "RNDR", "PEPE", "WIF", "BONK"];
  const COIN_NAMES = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana", HYPE: "Hyperliquid", AVAX: "Avalanche", DOGE: "Dogecoin", LINK: "Chainlink", ARB: "Arbitrum", OP: "Optimism", SUI: "Sui", APT: "Aptos", NEAR: "NEAR Protocol", INJ: "Injective", TIA: "Celestia", SEI: "Sei", MATIC: "Polygon", RNDR: "Render", PEPE: "Pepe", WIF: "dogwifhat", BONK: "Bonk" };
  const COIN_PRICES = { BTC: 95250, ETH: 3210, SOL: 198, HYPE: 24.5, AVAX: 38, DOGE: 0.38, LINK: 22, ARB: 1.2, OP: 2.1, SUI: 3.8, APT: 9.5, NEAR: 5.2, INJ: 28, TIA: 6.5, SEI: 0.52, MATIC: 0.72, RNDR: 8.4, PEPE: 0.000012, WIF: 2.8, BONK: 0.000028 };

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
  function now() { return Date.now() / 1000; }
  function round(v, d) { const p = Math.pow(10, d); return Math.round(v * p) / p; }

  function genSeries(hours, points, baseVal, volatility) {
    const series = [];
    const start = now() - hours * 3600;
    const step = (hours * 3600) / points;
    let val = baseVal;
    for (let i = 0; i <= points; i++) {
      val += rand(-volatility, volatility);
      series.push([round(start + i * step, 1), round(val, 6)]);
    }
    return series;
  }

  function genPriceData(coinA, coinB) {
    const data = {};
    [coinA, coinB].forEach(coin => {
      const base = COIN_PRICES[coin] || rand(1, 200);
      data[coin] = {};
      EXCHANGES.forEach(ex => {
        const variance = base * 0.0008;
        const bid = base + rand(-variance, variance);
        const ask = bid + rand(base * 0.0001, base * 0.0003);
        const mid = (bid + ask) / 2;
        data[coin][ex] = {
          bid: round(bid, 6),
          ask: round(ask, 6),
          mid: round(mid, 6),
          mark: round(mid, 6),
          last: round(mid, 6),
          funding: round(rand(-0.02, 0.02), 6),
          ts: now() - rand(0, 3),
          volume_24h: round(rand(1000000, 50000000), 0),
          open_interest: round(rand(50000000, 500000000), 0),
        };
      });
    });
    return data;
  }

  // ---- Endpoint handlers ----
  const handlers = {
    "/data": (qs) => {
      const coinA = qs.coin_a || "BTC";
      const coinB = qs.coin_b || "HYPE";
      const data = genPriceData(coinA, coinB);
      // Add all coins for the dashboard
      COINS.forEach(c => {
        if (!data[c]) {
          const base = COIN_PRICES[c] || rand(1, 200);
          data[c] = {};
          EXCHANGES.forEach(ex => {
            const v = base * 0.0005;
            const bid = base + rand(-v, v);
            const ask = bid + base * 0.0002;
            data[c][ex] = {
              bid: round(bid, 6), ask: round(ask, 6), mid: round((bid+ask)/2, 6),
              mark: round((bid+ask)/2, 6), last: round((bid+ask)/2, 6),
              funding: round(rand(-0.02, 0.02), 6), ts: now() - rand(0, 3),
              volume_24h: round(rand(1000000, 50000000), 0),
              open_interest: round(rand(50000000, 500000000), 0),
            };
          });
        }
      });
      return {
        server_time: now(),
        data,
        leverage: Object.fromEntries(EXCHANGES.map(ex => [ex, Object.fromEntries(COINS.slice(0, 8).map(c => [c, randInt(3, 50)]))])),
      };
    },
    "/assets": () => ({
      ok: true,
      assets: COINS.map(c => ({ symbol: c, name: COIN_NAMES[c] || c, exchanges: EXCHANGES.slice(0, randInt(3, 8)) })),
    }),
    "/exchanges": () => ({ ok: true, exchanges: EXCHANGES }),
    "/cmc/movers": () => ({
      ok: true,
      gainers: COINS.slice(0, 8).map(c => ({ symbol: c, name: COIN_NAMES[c] || c, percent_change_24h: round(rand(2, 18), 2), price: COIN_PRICES[c] || rand(1, 200) })),
      losers: COINS.slice(8, 16).map(c => ({ symbol: c, name: COIN_NAMES[c] || c, percent_change_24h: round(-rand(2, 15), 2), price: COIN_PRICES[c] || rand(1, 200) })),
    }),
    "/cmc/liquidations": () => ({
      ok: true,
      total: { liquidation_24h: round(rand(100000000, 500000000), 0), long_24h: round(rand(40000000, 300000000), 0), short_24h: round(rand(30000000, 200000000), 0) },
      by_crypto: COINS.slice(0, 8).map(c => ({ symbol: c, liquidation: round(rand(5000000, 80000000), 0), long_liq: round(rand(2000000, 40000000), 0), short_liq: round(rand(1000000, 30000000), 0) })),
      by_exchange: EXCHANGES.slice(0, 6).map(e => ({ exchange: e, liquidation: round(rand(10000000, 100000000), 0) })),
    }),
    "/cmc/market": () => ({
      ok: true,
      fear_greed: { value: randInt(20, 80), classification: pick(["Fear", "Greed", "Neutral", "Extreme Fear", "Extreme Greed"]) },
      total_market_cap: round(rand(1000000000000, 3000000000000), 0),
      total_volume_24h: round(rand(50000000000, 200000000000), 0),
      btc_dominance: round(rand(40, 60), 1),
      cmc100: { value: round(rand(1000, 3000), 2), change_24h: round(rand(-5, 5), 2) },
    }),
    "/cmc/quotes": (qs) => {
      const symbols = (qs.symbols || "BTC,ETH").split(",");
      const quotes = {};
      symbols.forEach(s => {
        const base = COIN_PRICES[s] || rand(1, 200);
        quotes[s] = { price: round(base + rand(-base * 0.02, base * 0.02), 6), percent_change_24h: round(rand(-5, 5), 2), market_cap: round(rand(1e9, 1e12), 0), volume_24h: round(rand(1e8, 5e9), 0) };
      });
      return { ok: true, quotes };
    },
    "/arb": (qs) => {
      const coinA = qs.coin_a || "BTC";
      const coinB = qs.coin_b || "HYPE";
      const notional = parseFloat(qs.notional || 100);
      const slippage = parseFloat(qs.slippage || 0.02);
      const rows = [];
      EXCHANGES.forEach(ex => {
        const baseA = COIN_PRICES[coinA] || 100;
        const baseB = COIN_PRICES[coinB] || 100;
        const aPrice = baseA + rand(-baseA * 0.001, baseA * 0.001);
        const bPrice = baseB + rand(-baseB * 0.001, baseB * 0.001);
        const spread = round((aPrice / bPrice) * 100 - 100, 4);
        const fee = notional * 0.0004;
        const edge = round(spread - fee / notional * 100, 4);
        rows.push({ exchange: ex, coin_a_price: aPrice, coin_b_price: bPrice, spread, edge, notional, fees: round(fee, 4), net_edge: round(edge - slippage * 2, 4), stale: false, age: round(rand(0, 3), 1) });
      });
      return { rows, notional, coin_a: coinA, coin_b: coinB, slippage };
    },
    "/funding_liquidity": (qs) => {
      const coinA = qs.coin_a || "BTC";
      const coinB = qs.coin_b || "HYPE";
      const notional = parseFloat(qs.notional || 100);
      const rows = [];
      EXCHANGES.forEach(ex => {
        rows.push({
          exchange: ex,
          coin_a_funding: round(rand(-0.03, 0.03), 6),
          coin_b_funding: round(rand(-0.03, 0.03), 6),
          net_funding: round(rand(-0.04, 0.04), 6),
          liquidity_a: round(rand(50000, 5000000), 0),
          liquidity_b: round(rand(50000, 5000000), 0),
          notional, stale: false,
        });
      });
      return { rows, notional, coin_a: coinA, coin_b: coinB };
    },
    "/max_leverage": (qs) => ({
      ok: true, coin: qs.coin || "BTC", max_leverage: randInt(5, 50), isolated_only: Math.random() > 0.7,
    }),
    "/history/spread": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      return { exchange: qs.exchange || "Hyperliquid", hours, coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE", series: genSeries(hours, 200, 0, 0.002) };
    },
    "/history/pnl": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const notional = parseFloat(qs.notional || 100);
      return { exchange: qs.exchange || "Hyperliquid", hours, notional, coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE", series: genSeries(hours, 200, 0, notional * 0.01) };
    },
    "/history/cross": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      return { a: qs.a || "Hyperliquid", b: qs.b || "Paradex", hours, coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE", series: genSeries(hours, 200, 0, 0.003) };
    },
    "/history/cross_pnl": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const notional = parseFloat(qs.notional || 100);
      return { a: qs.a || "Hyperliquid", b: qs.b || "Paradex", hours, notional, coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE", series: genSeries(hours, 200, 0, notional * 0.015) };
    },
    "/history/cross_funding": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      return { a: qs.a || "Hyperliquid", b: qs.b || "Paradex", hours, coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE", fund_diff_series: genSeries(hours, 100, 0, 0.0005) };
    },
    "/history/funding": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const series_by_ex = {};
      EXCHANGES.forEach(ex => { series_by_ex[ex] = genSeries(hours, 100, rand(-0.01, 0.01), 0.0003); });
      return { coin: qs.coin || "BTC", hours, series_by_exchange: series_by_ex };
    },
    "/history/data_range": (qs) => ({
      coin: qs.coin || "BTC", exchanges: EXCHANGES.slice(0, 5), min_ts: now() - 30 * 24 * 3600, max_ts: now(),
    }),
    "/research": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const coins = (qs.coins || "BTC,ETH,SOL,HYPE,AVAX,LINK").split(",");
      const pairs = [];
      for (let i = 0; i < coins.length; i++) {
        for (let j = i + 1; j < coins.length; j++) {
          const trades = randInt(5, 60);
          const wins = randInt(3, trades);
          pairs.push({
            coin_a: coins[i], coin_b: coins[j], exchange: qs.exchange || "Hyperliquid",
            entry: parseFloat(qs.entry || 0.1), exit: parseFloat(qs.exit || 0.05),
            trades, wins, losses: trades - wins,
            pnl: round(rand(-5, 25), 2), avg_hold_min: round(rand(5, 120), 1),
            max_drawdown: round(rand(-3, -0.1), 2), sharpe: round(rand(0.5, 3), 2),
            win_rate: round(wins / trades, 3),
            avg_pnl: round(rand(-1, 5), 2), best_trade: round(rand(2, 10), 2), worst_trade: round(rand(-3, -0.1), 2),
            spread_mean: round(rand(-0.05, 0.05), 6), spread_std: round(rand(0.001, 0.01), 6),
          });
        }
      }
      return { pairs, hours, notional: parseFloat(qs.notional || 100), entry: parseFloat(qs.entry || 0.1), exit: parseFloat(qs.exit || 0.05) };
    },
    "/paper_trade": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const numTrades = randInt(15, 50);
      const trades = [];
      let cumPnl = 0;
      for (let i = 0; i < numTrades; i++) {
        const pnl = round(rand(-2, 5), 2);
        cumPnl += pnl;
        trades.push({
          entry_time: now() - rand(0, hours * 3600), exit_time: now() - rand(0, hours * 3600),
          entry_spread: round(rand(0.05, 0.3), 4), exit_spread: round(rand(-0.1, 0.1), 4),
          pnl, cumulative: round(cumPnl, 2), hold_min: round(rand(5, 180), 1),
          side: pick(["long_a_short_b", "short_a_long_b"]),
        });
      }
      const wins = trades.filter(t => t.pnl > 0).length;
      return {
        ok: true, a: qs.a || "Hyperliquid", b: qs.b || "Asterdex", hours,
        notional: parseFloat(qs.notional || 100), coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE",
        trades, equity_curve: genSeries(hours, numTrades, 0, 2),
        stats: {
          total_trades: numTrades, wins, losses: numTrades - wins,
          total_pnl: round(cumPnl, 2), avg_pnl: round(cumPnl / numTrades, 2),
          best_trade: round(Math.max(...trades.map(t => t.pnl)), 2), worst_trade: round(Math.min(...trades.map(t => t.pnl)), 2),
          avg_hold_min: round(trades.reduce((s, t) => s + t.hold_min, 0) / numTrades, 1),
          max_drawdown: round(rand(-5, -0.5), 2), sharpe: round(rand(0.5, 3), 2),
          win_rate: round(wins / numTrades, 3),
        },
      };
    },
    "/suggest": (qs) => ({
      ok: true,
      suggestions: [
        { entry: 0.15, exit: 0.08, expected_pnl: round(rand(2, 10), 2), win_rate: round(rand(0.5, 0.8), 2), trades: randInt(10, 40) },
        { entry: 0.20, exit: 0.10, expected_pnl: round(rand(3, 15), 2), win_rate: round(rand(0.4, 0.7), 2), trades: randInt(8, 30) },
        { entry: 0.25, exit: 0.12, expected_pnl: round(rand(5, 20), 2), win_rate: round(rand(0.3, 0.6), 2), trades: randInt(5, 20) },
      ],
    }),
    "/simulate": (qs) => {
      const numTrades = randInt(15, 60);
      const trades = Array.from({ length: numTrades }, (_, i) => ({
        entry_time: now() - rand(0, 168 * 3600), side: pick(["long", "short"]),
        entry_price: round(rand(94000, 96000), 2), exit_price: round(rand(94000, 96000), 2),
        pnl: round(rand(-10, 20), 2), hold_hours: round(rand(1, 24), 1),
        level: randInt(1, 5),
      }));
      const totalPnl = round(trades.reduce((s, t) => s + t.pnl, 0), 2);
      const wins = trades.filter(t => t.pnl > 0).length;
      return {
        ok: true,
        config: { coin: qs.coin || "BTC", ex1: qs.ex1 || "Hyperliquid", ex2: qs.ex2 || "Binance", strategy: qs.strategy || "bb_grid" },
        equity_curve: genSeries(168, 200, 10000, 50),
        trades,
        stats: { total_pnl: totalPnl, total_trades: numTrades, win_rate: round(wins / numTrades, 2), max_drawdown: round(rand(-15, -2), 2), sharpe: round(rand(0.3, 2.5), 2), avg_hold_hours: round(rand(2, 12), 1) },
      };
    },
    "/subaccount_paper_trade": (qs) => {
      const days = parseFloat(qs.days || 7);
      const cycles = randInt(20, 80);
      const trades = [];
      let cumPnl = 0;
      for (let i = 0; i < cycles; i++) {
        const pnl = round(rand(-3, 8), 2);
        cumPnl += pnl;
        trades.push({
          cycle: i + 1, phase: pick(["HEDGED", "WINNER_BANKED", "RECOVERY", "REHEDGED", "COMPLETE"]),
          entry_time: now() - rand(0, days * 24 * 3600), pnl, cumulative: round(cumPnl, 2),
          hold_min: round(rand(10, 300), 1), rehedges: randInt(0, 3),
          coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE",
          entry_spread: round(rand(0.05, 0.3), 4), exit_spread: round(rand(-0.1, 0.1), 4),
        });
      }
      const wins = trades.filter(t => t.pnl > 0).length;
      return {
        ok: true, coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE",
        notional: parseFloat(qs.notional || 100), days, trades,
        equity_curve: genSeries(days * 24, 200, 0, 5),
        stats: {
          total_cycles: cycles, wins, losses: cycles - wins,
          total_pnl: round(cumPnl, 2), avg_pnl: round(cumPnl / cycles, 2),
          rehedge_count: randInt(5, 30), rehedge_banked: round(rand(5, 50), 2),
          max_drawdown: round(rand(-10, -1), 2), recovery_rate: round(rand(0.3, 0.9), 2),
          win_rate: round(wins / cycles, 3),
        },
      };
    },
    "/subaccount_paper_trade_gated": (qs) => {
      const result = handlers["/subaccount_paper_trade"](qs);
      result.gated = true;
      result.groups = [
        { name: "AB", cycles: randInt(10, 40), pnl: round(rand(-10, 50), 2), wins: randInt(5, 30) },
        { name: "CD", cycles: randInt(10, 40), pnl: round(rand(-10, 50), 2), wins: randInt(5, 30) },
      ];
      return result;
    },
    "/pair_scan_coins": () => ({ ok: true, coins: COINS, count: COINS.length }),
    "/pair_analysis": (qs) => ({
      ok: true, coin_a: qs.coin_a || "BTC", coin_b: qs.coin_b || "HYPE",
      correlation: round(rand(0.3, 0.95), 3), cointegration: round(rand(0.01, 0.5), 4),
      spread_mean: round(rand(-0.05, 0.05), 6), spread_std: round(rand(0.001, 0.01), 6),
      spread_sharpe: round(rand(0.5, 3), 2), half_life: round(rand(10, 300), 1),
      hurst_exponent: round(rand(0.3, 0.6), 3), adf_pvalue: round(rand(0.001, 0.1), 4),
      recommended: Math.random() > 0.5, spread_series: genSeries(24, 100, 0, 0.005),
      price_a: COIN_PRICES[qs.coin_a] || 100, price_b: COIN_PRICES[qs.coin_b] || 100,
      vol_a: round(rand(0.01, 0.05), 4), vol_b: round(rand(0.01, 0.05), 4),
      beta: round(rand(0.5, 2), 3), alpha: round(rand(-0.01, 0.01), 4),
    }),
    "/opportunities/recent": (qs) => {
      const limit = parseInt(qs.limit || 20);
      return {
        ok: true,
        signals: Array.from({ length: Math.min(limit, 20) }, (_, i) => ({
          id: i + 1, ts: now() - rand(0, 3600), pair: pick(["BTC/HYPE", "ETH/SOL", "BTC/ETH", "SOL/AVAX", "LINK/ARB"]),
          strategy: pick(["cross_spread", "arb", "mean_reversion"]), signal: pick(["ENTRY", "EXIT", "REHEDGE"]),
          edge: round(rand(0.05, 0.5), 4), notional: randInt(100, 500), status: pick(["open", "closed", "pending"]),
          exchange_a: pick(EXCHANGES), exchange_b: pick(EXCHANGES),
        })),
      };
    },
    "/opportunities/watchlist": () => ({
      ok: true,
      watchlist: [
        { pair: "BTC/HYPE", entry: 0.15, exit: 0.08, notional: 200, status: "active" },
        { pair: "ETH/SOL", entry: 0.20, exit: 0.10, notional: 200, status: "active" },
        { pair: "BTC/ETH", entry: 0.10, exit: 0.05, notional: 200, status: "paused" },
      ],
    }),
    "/opportunities/state": () => ({
      ok: true,
      states: EXCHANGES.map(ex => ({ exchange: ex, active: Math.random() > 0.3, positions: randInt(0, 4), pnl: round(rand(-10, 30), 2) })),
      engine_status: { running: true, last_eval: now() - rand(0, 60) }, timestamp: now(),
    }),
    "/opportunities/signal_stats": (qs) => ({
      ok: true,
      stats: {
        total_signals: randInt(100, 1000), entries: randInt(50, 500), exits: randInt(40, 450), rehedges: randInt(10, 100),
        win_rate: round(rand(0.4, 0.8), 2), avg_edge: round(rand(0.1, 0.3), 4), total_pnl: round(rand(50, 500), 2),
      },
    }),
    "/opportunities/history": (qs) => ({
      ok: true,
      history: Array.from({ length: parseInt(qs.limit || 50) }, (_, i) => ({
        ts: now() - i * 3600, pair: pick(["BTC/HYPE", "ETH/SOL", "BTC/ETH"]), action: pick(["ENTRY", "EXIT", "REHEDGE"]),
        pnl: round(rand(-5, 10), 2), edge: round(rand(0.05, 0.3), 4),
      })),
    }),
    "/opportunities/arb": () => ({
      ok: true,
      opportunities: Array.from({ length: randInt(5, 12) }, (_, i) => ({
        pair: pick(["BTC/HYPE", "ETH/SOL", "BTC/ETH", "SOL/AVAX", "LINK/ARB"]),
        exchange_a: pick(EXCHANGES), exchange_b: pick(EXCHANGES),
        edge: round(rand(0.05, 0.5), 4), notional: randInt(100, 500), estimated_pnl: round(rand(1, 10), 2),
        status: pick(["active", "expired", "pending"]),
      })),
      engine_status: { running: true, last_eval: now() }, timestamp: now(),
    }),
    "/data-stats": () => ({
      ok: true, total_rows: randInt(1000000, 50000000), earliest_ts: now() - 30 * 24 * 3600, latest_ts: now(),
      files: randInt(100, 500), size_mb: round(rand(100, 5000), 1),
    }),
    "/data_status": (qs) => ({
      ok: true, coin: qs.coin || "BTC", has_data: true, candles: randInt(1000, 50000),
      funding_points: randInt(100, 5000), earliest: now() - 30 * 24 * 3600, latest: now() - rand(0, 3600),
    }),
    "/trades_all": (qs) => {
      const coin = qs.coin || "BTC";
      const hours = parseFloat(qs.hours || 1);
      const by_exchange = {};
      EXCHANGES.forEach(ex => {
        by_exchange[ex] = Array.from({ length: randInt(10, 40) }, () => ({
          ts: now() - rand(0, hours * 3600), price: round(rand(94000, 96000), 2),
          size: round(rand(0.001, 5), 4), side: pick(["buy", "sell"]),
        }));
      });
      return { coin, hours, by_exchange };
    },
    "/run_analyzer": (qs) => ({
      ok: true, hours: parseFloat(qs.hours || 1),
      output: "Analyzer completed. 15 pairs analyzed, 3 opportunities found.",
      results: { pairs: randInt(10, 30), opportunities: randInt(0, 5) },
    }),
    "/reset_baseline": () => ({ ok: true, baseline_ts: now() }),
    "/hl_subscribe": (qs) => ({ ok: true, coins: (qs.coins || "BTC,HYPE").split(",") }),
    "/fetch_candles": (qs) => ({
      ok: true, coin: qs.coin || "BTC", candles_fetched: randInt(100, 1000), funding_points: randInt(10, 100),
    }),
    "/discover-assets": () => ({
      ok: true,
      results: EXCHANGES.map(ex => ({ exchange: ex, new_assets: randInt(0, 3), total: randInt(10, 100) })),
      changed: false, restart_needed: false,
    }),
  };

  function parseQS(url) {
    const q = {};
    const idx = url.indexOf("?");
    if (idx >= 0) {
      url.slice(idx + 1).split("&").forEach(p => {
        const [k, v] = p.split("=");
        if (k) q[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
      });
    }
    return q;
  }

  function getPath(url) {
    const idx = url.indexOf("?");
    return idx >= 0 ? url.slice(0, idx) : url;
  }

  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === "string" ? input : (input.url || String(input));
    const path = getPath(url);
    const qs = parseQS(url);

    let handler = handlers[path];
    if (!handler) {
      for (const key of Object.keys(handlers)) {
        if (path.startsWith(key)) { handler = handlers[key]; break; }
      }
    }

    if (handler) {
      return new Promise((resolve) => {
        setTimeout(() => {
          const data = handler(qs);
          resolve({
            ok: true, status: 200,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data)),
            blob: () => Promise.resolve(new Blob([JSON.stringify(data)], { type: "application/json" })),
            clone: function() { return this; },
          });
        }, rand(50, 300));
      });
    }

    if (originalFetch) return originalFetch.call(window, input, init);

    return Promise.resolve({
      ok: false, status: 404,
      json: () => Promise.resolve({ ok: false, error: "No mock for " + path }),
      text: () => Promise.resolve("Not found"),
    });
  };

  // Add demo banner
  if (!document.getElementById('demo-banner')) {
    document.addEventListener('DOMContentLoaded', function() {
      const banner = document.createElement('div');
      banner.id = 'demo-banner';
      banner.className = 'demo-banner';
      banner.textContent = 'Demo Mode — All data is simulated for demonstration';
      document.body.appendChild(banner);
    });
  }
})();
