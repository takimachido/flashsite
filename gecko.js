// ===================================
// FlashScreener + GeckoTerminal API
// ===================================

// 1. PEGAR CONTRACT ADDRESS DA URL
function getCA() {
  const params = new URLSearchParams(window.location.search);
  return params.get("ca")?.trim();
}

// Caso não passe CA, usar um de teste
const CONTRACT = getCA() || "So11111111111111111111111111111111111111112";

// 2. URL DO GECKO
const API = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${CONTRACT}`;

// 3. FORMATADORES
const fmtUSD = (n) =>
  n ? "$" + Number(n).toLocaleString("en-US", { maximumFractionDigits: 6 }) : "--";

const fmtSOL = (usdPrice, solPrice) =>
  solPrice
    ? solPrice + " SOL"
    : usdPrice
    ? (usdPrice / 200).toFixed(6) + " SOL"
    : "--";

// % formatter
const fmtPercent = (n) =>
  n
    ? (Number(n) >= 0 ? "+" : "") + Number(n).toFixed(2) + "%"
    : "0%";

// 4. FUNÇÃO PRINCIPAL
async function loadToken() {
  try {
    const r = await fetch(API);
    const json = await r.json();

    const data = json.data?.attributes;
    if (!data) return;

    // ==============================
    // EXTRAINDO OS CAMPOS DO GECKO
    // ==============================
    const name = data.name;
    const symbol = data.symbol;
    const priceUsd = Number(data.price_usd);
    const priceSol = data.price_native;
    const fdv = data.fdv_usd;
    const mcap = data.market_cap_usd;
    const liquidity = data.liquidity_usd;
    const volume24 = data.volume_usd?.h24;
    const logo = data.image_url;

    const change5m = data.price_change_percentage?.m5;
    const change1h = data.price_change_percentage?.h1;
    const change6h = data.price_change_percentage?.h6;
    const change24h = data.price_change_percentage?.h24;

    const buys = data.swap_count?.buys24h || 0;
    const sells = data.swap_count?.sells24h || 0;

    const created = data.created_at;
    const ca = data.address;
    const pair = data.top_pair?.id;
    const pairAddress = data.top_pair?.attributes?.address;

    // ==============================
    // PREENCHENDO NO HTML
    // ==============================

    // HEADER PRINCIPAL
    document.querySelector(".pair-title-main").textContent = `${symbol}/SOL`;

    // SUBHEADER
    const sub = document.querySelector(".pair-sub");
    if (sub) sub.textContent = ` (Market Cap) on Raydium · 1D · flashscreener.com`;

    // NOME
    document.querySelector(".token-name").textContent = name;

    // IMAGEM (PFP)
    if (logo) {
      const pfp = document.querySelector(".pfp-circle");
      pfp.innerHTML = `<img src="${logo}" style="width:100%;height:100%;border-radius:50%">`;
    }

    // METRICS
    document.querySelectorAll(".metric-box")[0].querySelector(".metric-value").textContent = fmtUSD(liquidity);
    document.querySelectorAll(".metric-box")[1].querySelector(".metric-value").textContent = fmtUSD(mcap);
    document.querySelectorAll(".metric-box")[2].querySelector(".metric-value").textContent = fmtUSD(fdv);

    // PRICES
    document.querySelectorAll(".price-box")[0].querySelector(".price-value").textContent = fmtUSD(priceUsd);
    document.querySelectorAll(".price-box")[1].querySelector(".price-value").textContent =
      fmtSOL(priceUsd, priceSol);

    // CHANGES
    document.querySelectorAll(".perf-box")[0].querySelector(".perf-value").textContent = fmtPercent(change5m);
    document.querySelectorAll(".perf-box")[1].querySelector(".perf-value").textContent = fmtPercent(change1h);
    document.querySelectorAll(".perf-box")[2].querySelector(".perf-value").textContent = fmtPercent(change6h);
    document.querySelectorAll(".perf-box")[3].querySelector(".perf-value").textContent = fmtPercent(change24h);

    // VOLUME
    document.querySelector(".volume-value").textContent = fmtUSD(volume24);

    // BARRA VOLUME
    const total = buys + sells;
    const sellsPct = total ? (sells / total) * 100 : 50;
    const buysPct = total ? (buys / total) * 100 : 50;

    const sellsBar = document.querySelector(".volume-sells");
    const buysBar = document.querySelector(".volume-buys");
    sellsBar.style.width = sellsPct + "%";
    buysBar.style.width = buysPct + "%";

    document.querySelector(".volume-legend").innerHTML = `
      <span>Sells ${sells}</span>
      <span>Buys ${buys}</span>
    `;

    // DETAILS
    document.querySelector(".details-link").textContent = ca.slice(0, 6) + "..." + ca.slice(-6);
    document.querySelector(".details-link").href = `https://solscan.io/token/${ca}`;

    document.querySelectorAll(".details-row")[3].querySelector(".details-link").href =
      `https://solscan.io/account/${pairAddress}`;
    document.querySelectorAll(".details-row")[3].querySelector(".details-link").textContent =
      pairAddress.slice(0, 6) + "..." + pairAddress.slice(-6);

    // DATA DE CRIAÇÃO
    const dateStr = new Date(created).toLocaleDateString("en-US");
    document.querySelectorAll(".details-row")[1].querySelector(".details-text").textContent =
      dateStr;

  } catch (e) {
    console.error("Erro ao carregar dados GeckoTerminal:", e);
  }
}

loadToken();
