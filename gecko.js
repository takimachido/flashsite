// gecko.js
// API GeckoTerminal (API pública da CoinGecko focada em DEX, retorna JSON com dados de pools) :contentReference[oaicite:0]{index=0}

const GECKO_BASE_URL = 'https://api.geckoterminal.com/api/v2';
const NETWORK = 'solana';

// Exemplo: mint e pool de teste – depois você troca para o token real
const TOKEN_MINT  = 'COLOQUE_AQUI_O_MINT_DO_TOKEN';
const POOL_ADDRESS = 'COLOQUE_AQUI_O_ENDERECO_DA_POOL_RAYDIUM';

async function fetchPoolData(poolAddress) {
  const url = `${GECKO_BASE_URL}/networks/${NETWORK}/pools/${poolAddress}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } }); // fetch = função nativa do browser para requisição HTTP

  if (!res.ok) {
    console.error('Erro GeckoTerminal:', res.status, await res.text());
    return null;
  }

  const json = await res.json(); // JSON = formato de dados padrão das APIs web
  console.log('Resposta GeckoTerminal (pool):', json);

  // Na resposta do /pools, os dados vêm em json.data.attributes :contentReference[oaicite:1]{index=1}
  return json.data?.attributes ?? null;
}

async function fetchTokenInfo(tokenMint) {
  const url = `${GECKO_BASE_URL}/networks/${NETWORK}/tokens/${tokenMint}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!res.ok) {
    console.error('Erro token GeckoTerminal:', res.status, await res.text());
    return null;
  }

  const json = await res.json();
  console.log('Resposta GeckoTerminal (token):', json);

  // token info normalmente vem em json.data.attributes (name, symbol, image_url, websites, etc.) :contentReference[oaicite:2]{index=2}
  return json.data?.attributes ?? null;
}

// Função que será chamada quando a página terminar de carregar (DOM = estrutura de elementos HTML na página)
async function initPage() {
  try {
    const [poolAttrs, tokenAttrs] = await Promise.all([
      fetchPoolData(POOL_ADDRESS),
      fetchTokenInfo(TOKEN_MINT),
    ]);

    // Por enquanto só loga no console para você inspecionar os campos
    console.log('poolAttrs:', poolAttrs);
    console.log('tokenAttrs:', tokenAttrs);

    // Próximo passo: aqui a gente pega poolAttrs / tokenAttrs
    // e coloca dentro dos elementos da direita (liquidity, mkt cap, etc.)
    // usando document.querySelector(...) e textContent.
  } catch (err) {
    console.error('Erro geral ao inicializar página:', err);
  }
}

// Garante que só roda depois que o HTML estiver pronto
document.addEventListener('DOMContentLoaded', initPage);
