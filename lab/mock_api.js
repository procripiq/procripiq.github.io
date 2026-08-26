// =========================================================================
// mock_api.js — Fake data layer for the Research Lab demo
// Intercepts all fetch() calls and returns realistic mock data
// so the pages render with their real layout but no backend needed.
// =========================================================================

(function() {
  const EXCHANGES = ["Hyperliquid", "Paradex", "GRVT", "Aevo", "Asterdex", "Binance", "Variational", "Interactive Brokers"];
  const COINS = ["BTC", "ETH", "SOL", "HYPE", "AVAX", "DOGE", "LINK", "ARB", "OP", "SUI", "APT", "NEAR", "INJ", "TIA", "SEI"];

  function rand(min, max) { return Math.random() * (max - min) + min; }
  function randInt(min, max) { return Math.floor(rand(min, max + 1)); }
  function pick(arr) { return arr[randInt(0, arr.length - 1)]; }
  function now() { return Date.now() / 1000; }

  // Generate a time series
  function genSeries(hours, points, baseVal, volatility) {
    const series = [];
    const start = now() - hours * 3600;
    const step = (hours * 3600) / points;
    let val = baseVal;
    for (let i = 0; i <= points; i++) {
      val += rand(-volatility, volatility);
      series.push([start + i * step, parseFloat(val.toFixed(6))]);
    }
    return series;
  }

  // Generate price data for a coin across exchanges
  function genPriceData(coinA, coinB) {
    const data = {};
    const basePriceA = coinA === "BTC" ? 95000 : coinA === "ETH" ? 3200 : rand(1, 200);
    const basePriceB = coinB === "HYPE" ? 25 : coinB === "BTC" ? 95000 : rand(1, 200);

    [coinA, coinB].forEach((coin, idx) => {
      const base = idx === 0 ? basePriceA : basePriceB;
      data[coin] = {};
      EXCHANGES.forEach(ex => {
        const variance = base * 0.0005;
        const bid = base + rand(-variance, variance);
        const ask = bid + rand(0.01, base * 0.0002);
        const mid = (bid + ask) / 2;
        data[coin][ex] = {
          bid: parseFloat(bid.toFixed(4)),
          ask: parseFloat(ask.toFixed(4)),
          mid: parseFloat(mid.toFixed(4)),
          mark: parseFloat(mid.toFixed(4)),
          last: parseFloat(mid.toFixed(4)),
          funding: parseFloat(rand(-0.02, 0.02).toFixed(6)),
          ts: now() - rand(0, 3),
          volume_24h: parseFloat(rand(1000000, 50000000).toFixed(0)),
          open_interest: parseFloat(rand(50000000, 500000000).toFixed(0)),
        };
      });
    });
    return data;
  }

  // Mock endpoint handlers
  const handlers = {
    "/data": (qs) => {
      const coinA = qs.coin_a || "BTC";
      const coinB = qs.coin_b || "HYPE";
      return {
        server_time: now(),
        data: genPriceData(coinA, coinB),
        leverage: {
          "Hyperliquid": { "BTC": 40, "ETH": 25, "SOL": 20, "HYPE": 10 },
          "Paradex": { "BTC": 20, "ETH": 15, "SOL": 10 },
          "GRVT": { "BTC": 25, "ETH": 20 },
          "Aevo": { "BTC": 25, "ETH": 20 },
          "Asterdex": { "BTC": 20, "ETH": 15 },
          "Binance": { "BTC": 50, "ETH": 50, "SOL": 50 },
          "Variational": { "BTC": 10 },
          "Interactive Brokers": { "BTC": 5 },
        },
      };
    },
    "/assets": () => ({
      ok: true,
      assets: COINS.map(c => ({ symbol: c, name: c, exchanges: EXCHANGES.slice(0, randInt(3, 8)) })),
    }),
    "/exchanges": () => ({ ok: true, exchanges: EXCHANGES }),
    "/cmc/movers": () => ({
      ok: true,
      gainers: COINS.slice(0, 5).map(c => ({ symbol: c, percent_change_24h: rand(2, 15) })),
      losers: COINS.slice(5, 10).map(c => ({ symbol: c, percent_change_24h: -rand(2, 15) })),
    }),
    "/cmc/liquidations": () => ({
      ok: true,
      total: { liquidation_24h: rand(100000000, 500000000) },
      by_crypto: COINS.slice(0, 5).map(c => ({ symbol: c, liquidation: rand(5000000, 50000000) })),
      by_exchange: EXCHANGES.slice(0, 4).map(e => ({ exchange: e, liquidation: rand(10000000, 100000000) })),
    }),
    "/cmc/market": () => ({
      ok: true,
      fear_greed: { value: randInt(20, 80), classification: pick(["Fear", "Greed", "Neutral", "Extreme Fear", "Extreme Greed"]) },
      total_market_cap: rand(1000000000000, 3000000000000),
      total_volume_24h: rand(50000000000, 200000000000),
      btc_dominance: rand(40, 60),
      cmc100: { value: rand(1000, 3000), change_24h: rand(-5, 5) },
    }),
    "/cmc/quotes": (qs) => {
      const symbols = (qs.symbols || "BTC,ETH").split(",");
      const quotes = {};
      symbols.forEach(s => {
        const base = s === "BTC" ? 95000 : s === "ETH" ? 3200 : rand(1, 200);
        quotes[s] = {
          price: base + rand(-base * 0.02, base * 0.02),
          percent_change_24h: rand(-5, 5),
          market_cap: rand(1000000000, 1000000000000),
          volume_24h: rand(100000000, 5000000000),
        };
      });
      return { ok: true, quotes };
    },
    "/arb": (qs) => {
      const coinA = qs.coin_a || "BTC";
      const coinB = qs.coin_b || "HYPE";
      const notional = parseFloat(qs.notional || 100);
      const rows = [];
      EXCHANGES.forEach(ex => {
        rows.push({
          exchange: ex,
          coin_a_price: rand(94000, 96000),
          coin_b_price: rand(24, 26),
          spread: rand(-0.5, 0.5),
          edge: rand(-0.2, 0.3),
          notional,
          fees: notional * 0.0004,
          net_edge: rand(-0.15, 0.25),
          stale: false,
        });
      });
      return { rows, notional, coin_a: coinA, coin_b: coinB };
    },
    "/funding_liquidity": (qs) => {
      const coinA = qs.coin_a || "BTC";
      const coinB = qs.coin_b || "HYPE";
      const notional = parseFloat(qs.notional || 100);
      const rows = [];
      EXCHANGES.forEach(ex => {
        rows.push({
          exchange: ex,
          coin_a_funding: rand(-0.02, 0.02),
          coin_b_funding: rand(-0.02, 0.02),
          net_funding: rand(-0.03, 0.03),
          liquidity_a: rand(50000, 5000000),
          liquidity_b: rand(50000, 5000000),
          notional,
        });
      });
      return { rows, notional, coin_a: coinA, coin_b: coinB };
    },
    "/max_leverage": (qs) => ({
      ok: true,
      coin: qs.coin || "BTC",
      max_leverage: randInt(5, 50),
      isolated_only: Math.random() > 0.7,
    }),
    "/history/spread": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      return {
        exchange: qs.exchange || "Hyperliquid",
        hours,
        coin_a: qs.coin_a || "BTC",
        coin_b: qs.coin_b || "HYPE",
        series: genSeries(hours, 120, 0, 0.002),
      };
    },
    "/history/pnl": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const notional = parseFloat(qs.notional || 100);
      return {
        exchange: qs.exchange || "Hyperliquid",
        hours, notional,
        coin_a: qs.coin_a || "BTC",
        coin_b: qs.coin_b || "HYPE",
        series: genSeries(hours, 120, 0, notional * 0.01),
      };
    },
    "/history/cross": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      return {
        a: qs.a || "Hyperliquid",
        b: qs.b || "Paradex",
        hours,
        coin_a: qs.coin_a || "BTC",
        coin_b: qs.coin_b || "HYPE",
        series: genSeries(hours, 120, 0, 0.003),
      };
    },
    "/history/cross_pnl": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const notional = parseFloat(qs.notional || 100);
      return {
        a: qs.a || "Hyperliquid",
        b: qs.b || "Paradex",
        hours, notional,
        coin_a: qs.coin_a || "BTC",
        coin_b: qs.coin_b || "HYPE",
        series: genSeries(hours, 120, 0, notional * 0.015),
      };
    },
    "/history/cross_funding": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      return {
        a: qs.a || "Hyperliquid",
        b: qs.b || "Paradex",
        hours,
        coin_a: qs.coin_a || "BTC",
        coin_b: qs.coin_b || "HYPE",
        fund_diff_series: genSeries(hours, 60, 0, 0.0005),
      };
    },
    "/history/funding": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const series_by_ex = {};
      EXCHANGES.forEach(ex => {
        series_by_ex[ex] = genSeries(hours, 60, rand(-0.01, 0.01), 0.0003);
      });
      return { coin: qs.coin || "BTC", hours, series_by_exchange: series_by_ex };
    },
    "/history/data_range": (qs) => ({
      coin: qs.coin || "BTC",
      exchanges: EXCHANGES.slice(0, 5),
      min_ts: now() - 7 * 24 * 3600,
      max_ts: now(),
    }),
    "/research": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const pairs = [];
      const coins = (qs.coins || "BTC,ETH,SOL,HYPE").split(",");
      for (let i = 0; i < coins.length; i++) {
        for (let j = i + 1; j < coins.length; j++) {
          pairs.push({
            coin_a: coins[i],
            coin_b: coins[j],
            exchange: qs.exchange || "Hyperliquid",
            entry: parseFloat(qs.entry || 0.1),
            exit: parseFloat(qs.exit || 0.05),
            trades: randInt(5, 50),
            wins: randInt(3, 40),
            losses: randInt(0, 10),
            pnl: parseFloat(rand(-5, 20).toFixed(2)),
            avg_hold_min: parseFloat(rand(5, 120).toFixed(1)),
            max_drawdown: parseFloat(rand(-3, -0.1).toFixed(2)),
            sharpe: parseFloat(rand(0.5, 3).toFixed(2)),
          });
        }
      }
      return { pairs, hours, notional: parseFloat(qs.notional || 100) };
    },
    "/paper_trade": (qs) => {
      const hours = parseFloat(qs.hours || 1);
      const trades = [];
      let cumPnl = 0;
      const numTrades = randInt(10, 40);
      for (let i = 0; i < numTrades; i++) {
        const pnl = rand(-2, 5);
        cumPnl += pnl;
        trades.push({
          entry_time: now() - rand(0, hours * 3600),
          exit_time: now() - rand(0, hours * 3600),
          entry_spread: rand(0.05, 0.3),
          exit_spread: rand(-0.1, 0.1),
          pnl: parseFloat(pnl.toFixed(2)),
          cumulative: parseFloat(cumPnl.toFixed(2)),
          hold_min: parseFloat(rand(5, 180).toFixed(1)),
        });
      }
      return {
        ok: true,
        a: qs.a || "Hyperliquid",
        b: qs.b || "Asterdex",
        hours,
        notional: parseFloat(qs.notional || 100),
        coin_a: qs.coin_a || "BTC",
        coin_b: qs.coin_b || "HYPE",
        trades,
        stats: {
          total_trades: numTrades,
          wins: trades.filter(t => t.pnl > 0).length,
          losses: trades.filter(t => t.pnl <= 0).length,
          total_pnl: parseFloat(cumPnl.toFixed(2)),
          avg_pnl: parseFloat((cumPnl / numTrades).toFixed(2)),
          best_trade: parseFloat(Math.max(...trades.map(t => t.pnl)).toFixed(2)),
          worst_trade: parseFloat(Math.min(...trades.map(t => t.pnl)).toFixed(2)),
          avg_hold_min: parseFloat((trades.reduce((s, t) => s + t.hold_min, 0) / numTrades).toFixed(1)),
          max_drawdown: parseFloat(rand(-5, -0.5).toFixed(2)),
          sharpe: parseFloat(rand(0.5, 3).toFixed(2)),
        },
        equity_curve: genSeries(hours, numTrades, 0, 2),
      };
    },
    "/suggest": (qs) => ({
      ok: true,
      suggestions: [
        { entry: 0.15, exit: 0.08, expected_pnl: rand(2, 10), win_rate: rand(0.5, 0.8) },
        { entry: 0.20, exit: 0.10, expected_pnl: rand(3, 15), win_rate: rand(0.4, 0.7) },
        { entry: 0.25, exit: 0.12, expected_pnl: rand(5, 20), win_rate: rand(0.3, 0.6) },
      ],
    }),
    "/simulate": (qs) => ({
      ok: true,
      config: {
        coin: qs.coin || "BTC",
        ex1: qs.ex1 || "Hyperliquid",
        ex2: qs.ex2 || "Binance",
        strategy: qs.strategy || "bb_grid",
      },
      equity_curve: genSeries(168, 200, 10000, 50),
      trades: Array.from({ length: randInt(10, 50) }, (_, i) => ({
        entry_time: now() - rand(0, 168 * 3600),
        side: pick(["long", "short"]),
        entry_price: rand(94000, 96000),
        exit_price: rand(94000, 96000),
        pnl: parseFloat(rand(-10, 20).toFixed(2)),
        hold_hours: parseFloat(rand(1, 24).toFixed(1)),
      })),
      stats: {
        total_pnl: parseFloat(rand(-50, 200).toFixed(2)),
        total_trades: randInt(10, 50),
        win_rate: parseFloat(rand(0.3, 0.8).toFixed(2)),
        max_drawdown: parseFloat(rand(-15, -2).toFixed(2)),
        sharpe: parseFloat(rand(0.3, 2.5).toFixed(2)),
      },
    }),
    "/subaccount_paper_trade": (qs) => {
      const days = parseFloat(qs.days || 7);
      const cycles = randInt(20, 80);
      const trades = [];
      let cumPnl = 0;
      for (let i = 0; i < cycles; i++) {
        const pnl = rand(-3, 8);
        cumPnl += pnl;
        trades.push({
          cycle: i + 1,
          phase: pick(["HEDGED", "WINNER_BANKED", "RECOVERY", "REHEDGED", "COMPLETE"]),
          entry_time: now() - rand(0, days * 24 * 3600),
          pnl: parseFloat(pnl.toFixed(2)),
          cumulative: parseFloat(cumPnl.toFixed(2)),
          hold_min: parseFloat(rand(10, 300).toFixed(1)),
          rehedges: randInt(0, 3),
        });
      }
      return {
        ok: true,
        coin_a: qs.coin_a || "BTC",
        coin_b: qs.coin_b || "HYPE",
        notional: parseFloat(qs.notional || 100),
        days,
        trades,
        stats: {
          total_cycles: cycles,
          wins: trades.filter(t => t.pnl > 0).length,
          losses: trades.filter(t => t.pnl <= 0).length,
          total_pnl: parseFloat(cumPnl.toFixed(2)),
          avg_pnl: parseFloat((cumPnl / cycles).toFixed(2)),
          rehedge_count: randInt(5, 30),
          rehedge_banked: parseFloat(rand(5, 50).toFixed(2)),
          max_drawdown: parseFloat(rand(-10, -1).toFixed(2)),
          recovery_rate: parseFloat(rand(0.3, 0.9).toFixed(2)),
        },
        equity_curve: genSeries(days * 24, 200, 0, 5),
      };
    },
    "/subaccount_paper_trade_gated": (qs) => {
      const result = handlers["/subaccount_paper_trade"](qs);
      result.gated = true;
      result.groups = [
        { name: "AB", cycles: randInt(10, 40), pnl: parseFloat(rand(-10, 50).toFixed(2)) },
        { name: "CD", cycles: randInt(10, 40), pnl: parseFloat(rand(-10, 50).toFixed(2)) },
      ];
      return result;
    },
    "/pair_scan_coins": () => ({
      ok: true,
      coins: COINS,
      count: COINS.length,
    }),
    "/pair_analysis": (qs) => ({
      ok: true,
      coin_a: qs.coin_a || "BTC",
      coin_b: qs.coin_b || "HYPE",
      correlation: parseFloat(rand(0.3, 0.95).toFixed(3)),
      cointegration: parseFloat(rand(0.01, 0.5).toFixed(4)),
      spread_mean: parseFloat(rand(-0.05, 0.05).toFixed(6)),
      spread_std: parseFloat(rand(0.001, 0.01).toFixed(6)),
      spread_sharpe: parseFloat(rand(0.5, 3).toFixed(2)),
      half_life: parseFloat(rand(10, 300).toFixed(1)),
      hurst_exponent: parseFloat(rand(0.3, 0.6).toFixed(3)),
      adf_pvalue: parseFloat(rand(0.001, 0.1).toFixed(4)),
      recommended: Math.random() > 0.5,
      spread_series: genSeries(24, 100, 0, 0.005),
    }),
    "/opportunities/recent": (qs) => {
      const limit = parseInt(qs.limit || 20);
      return {
        ok: true,
        signals: Array.from({ length: Math.min(limit, 15) }, (_, i) => ({
          id: i + 1,
          ts: now() - rand(0, 3600),
          pair: pick(["BTC/HYPE", "ETH/SOL", "BTC/ETH", "SOL/AVAX"]),
          strategy: pick(["cross_spread", "arb", "mean_reversion"]),
          signal: pick(["ENTRY", "EXIT", "REHEDGE"]),
          edge: parseFloat(rand(0.05, 0.5).toFixed(4)),
          notional: randInt(100, 500),
          status: pick(["open", "closed", "pending"]),
        })),
      };
    },
    "/opportunities/watchlist": () => ({
      ok: true,
      watchlist: [
        { pair: "BTC/HYPE", entry: 0.15, exit: 0.08, notional: 200 },
        { pair: "ETH/SOL", entry: 0.20, exit: 0.10, notional: 200 },
        { pair: "BTC/ETH", entry: 0.10, exit: 0.05, notional: 200 },
      ],
    }),
    "/opportunities/state": () => ({
      ok: true,
      states: EXCHANGES.map(ex => ({
        exchange: ex,
        active: Math.random() > 0.3,
        positions: randInt(0, 4),
        pnl: parseFloat(rand(-10, 30).toFixed(2)),
      })),
      engine_status: { running: true, last_eval: now() - rand(0, 60) },
      timestamp: now(),
    }),
    "/opportunities/signal_stats": (qs) => ({
      ok: true,
      stats: {
        total_signals: randInt(100, 1000),
        entries: randInt(50, 500),
        exits: randInt(40, 450),
        rehedges: randInt(10, 100),
        win_rate: parseFloat(rand(0.4, 0.8).toFixed(2)),
        avg_edge: parseFloat(rand(0.1, 0.3).toFixed(4)),
      },
    }),
    "/opportunities/history": (qs) => ({
      ok: true,
      history: Array.from({ length: parseInt(qs.limit || 50) }, (_, i) => ({
        ts: now() - i * 3600,
        pair: pick(["BTC/HYPE", "ETH/SOL", "BTC/ETH"]),
        action: pick(["ENTRY", "EXIT", "REHEDGE"]),
        pnl: parseFloat(rand(-5, 10).toFixed(2)),
      })),
    }),
    "/opportunities/arb": () => ({
      ok: true,
      opportunities: Array.from({ length: randInt(3, 10) }, (_, i) => ({
        pair: pick(["BTC/HYPE", "ETH/SOL", "BTC/ETH", "SOL/AVAX"]),
        exchange_a: pick(EXCHANGES),
        exchange_b: pick(EXCHANGES),
        edge: parseFloat(rand(0.05, 0.5).toFixed(4)),
        notional: randInt(100, 500),
        estimated_pnl: parseFloat(rand(1, 10).toFixed(2)),
      })),
      engine_status: { running: true, last_eval: now() },
      timestamp: now(),
    }),
    "/data-stats": () => ({
      ok: true,
      total_rows: randInt(1000000, 50000000),
      earliest_ts: now() - 30 * 24 * 3600,
      latest_ts: now(),
      files: randInt(100, 500),
      size_mb: parseFloat(rand(100, 5000).toFixed(1)),
    }),
    "/data_status": (qs) => ({
      ok: true,
      coin: qs.coin || "BTC",
      has_data: true,
      candles: randInt(1000, 50000),
      funding_points: randInt(100, 5000),
      earliest: now() - 30 * 24 * 3600,
      latest: now() - rand(0, 3600),
    }),
    "/trades_all": (qs) => {
      const coin = qs.coin || "BTC";
      const hours = parseFloat(qs.hours || 1);
      const by_exchange = {};
      EXCHANGES.forEach(ex => {
        by_exchange[ex] = Array.from({ length: randInt(5, 30) }, () => ({
          ts: now() - rand(0, hours * 3600),
          price: rand(94000, 96000),
          size: parseFloat(rand(0.001, 5).toFixed(4)),
          side: pick(["buy", "sell"]),
        }));
      });
      return { coin, hours, by_exchange };
    },
    "/run_analyzer": (qs) => ({
      ok: true,
      hours: parseFloat(qs.hours || 1),
      output: "Analyzer completed. 15 pairs analyzed, 3 opportunities found.",
      results: { pairs: randInt(10, 30), opportunities: randInt(0, 5) },
    }),
    "/reset_baseline": () => ({ ok: true, baseline_ts: now() }),
    "/hl_subscribe": (qs) => ({ ok: true, coins: (qs.coins || "BTC,HYPE").split(",") }),
    "/fetch_candles": (qs) => ({
      ok: true,
      coin: qs.coin || "BTC",
      candles_fetched: randInt(100, 1000),
      funding_points: randInt(10, 100),
    }),
    "/discover-assets": () => ({
      ok: true,
      results: EXCHANGES.map(ex => ({ exchange: ex, new_assets: randInt(0, 3), total: randInt(10, 100) })),
      changed: false,
      restart_needed: false,
    }),
  };

  // Parse query string from URL
  function parseQS(url) {
    const q = {};
    const idx = url.indexOf("?");
    if (idx >= 0) {
      const params = url.slice(idx + 1).split("&");
      params.forEach(p => {
        const [k, v] = p.split("=");
        if (k) q[decodeURIComponent(k)] = v ? decodeURIComponent(v) : "";
      });
    }
    return q;
  }

  // Extract path from URL (strip query string)
  function getPath(url) {
    const idx = url.indexOf("?");
    return idx >= 0 ? url.slice(0, idx) : url;
  }

  // Override fetch
  const originalFetch = window.fetch;
  window.fetch = function(input, init) {
    const url = typeof input === "string" ? input : input.url;
    const path = getPath(url);
    const qs = parseQS(url);

    // Find handler — match by path prefix (some endpoints have dynamic suffixes)
    let handler = null;
    if (handlers[path]) {
      handler = handlers[path];
    } else {
      // Try prefix matching for dynamic endpoints
      for (const key of Object.keys(handlers)) {
        if (path.startsWith(key)) {
          handler = handlers[key];
          break;
        }
      }
    }

    if (handler) {
      // Simulate network delay
      return new Promise((resolve) => {
        setTimeout(() => {
          const data = handler(qs);
          resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data)),
            blob: () => Promise.resolve(new Blob([JSON.stringify(data)], { type: "application/json" })),
            clone: function() { return this; },
          });
        }, rand(100, 400));
      });
    }

    // If no handler, try original fetch (for static assets)
    if (originalFetch) {
      return originalFetch.call(window, input, init);
    }

    // Fallback: return empty
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ ok: false, error: "Mock: no handler for " + path }),
      text: () => Promise.resolve("Not found"),
    });
  };
})();
