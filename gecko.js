function getCA() {
  const params = new URLSearchParams(window.location.search);
  return params.get("ca")?.trim();
}

// fallback se nenhum token for especificado
const CONTRACT =
  getCA() ||
  "So11111111111111111111111111111111111111112"; // WSOL como exemplo default


/* ------------------------------------------------------------
   2. FORMATADORES UNIVERSAIS
------------------------------------------------------------ */
const fmtUSD = (n) =>
  n
    ? "$" +
      Number(n).toLocaleString("en-US", {
        maximumFractionDigits: 6,
      })
    : "--";

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
    container_id: "tv-chart-container",
  });
}


/* ------------------------------------------------------------
   4. WEBSOCKET: STREAM DE TRADES EM TEMPO REAL
------------------------------------------------------------ */
function startLiveTrades(pairAddress) {
  const ws = new WebSocket(
    `wss://streaming.geckoterminal.com/solana/pairs/${pairAddress}`
  );

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
      <span>${t.wallet.slice(0, 4)}...${t.wallet.slice(-4)}</span>
      <span>${t.amount_native?.toFixed(4) ?? "--"}</span>
      <span>$${t.amount_usd?.toFixed(2) ?? "--"}</span>
      <span>${t.amount_token?.toFixed(4) ?? "--"}</span>
      <span>${t.side}</span>
    `;

    container.prepend(row);

    // Mantém até 40 trades
    while (container.children.length > 40) {
      container.removeChild(container.lastChild);
    }
  };
}


/* ------------------------------------------------------------
   5. CARREGAR TOKEN PRINCIPAL (GeckoTerminal v3)
------------------------------------------------------------ */
async function loadToken() {
  try {
    // 1) Buscar info básica do token
    const infoURL = `https://api.geckoterminal.com/api/v3/networks/solana/tokens/${CONTRACT}`;
    const infoRes = await fetch(infoURL);
    const infoJson = await infoRes.json();
    const token = infoJson.data?.attributes;

    if (!token) {
      console.error("Token não encontrado");
      return;
    }

    // 2) Buscar pares/pools (IMPORTANTE!)
    const poolsURL = `https://api.geckoterminal.com/api/v3/networks/solana/tokens/${CONTRACT}/pools`;
    const poolsRes = await fetch(poolsURL);
    const poolsJson = await poolsRes.json();

    if (!poolsJson.data || poolsJson.data.length === 0) {
      console.error("Nenhum par encontrado para esse token.");
      return;
    }

    // Pega o par mais líquido (como DexScreener)
    const bestPool = poolsJson.data[0];
    const pairAddress = bestPool.attributes.address;

    if (!pairAddress) {
      console.error("Pair sem endereço.");
      return;
    }

    /* ------------------------------------------
       UI — Preencher painel
    ------------------------------------------- */

    document.querySelector(".pair-title-main").textContent =
      `${token.symbol}/SOL`;
    document.querySelector(".pair-sub").textContent =
      `(Market Cap) • FlashScreener`;

    document.querySelector(".token-name").textContent = token.name;

    if (token.image_url) {
      const pfp = document.querySelector(".pfp-circle");
      pfp.innerHTML = `<img src="${token.image_url}" style="width:100%;height:100%;border-radius:50%">`;
    }

    // Métricas
    document.querySelectorAll(".metric-box")[0].querySelector(".metric-value").textContent =
      fmtUSD(bestPool.attributes.reserve_in_usd);

    document.querySelectorAll(".metric-box")[1].querySelector(".metric-value").textContent =
      fmtUSD(token.market_cap_usd);

    document.querySelectorAll(".metric-box")[2].querySelector(".metric-value").textContent =
      fmtUSD(token.fdv_usd);

    // Preços
    document.querySelectorAll(".price-box")[0].querySelector(".price-value").textContent =
      fmtUSD(token.price_usd);

    document.querySelectorAll(".price-box")[1].querySelector(".price-value").textContent =
      fmtSOL(token.price_usd, token.price_native);

    // Performance
    const c = token.price_change_percentage;
    document.querySelectorAll(".perf-box")[0].querySelector(".perf-value").textContent =
      fmtPercent(c.m5);
    document.querySelectorAll(".perf-box")[1].querySelector(".perf-value").textContent =
      fmtPercent(c.h1);
    document.querySelectorAll(".perf-box")[2].querySelector(".perf-value").textContent =
      fmtPercent(c.h6);
    document.querySelectorAll(".perf-box")[3].querySelector(".perf-value").textContent =
      fmtPercent(c.h24);

    // Volume
    const buys = token.swap_count?.buys24h || 0;
    const sells = token.swap_count?.sells24h || 0;
    const total = buys + sells;
    const buysPct = total ? (buys / total) * 100 : 50;
    const sellsPct = 100 - buysPct;

    document.querySelector(".volume-value").textContent =
      fmtUSD(token.volume_usd?.h24 || 0);

    document.querySelector(".volume-sells").style.width = sellsPct + "%";
    document.querySelector(".volume-buys").style.width = buysPct + "%";

    document.querySelector(".volume-legend").innerHTML =
      `<span>Sells ${sells}</span><span>Buys ${buys}</span>`;

    // DETAILS
    document.querySelectorAll(".details-row")[0].querySelector(".details-link").textContent =
      CONTRACT.slice(0, 6) + "..." + CONTRACT.slice(-6);
    document.querySelectorAll(".details-row")[0].querySelector(".details-link").href =
      `https://solscan.io/token/${CONTRACT}`;

    document.querySelectorAll(".details-row")[3].querySelector(".details-link").textContent =
      pairAddress.slice(0, 6) + "..." + pairAddress.slice(-6);
    document.querySelectorAll(".details-row")[3].querySelector(".details-link").href =
      `https://solscan.io/account/${pairAddress}`;

    /* ------------------------------------------
       TradingView (agora 100% funcional)
    ------------------------------------------- */
    loadTradingView(pairAddress);

    /* ------------------------------------------
       WebSocket real-time trades
    ------------------------------------------- */
    startLiveTrades(pairAddress);

  } catch (err) {
    console.error("Erro ao carregar token:", err);
  }
}


/* ------------------------------------------------------------
   6. AUTOCOMPLETE (GeckoTerminal v3)
------------------------------------------------------------ */
const searchInput = document.querySelector(".search-input input");
const dropdown = document.getElementById("search-results");
let searchTimeout = null;

// Digitação
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();

  if (!q) {
    dropdown.style.display = "none";
    return;
  }

  // Se for um contract address diretamente
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

  // Debounce 250ms
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => autoSearch(q), 250);
});

// ENTER = buscar imediatamente
searchInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") {
    const q = searchInput.value.trim();
    if (!q) return;

    // se o usuário digitar CA
    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(q)) {
      window.location.href = `index.html?ca=${q}`;
      return;
    }

    autoSearchAndGo(q);
  }
});

// Busca com dropdown
async function autoSearch(q) {
  try {
    const url = `https://api.geckoterminal.com/api/v3/search?text=${encodeURIComponent(
      q
    )}&limit=6&include=tokens,pairs,networks`;

    const r = await fetch(url);
    const js = await r.json();

    dropdown.innerHTML = "";

    if (!js.data || js.data.length === 0) {
      dropdown.innerHTML = `<div class="search-item-info" style="padding:10px;color:#aaa">No results</div>`;
      dropdown.style.display = "block";
      return;
    }

    js.data.forEach((item) => {
      const att = item.attributes;
      const ca = att.address;
      const img = att.image_url;
      const name = att.name || "Unknown";
      const symbol = att.symbol || "---";

      const el = document.createElement("div");
      el.classList.add("search-item");

      el.innerHTML = `
        <img src="${img}" onerror="this.src='https://via.placeholder.com/26'"/>
        <div class="search-item-info">
          <div class="search-item-name">${name}</div>
          <div class="search-item-symbol">${symbol}</div>
        </div>`;

      el.onclick = () => (window.location.href = `index.html?ca=${ca}`);

      dropdown.appendChild(el);
    });

    dropdown.style.display = "block";
  } catch (err) {
    console.error("Erro no autocomplete:", err);
  }
}

// Busca direta (Enter)
async function autoSearchAndGo(q) {
  try {
    const url = `https://api.geckoterminal.com/api/v3/search?text=${encodeURIComponent(
      q
    )}&limit=1&include=tokens,pairs,networks`;

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

// Fechar dropdown se clicar fora
document.addEventListener("click", (e) => {
  if (!dropdown.contains(e.target) && !searchInput.contains(e.target)) {
    dropdown.style.display = "none";
  }
});


/* ------------------------------------------------------------
   7. INICIAR TUDO
------------------------------------------------------------ */
loadToken();
