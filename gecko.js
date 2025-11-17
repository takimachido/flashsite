/* ============================================================
   FlashScreener — Full GeckoTerminal Integration
   TradingView + Real-Time Trades + Autocomplete Search
============================================================ */


/* ------------------------------------------------------------
   1. PEGAR CONTRACT ADDRESS DA URL
------------------------------------------------------------ */
function getCA() {
  const params = new URLSearchParams(window.location.search);
  return params.get("ca")?.trim();
}

// fallback caso nada seja passado
const CONTRACT = getCA() || "So11111111111111111111111111111111111111112";


/* ------------------------------------------------------------
   2. FORMATADORES
------------------------------------------------------------ */
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


/* ------------------------------------------------------------
   3. TRADINGVIEW WIDGET
------------------------------------------------------------ */
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


/* ------------------------------------------------------------
   4. REAL-TIME TRADES (WEBSOCKET STREAM)
------------------------------------------------------------ */
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

    // mantém somente os últimos 40
    while (container.children.length > 40) {
      container.removeChild(container.lastChild);
    }
  };
}


/* ------------------------------------------------------------
   5. CARREGAR TOKEN PRINCIPAL
------------------------------------------------------------ */
async function loadToken() {
  const API = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${CONTRACT}`;

  try {
    const r = await fetch(API);
    const json = await r.json();

    const data = json.data?.attributes;
    const pair = data?.top_pair;
    const pairAddress = pair?.attributes?.address;

    if (!data || !pairAddress) {
      console.error("Token ou pair não encontrado.");
      return;
    }

    /* ------------------------------------------
       Painel superior
    ------------------------------------------- */
    document.querySelector(".pair-title-main").textContent = `${data.symbol}/SOL`;
    document.querySelector(".pair-sub").textContent =
      `(Market Cap) on Raydium · 1D · flashscreener.com`;

    document.querySelector(".token-name").textContent = data.name;

    if (data.image_url) {
      const pfp = document.querySelector(".pfp-circle");
      pfp.innerHTML = `<img src="${data.image_url}" style="width:100%;height:100%;border-radius:50%">`;
    }

    /* ------------------------------------------
       Métricas
    ------------------------------------------- */
    document.querySelectorAll(".metric-box")[0].querySelector(".metric-value").textContent =
      fmtUSD(data.liquidity_usd);
    document.querySelectorAll(".metric-box")[1].querySelector(".metric-value").textContent =
      fmtUSD(data.market_cap_usd);
    document.querySelectorAll(".metric-box")[2].querySelector(".metric-value").textContent =
      fmtUSD(data.fdv_usd);

    document.querySelectorAll(".price-box")[0].querySelector(".price-value").textContent =
      fmtUSD(data.price_usd);
    document.querySelectorAll(".price-box")[1].querySelector(".price-value").textContent =
      fmtSOL(data.price_usd, data.price_native);

    const changes = data.price_change_percentage;
    document.querySelectorAll(".perf-box")[0].querySelector(".perf-value").textContent =
      fmtPercent(changes.m5);
    document.querySelectorAll(".perf-box")[1].querySelector(".perf-value").textContent =
      fmtPercent(changes.h1);
    document.querySelectorAll(".perf-box")[2].querySelector(".perf-value").textContent =
      fmtPercent(changes.h6);
    document.querySelectorAll(".perf-box")[3].querySelector(".perf-value").textContent =
      fmtPercent(changes.h24);

    const buys = data.swap_count?.buys24h || 0;
    const sells = data.swap_count?.sells24h || 0;
    const total = buys + sells;
    const buysPct = total ? (buys / total) * 100 : 50;
    const sellsPct = total ? (sells / total) * 100 : 50;

    document.querySelector(".volume-value").textContent = fmtUSD(data.volume_usd?.h24 || 0);

    document.querySelector(".volume-sells").style.width = sellsPct + "%";
    document.querySelector(".volume-buys").style.width = buysPct + "%";

    document.querySelector(".volume-legend").innerHTML =
      `<span>Sells ${sells}</span><span>Buys ${buys}</span>`;

    /* ------------------------------------------
       DETAILS
    ------------------------------------------- */
    // CA
    document.querySelectorAll(".details-row")[0].querySelector(".details-link").textContent =
      CONTRACT.slice(0, 6) + "..." + CONTRACT.slice(-6);
    document.querySelectorAll(".details-row")[0].querySelector(".details-link").href =
      `https://solscan.io/token/${CONTRACT}`;

    // Created
    const createdDate = new Date(data.created_at).toLocaleDateString("en-US");
    document.querySelectorAll(".details-row")[1].querySelector(".details-text").textContent =
      createdDate;

    // Deployer
    const deployer =
      pair.attributes.base_token?.data?.attributes?.creator ||
      pair.attributes.quote_token?.data?.attributes?.creator;

    if (deployer) {
      document.querySelectorAll(".details-row")[2].querySelector(".details-link").textContent =
        deployer.slice(0, 4) + "..." + deployer.slice(-4);
      document.querySelectorAll(".details-row")[2].querySelector(".details-link").href =
        `https://solscan.io/account/${deployer}`;
    }

    // Pair Address
    document.querySelectorAll(".details-row")[3].querySelector(".details-link").textContent =
      pairAddress.slice(0, 6) + "..." + pairAddress.slice(-6);
    document.querySelectorAll(".details-row")[3].querySelector(".details-link").href =
      `https://solscan.io/account/${pairAddress}`;

    /* ------------------------------------------
       6. CARREGAR TRADINGVIEW
    ------------------------------------------- */
    loadTradingView(pairAddress);

    /* ------------------------------------------
       7. INICIAR STREAM DE TRADES AO VIVO
    ------------------------------------------- */
    startLiveTrades(pairAddress);

  } catch (err) {
    console.error("Erro ao carregar dados:", err);
  }
}


/* ------------------------------------------------------------
   6. AUTOCOMPLETE SEARCH
------------------------------------------------------------ */

const searchInput = document.querySelector(".search-input input");
const dropdown = document.getElementById("search-results");
let searchTimeout = null;

// Digitação ativa
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();
  if (!q) {
    dropdown.style.display = "none";
    return;
  }

  // Se for CA (Base58 32-44 chars)
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
    dropdown.innerHTML = `
      <div class="search-item" onclick="window.location.href='index.html?ca=${q}'">
        <div class="search-item-info">
          <div class="search-item-name">Go to Contract</div>
          <div class="search-item-symbol">${q.slice(0,6)}...${q.slice(-6)}</div>
        </div>
      </div>`;
    dropdown.style.display = "block";
    return;
  }

  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => autoSearch(q), 250);
});


// ENTER = buscar imediatamente
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const q = searchInput.value.trim();
    if (!q) return;

    // CA
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
      window.location.href = `index.html?ca=${q}`;
      return;
    }

    autoSearchAndGo(q);
  }
});


async function autoSearch(q) {
  try {
    const url = `https://api.geckoterminal.com/api/v2/search?query=${encodeURIComponent(q)}&limit=6`;
    const r = await fetch(url);
    const js = await r.json();

    dropdown.innerHTML = "";
    if (!js.data || js.data.length === 0) {
      dropdown.innerHTML = `<div class="search-item-info" style="padding:10px">No results</div>`;
      dropdown.style.display = "block";
      return;
    }

    js.data.forEach(item => {
      const att = item.attributes;
      const ca = att.address;
      const img = att.image_url;
      const name = att.name || "Unknown";
      const symbol = att.symbol || "---";
      const network = att.network_display_name || "";

      const el = document.createElement("div");
      el.classList.add("search-item");
      el.innerHTML = `
        <img src="${img}" onerror="this.src='https://via.placeholder.com/26'"/>
        <div class="search-item-info">
          <div class="search-item-name">${name}</div>
          <div class="search-item-symbol">${symbol} • ${network}</div>
        </div>`;

      el.onclick = () => window.location.href = `index.html?ca=${ca}`;

      dropdown.appendChild(el);
    });

    dropdown.style.display = "block";

  } catch (err) {
    console.error("Erro no autocomplete:", err);
  }
}


// ENTER → busca e redireciona
async function autoSearchAndGo(q) {
  try {
    const url =
      `https://api.geckoterminal.com/api/v2/search?query=${encodeURIComponent(q)}&limit=1`;

    const r = await fetch(url);
    const js = await r.json();

    if (!js.data || js.data.length === 0) {
      alert("Token não encontrado.");
      return;
    }

    const ca = js.data[0].attributes.address;
    window.location.href = `index.html?ca=${ca}`;
  } catch (err) {
    alert("Erro ao buscar token.");
  }
}


// fechar dropdown se clicar fora
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target) && !searchInput.contains(e.target)) {
    dropdown.style.display = "none";
  }
});


/* ------------------------------------------------------------
   7. INICIAR TUDO
------------------------------------------------------------ */
loadToken();
