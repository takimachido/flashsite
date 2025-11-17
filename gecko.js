/* ============================================================
   FlashScreener — GeckoTerminal Integration + TradingView
   ============================================================ */

/* ----------------------------
   1. PEGAR CONTRACT ADDRESS
----------------------------- */
function getCA() {
  const params = new URLSearchParams(window.location.search);
  return params.get("ca")?.trim();
}

// Caso nenhum token seja passado → usar SOL wrapped (exemplo)
const CONTRACT = getCA() || "So11111111111111111111111111111111111111112";

/* ----------------------------
   2. FORMATADORES
----------------------------- */
const fmtUSD = (n) =>
  n ? "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 6 }) : "--";

const fmtPercent = (n) =>
  n === null || n === undefined
    ? "0%"
    : (n >= 0 ? "+" : "") + Number(n).toFixed(2) + "%";

const fmtSOL = (usdPrice, solPrice) =>
  solPrice
    ? solPrice + " SOL"
    : usdPrice
    ? (usdPrice / 200).toFixed(6) + " SOL"
    : "--";

/* ----------------------------
   3. TRADINGVIEW WIDGET
----------------------------- */
function loadTradingView(pairAddress) {
  new TradingView.widget({
    width: "100%",
    height: "100%",
    symbol: `SOLANA:${pairAddress}`,
    interval: "5",
    timezone: "Etc/UTC",
    theme: "dark",
    style: "1",
    locale: "en",
    hide_top_toolbar: false,
    hide_legend: false,
    container_id: "tv-chart-container"
  });
}

/* ----------------------------
   4. LIVE TRADES (WebSocket)
----------------------------- */
function startLiveTrades(pairAddress) {
  const ws = new WebSocket(`wss://streaming.geckoterminal.com/solana/pairs/${pairAddress}`);
  const container = document.querySelector(".transactions-rows");

  ws.onmessage = (msg) => {
    let data;
    try {
      data = JSON.parse(msg.data);
    } catch {
      return;
    }

    if (!data.trade) return;

    const t = data.trade;
    const row = document.createElement("div");

    row.classList.add("tx-row");
    row.classList.add(t.side === "buy" ? "tx-buy" : "tx-sell");

    row.innerHTML = `
      <span>${new Date(t.timestamp * 1000).toLocaleTimeString()}</span>
      <span>${t.wallet.slice(0,4)}...${t.wallet.slice(-4)}</span>
      <span>${t.amount_native?.toFixed(4) ?? "--"}</span>
      <span>$${t.amount_usd?.toFixed(2) ?? "--"}</span>
      <span>${t.amount_token?.toFixed(4) ?? "--"}</span>
      <span>${t.side}</span>
    `;

    container.prepend(row);

    // mantém só os últimos 40
    while (container.children.length > 40) {
      container.removeChild(container.lastChild);
    }
  };
}

/* ----------------------------
   5. CARREGAR TOKEN DATA
----------------------------- */
async function loadToken() {
  const API = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${CONTRACT}`;

  try {
    const r = await fetch(API);
    const json = await r.json();

    const data = json.data?.attributes;
    const pair = data?.top_pair;
    const pairAddress = pair?.attributes?.address;

    if (!data || !pairAddress) {
      console.error("Token não encontrado ou pair indisponível.");
      return;
    }

    /* ------------------------------------------
       Preencher dados principais no painel
    ------------------------------------------- */
    document.querySelector(".pair-title-main").textContent = `${data.symbol}/SOL`;
    document.querySelector(".pair-sub").textContent =
      `(Market Cap) on Raydium · 1D · flashscreener.com`;

    document.querySelector(".token-name").textContent = data.name;

    // Avatar
    if (data.image_url) {
      const pfp = document.querySelector(".pfp-circle");
      pfp.innerHTML = `<img src="${data.image_url}" style="width:100%;height:100%;border-radius:50%">`;
    }

    // Liquidity / MarketCap / FDV
    document.querySelectorAll(".metric-box")[0].querySelector(".metric-value").textContent =
      fmtUSD(data.liquidity_usd);
    document.querySelectorAll(".metric-box")[1].querySelector(".metric-value").textContent =
      fmtUSD(data.market_cap_usd);
    document.querySelectorAll(".metric-box")[2].querySelector(".metric-value").textContent =
      fmtUSD(data.fdv_usd);

    // Price USD & SOL
    document.querySelectorAll(".price-box")[0].querySelector(".price-value").textContent =
      fmtUSD(data.price_usd);
    document.querySelectorAll(".price-box")[1].querySelector(".price-value").textContent =
      fmtSOL(data.price_usd, data.price_native);

    // Perf (5m / 1h / 6h / 24h)
    const changes = data.price_change_percentage;
    document.querySelectorAll(".perf-box")[0].querySelector(".perf-value").textContent =
      fmtPercent(changes.m5);
    document.querySelectorAll(".perf-box")[1].querySelector(".perf-value").textContent =
      fmtPercent(changes.h1);
    document.querySelectorAll(".perf-box")[2].querySelector(".perf-value").textContent =
      fmtPercent(changes.h6);
    document.querySelectorAll(".perf-box")[3].querySelector(".perf-value").textContent =
      fmtPercent(changes.h24);

    // Volume
    const volume = data.volume_usd?.h24 || 0;
    document.querySelector(".volume-value").textContent = fmtUSD(volume);

    const buys = data.swap_count?.buys24h || 0;
    const sells = data.swap_count?.sells24h || 0;
    const total = buys + sells;

    const sellsPct = total ? (sells / total) * 100 : 50;
    const buysPct = total ? (buys / total) * 100 : 50;

    document.querySelector(".volume-sells").style.width = sellsPct + "%";
    document.querySelector(".volume-buys").style.width = buysPct + "%";

    document.querySelector(".volume-legend").innerHTML =
      `<span>Sells ${sells}</span><span>Buys ${buys}</span>`;

    /* ------------------------------------------
       Details (CA, Created, Deployer, Pair)
    ------------------------------------------- */

    // CA
    document.querySelectorAll(".details-row")[0].querySelector(".details-link").textContent =
      CONTRACT.slice(0, 6) + "..." + CONTRACT.slice(-6);
    document.querySelectorAll(".details-row")[0].querySelector(".details-link").href =
      `https://solscan.io/token/${CONTRACT}`;

    // Created (data pura do GeckoTerminal)
    const createdDate = new Date(data.created_at).toLocaleDateString("en-US");
    document.querySelectorAll(".details-row")[1].querySelector(".details-text").textContent =
      createdDate;

    // Deployer
    const deployer = pair.attributes.base_token?.data?.attributes?.creator ||
                     pair.attributes.quote_token?.data?.attributes?.creator;

    if (deployer) {
      document.querySelectorAll(".details-row")[2].querySelector(".details-link").textContent =
        deployer.slice(0,4) + "..." + deployer.slice(-4);
      document.querySelectorAll(".details-row")[2].querySelector(".details-link").href =
        `https://solscan.io/account/${deployer}`;
    }

    // Pair
    document.querySelectorAll(".details-row")[3].querySelector(".details-link").textContent =
      pairAddress.slice(0,6) + "..." + pairAddress.slice(-6);
    document.querySelectorAll(".details-row")[3].querySelector(".details-link").href =
      `https://solscan.io/account/${pairAddress}`;

    /* ------------------------------------------
       6. INICIAR CHART DO TRADINGVIEW
    ------------------------------------------- */
    loadTradingView(pairAddress);

    /* ------------------------------------------
       7. INICIAR TRADES EM TEMPO REAL
    ------------------------------------------- */
    startLiveTrades(pairAddress);

  } catch (err) {
    console.error("Erro ao carregar dados GeckoTerminal:", err);
  }
}

/* ----------------------------
   8. INICIAR
----------------------------- */
loadToken();

