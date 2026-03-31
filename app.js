/* =================================================
   CONFIGURAÇÕES E ESTADO GLOBAL
================================================= */
let orcamentosCarregados = [];
let clienteSelecionadoId = null; // ID para novos orçamentos
let clienteHistoricoAtual = null; // Controle para tela de histórico
let nomeHistoricoAtual = null;
let ultimaBuscaId = 0;
let ultimaBuscaHistoricoId = 0;
let ultimaBuscaHistoricoClienteId = 0;
let lajesGlobais = [];
const supabaseClient = window.supabase.createClient(
  "https://dtznxqqcyrzlaijjbwzr.supabase.co",
  "sb_publishable_3UwkzJX1ewfPXb8qAl1E8g_cUSKgI_f"
);
function parseMoeda(valor) {
  if (!valor) return 0;
  return Number(valor.replace(",", "."));
}

async function salvarLajeAdmin(id) {
  const precoInput = document.getElementById(`preco_${id}`).value;
  const custoInput = document.getElementById(`custo_${id}`).value;

  const preco = parseMoeda(precoInput);
  const custo = parseMoeda(custoInput);

  if (!preco || !custo) {
    alert("Valores inválidos.");
    return;
  }

  const { error } = await supabaseClient
    .from("tipos_laje")
    .update({
      preco_venda_m2: preco,
      custo_m2: custo
    })
    .eq("id", id);

  if (error) return alert(error.message);

  alert("Atualizado com sucesso.");
}

async function carregarLajesAdmin() {
  const { data, error } = await supabaseClient
    .from("tipos_laje")
    .select("*")
    .order("nome");

  if (error) return alert(error.message);

  const div = document.getElementById("listaLajes");
  div.innerHTML = "";

  data.forEach(l => {
    div.innerHTML += `
      <div class="card">
        <strong>${l.nome}</strong><br>
        Venda: R$ ${Number(l.preco_venda_m2).toFixed(2)}<br>
        Custo: R$ ${Number(l.custo_m2).toFixed(2)}<br>
        Ativo: ${l.ativo ? "Sim" : "Não"}<br><br>
        <button onclick="editarLaje('${l.id}')">Editar</button>
      </div>
    `;
  });
}

async function carregarProdutosOrcamento() {
  const div = document.getElementById("listaProdutosAvulsos");
  if (!div) return;

  const { data, error } = await supabaseClient
    .from("produtos_avulsos")
    .select("*")
    .order("nome");

  if (error) return;

  div.innerHTML = "";
  data.forEach(p => {
    div.innerHTML += `
      <div class="item-avulso" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding: 10px; border: 1px solid #eee; border-radius: 8px;">
        <span><strong>${p.nome}</strong> (R$ ${p.preco_venda.toFixed(2)})</span>
        <input type="number" 
               class="qtd-avulso" 
               data-id="${p.id}" 
               data-preco="${p.preco_venda}" 
               data-custo="${p.custo}"
               value="0" 
               min="0" 
               style="width: 60px; margin-left: 10px;" 
               oninput="mostrarResultado()">
      </div>
    `;
  });
}

// 1. Carrega a lista com botão "Editar" (Igual às lajes)
async function carregarProdutosAdmin() {
  const { data, error } = await supabaseClient
    .from("produtos_avulsos")
    .select("*")
    .order("nome");

  if (error) return alert(error.message);

  const div = document.getElementById("listaProdutos");
  div.innerHTML = "";

  data.forEach(p => {
    div.innerHTML += `
      <div class="card">
        <strong>${p.nome}</strong><br>
        Venda: R$ ${Number(p.preco_venda).toFixed(2)}<br>
        Custo: R$ ${Number(p.custo).toFixed(2)}<br><br>
        <button onclick="prepararEdicaoProduto('${p.id}', '${p.nome}', '${p.preco_venda}', '${p.custo}')">
          Editar
        </button>
      </div>
    `;
  });
}

// 2. Transforma o card ou abre um formulário para edição
function prepararEdicaoProduto(id, nome, preco, custo) {
  const div = document.getElementById("listaProdutos");
  // Opcional: Você pode limpar a lista e mostrar só o formulário de edição
  div.innerHTML = `
    <div class="card">
      <h3>Editando: ${nome}</h3>
      
      <label>Preço de Venda (m² ou Un)</label><br>
      <input type="number" step="0.01" id="edit_preco_prod" value="${preco}"><br><br>
      
      <label>Custo</label><br>
      <input type="number" step="0.01" id="edit_custo_prod" value="${custo}"><br><br>
      
      <button onclick="salvarProdutoAdmin('${id}')">Salvar Alterações</button>
      <button onclick="carregarProdutosAdmin()" style="background:#666">Cancelar</button>
    </div>
  `;
}

// 3. Salva no Banco de Dados
async function salvarProdutoAdmin(id) {
  const preco = document.getElementById(`edit_preco_prod`).value;
  const custo = document.getElementById(`edit_custo_prod`).value;

  if (!preco || !custo) {
    alert("Por favor, preencha todos os valores.");
    return;
  }

  const { error } = await supabaseClient
    .from("produtos_avulsos")
    .update({
      preco_venda: parseFloat(preco),
      custo: parseFloat(custo)
    })
    .eq("id", id);

  if (error) {
    alert("Erro ao atualizar: " + error.message);
  } else {
    alert("Produto atualizado com sucesso!");
    carregarProdutosAdmin(); // Recarrega a lista original
  }
}


async function protegerPaginaAdmin() {
  const { data: { user } } = await supabaseClient.auth.getUser();

  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const role = user.user_metadata?.role;

  if (role !== "admin") {
    alert("Acesso restrito ao administrador.");
    window.location.href = "orcamento.html";
  }
}
/* =================================================
   FUNÇÃO CENTRAL DE SELEÇÃO (RESOLVE O BALÃO)
================================================= */
// Como estava no seu app.js
async function selecionarCliente(id, nome, whatsapp) {
  const lista = document.getElementById("listaClientes");
  const inputBusca = document.getElementById("cliente_busca");
  const orcamentosDiv = document.getElementById("orcamentos");

  if (lista) { lista.style.display = "none"; lista.innerHTML = ""; }
  if (inputBusca) inputBusca.value = nome;

  clienteSelecionadoId = id;
  nomeHistoricoAtual = nome;

  if (orcamentosDiv) {
    orcamentosDiv.innerHTML = "<p>Buscando orçamentos...</p>";

    const { data: orcamentos, error } = await supabaseClient
      .from("orcamentos")
      .select(`
        *,
        orcamento_ambientes (*, tipos_laje (nome)),
        orcamento_itens (*, produtos_avulsos (nome))
      `)
      .eq("cliente_id", id)
      .order("numero", { ascending: false });

    if (error) {
      console.error(error);
      orcamentosDiv.innerHTML = "Erro ao carregar.";
      return;
    }

    // SALVA NA VARIÁVEL GLOBAL PARA O FILTRO FUNCIONAR
    orcamentosCarregados = orcamentos; 
    renderizarOrcamentos(orcamentos);
  }
}
// --- RENDERIZAÇÃO NA TELA (CONSULTA) ---
function renderizarOrcamentos(orcamentos) {
  const container = document.getElementById("orcamentos");

  if (!orcamentos || orcamentos.length === 0) {
    container.innerHTML = "<p>Nenhum orçamento encontrado.</p>";
    return;
  }

  container.innerHTML = orcamentos.map(orc => `
    <div class="card-orcamento" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      <div style="display: flex; justify-content: space-between; align-items:center; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="margin:0; color:#2c3e50;">Orçamento ${orc.numero || '—'}</h2>
          <small>${new Date(orc.criado_em).toLocaleDateString('pt-BR')}</small>
        </div>
        <button onclick="imprimirOrcamentoPorId('${orc.id}')">
          🖨️ Imprimir 2 Vias
        </button>
      </div>
      
      <hr style="margin:15px 0; border:0; border-top:1px solid #eee;">

      <table style="width:100%; font-size:0.9em; border-collapse: collapse; margin-bottom: 10px;">
        ${orc.orcamento_ambientes.map(amb => `
          <tr>
            <td style="padding:5px 0;"><strong>${amb.nome}</strong> (${amb.tipos_laje?.nome || 'Laje'})</td>
            <td style="text-align:center;">${amb.largura}x${amb.comprimento}</td>
            <td style="text-align:right;">R$ ${amb.subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
          </tr>
        `).join('')}
      </table>

      ${orc.orcamento_itens && orc.orcamento_itens.length > 0 ? `
        <div style="border-top: 1px dashed #eee; pt: 10px; margin-top: 10px;">
          <small style="color: #666; text-transform: uppercase;">Produtos Avulsos</small>
          <table style="width:100%; font-size:0.9em; border-collapse: collapse;">
            ${orc.orcamento_itens.map(item => `
              <tr>
                <td style="padding:5px 0;">${item.quantidade}x ${item.produtos_avulsos?.nome || 'Produto'}</td>
                <td style="text-align:right;">R$ ${(item.quantidade * item.preco_unitario).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}

      <div style="margin-top:15px; padding:12px; background:#f8f9fa; border-radius:5px;">
        <div style="display:flex; justify-content:space-between; font-size: 0.9em; margin-bottom: 5px;">
            <span>Frete:</span>
            <span>R$ ${orc.frete.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; color:#d32f2f; font-size:1.1em;">
          <span>Total Final:</span>
          <span>R$ ${orc.total_final.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// --- FUNÇÃO DE IMPRESSÃO (A4 DIVIDIDO) ---

// --- FUNÇÃO DE IMPRESSÃO (DIVIDE A FOLHA A4) ---
function imprimirOrcamento(orc) {
    const janelaImpressao = window.open('', '_blank');
    
    const clienteNome = orc.clientes?.nome || "Não informado";
    const clienteWhats = orc.clientes?.whatsapp || "Não informado";
    const clienteEnd = orc.endereco_entrega || orc.clientes?.endereco || "Retirada na loja";

    // 🔥 VIA COMPLETA (CLIENTE)
    const viaCompleta = `
        ${header()}
        ${clienteInfo()}

        <table class="tabela-print">
            <thead>
                <tr>
                    <th>Item / Ambiente</th>
                    <th style="text-align:center;">Qtd/Medida</th>
                    <th style="text-align:right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${orc.orcamento_ambientes.map(amb => `
                    <tr>
                        <td><strong>${amb.nome}</strong><br><small>${amb.tipos_laje?.nome || 'Laje'}</small></td>
                        <td style="text-align:center;">${amb.largura}x${amb.comprimento}m<br><small>${amb.qtd_vigas || 0} vigas</small></td>
                        <td style="text-align:right;">R$ ${amb.subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                    </tr>
                `).join('')}

                ${(orc.orcamento_itens || []).map(item => `
                    <tr>
                        <td>${item.produtos_avulsos?.nome || 'Produto'}</td>
                        <td style="text-align:center;">${item.quantidade} un</td>
                        <td style="text-align:right;">R$ ${(item.quantidade * item.preco_unitario).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${resumo(true)}
        ${assinatura()}
    `;

    // 😈 VIA PRODUÇÃO (SEM VALORES)
    const viaProducao = `
        ${header()}
        ${clienteInfo()}

        <table class="tabela-print">
            <thead>
                <tr>
                    <th>Item / Ambiente</th>
                    <th style="text-align:center;">Qtd/Medida</th>
                </tr>
            </thead>
            <tbody>
                ${orc.orcamento_ambientes.map(amb => `
                    <tr>
                        <td><strong>${amb.nome}</strong><br><small>${amb.tipos_laje?.nome || 'Laje'}</small></td>
                        <td style="text-align:center;">${amb.largura}x${amb.comprimento}m<br><small>${amb.qtd_vigas || 0} vigas</small></td>
                    </tr>
                `).join('')}

                ${(orc.orcamento_itens || []).map(item => `
                    <tr>
                        <td>${item.produtos_avulsos?.nome || 'Produto'}</td>
                        <td style="text-align:center;">${item.quantidade} un</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        ${resumo(false)}
        ${assinatura()}
    `;

    // 🔧 COMPONENTES REUTILIZÁVEIS (pra você parar de repetir código igual iniciante)
    function header() {
        return `
            <div class="header-print">
                <img src="https://dtznxqqcyrzlaijjbwzr.supabase.co/storage/v1/object/public/logos/Gemini_Generated_Image_guq5kaguq5kaguq5.png" style="height:60px;">
                <div style="text-align:right">
                    <h2 style="margin:0;">ORÇAMENTO #${orc.numero || orc.id.slice(0,5)}</h2>
                    <p style="margin:2px 0;">${new Date(orc.criado_em).toLocaleDateString('pt-BR')}</p>
                </div>
            </div>
        `;
    }

    function clienteInfo() {
        return `
            <div class="cliente-info">
                <strong>CLIENTE:</strong> ${clienteNome}<br>
                <strong>CONTATO:</strong> ${clienteWhats}<br>
                <strong>ENDEREÇO:</strong> ${clienteEnd}
            </div>
        `;
    }

    function resumo(comValores) {
        if (!comValores) {
            return `<p style="margin-top:10px; font-size:11px;">Pagamento: ${orc.forma_pagamento || 'A combinar'}</p>`;
        }

        return `
            <div class="resumo-print">
                <div class="linha-resumo">
                    <span>Subtotal:</span>
                    <span>R$ ${orc.subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                </div>
                <div class="linha-resumo">
                    <span>Frete:</span>
                    <span>R$ ${orc.frete.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                </div>
                <div class="linha-resumo total">
                    <span>TOTAL:</span>
                    <span>R$ ${orc.total_final.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
                </div>
            </div>
        `;
    }

    function assinatura() {
        return `
            <div style="margin-top:30px; display:flex; justify-content:space-between; font-size:10px;">
                <div style="border-top:1px solid #000; width:45%; text-align:center;">Lajes Brasil</div>
                <div style="border-top:1px solid #000; width:45%; text-align:center;">${clienteNome}</div>
            </div>
        `;
    }

    janelaImpressao.document.write(`
        <html>
        <head>
            <style>
                @page { size: A4; margin: 0; }
                body { font-family: sans-serif; margin: 0; }
                .folha { height: 297mm; display: flex; flex-direction: column; }
                .metade { height: 50%; padding: 12mm; border-bottom: 1px dashed #000; }
                .header-print { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
                .cliente-info { font-size:12px; margin-bottom:10px; }
                .tabela-print { width:100%; border-collapse:collapse; font-size:11px; }
                .tabela-print td, .tabela-print th { border:1px solid #eee; padding:5px; }
                .resumo-print { margin-top:10px; text-align:right; }
                .linha-resumo { display:flex; justify-content:space-between; }
                .total { font-weight:bold; }
            </style>
        </head>
        <body>
            <div class="folha">
                <div class="metade">${viaCompleta}</div>
                <div class="metade">${viaProducao}</div>
            </div>
            <script>
                window.onload = () => setTimeout(() => { window.print(); window.close(); }, 500);
            </script>
        </body>
        </html>
    `);

    janelaImpressao.document.close();
}
/* =================================================
   GESTÃO DE CLIENTES
================================================= */
async function salvarCliente() {
  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;
  const whatsapp = document.getElementById("whatsapp").value;
  const endereco = document.getElementById("endereco").value;

  if (!nome) {
    alert("Nome é obrigatório");
    return;
  }

  const { error } = await supabaseClient
    .from("clientes")
    .insert({ nome, email, whatsapp, endereco });

  if (error) {
    alert(error.message);
    return;
  }

  alert("Cliente salvo com sucesso!");
  location.reload();
}

// Busca usada na tela de "Novo Orçamento"
async function buscarClientes(termo) {
  const lista = document.getElementById("listaClientes");
  if (!lista) return;

  if (!termo || termo.length < 2) {
    lista.innerHTML = "";
    lista.style.display = "none";
    return;
  }

  const apenasNumeros = termo.replace(/\D/g, "");
  let query = supabaseClient.from("clientes").select("id, nome, whatsapp, endereco");

  if (apenasNumeros.length >= 2) {
    query = query.or(`nome.ilike.%${termo}%,whatsapp.ilike.%${apenasNumeros}%`);
  } else {
    query = query.or(`nome.ilike.%${termo}%,whatsapp.ilike.%${termo}%`);
  }

  const { data, error } = await query.order("nome").limit(5);

  if (error) return;

  lista.innerHTML = "";
  if (data && data.length > 0) {
    lista.style.display = "block";
    data.forEach(c => {
      const li = document.createElement("li");
      li.style = "cursor:pointer; padding:10px; border-bottom:1px solid #eee; background:#fff;";
      li.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div>
            <strong style="display:block; color:#333;">${c.nome}</strong>
            <small style="color:#25D366; font-weight:bold;">${c.whatsapp || "Sem número"}</small>
          </div>
        </div>`;
      li.onclick = () => selecionarCliente(c.id, c.nome, c.whatsapp, c.endereco);
      lista.appendChild(li);
    });
    if (window.lucide) lucide.createIcons();
  } else {
    lista.style.display = "none";
  }
}



//Busca usada na tela de "Consulta"
async function buscarClientesConsulta(termo) {
  const lista = document.getElementById("listaClientes");
  if (!lista) return;

  if (!termo || termo.length < 2) {
    lista.innerHTML = "";
    lista.style.display = "none";
    return;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id, nome, whatsapp, endereco")
    .or(`nome.ilike.%${termo}%,whatsapp.ilike.%${termo}%`)
    .order("nome")
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  lista.innerHTML = "";
  lista.style.display = "block";

  data.forEach(c => {
    const li = document.createElement("li");
    li.style = "cursor:pointer; border-bottom:1px solid #eee; background:#fff;";
    li.innerHTML = `
      <div style="padding:12px">
        <strong style="color:var(--primary);">${c.nome}</strong><br>
        <small style="color:#666;">${c.whatsapp || "Sem WhatsApp"}</small>
      </div>`;
    
    li.onclick = () => {
      clienteSelecionadoId = c.id; 
      nomeHistoricoAtual = c.nome;
      document.getElementById("cliente_busca").value = c.nome;
      lista.style.display = "none";
      carregarOrcamentos(c.id, c.nome); 
    };
    lista.appendChild(li);
  });
}
/* =================================================
   LÓGICA DE ORÇAMENTOS (CÁLCULOS E BANCO)
================================================= */
function calcularArea() {
  const largura = Number(document.getElementById("largura")?.value);
  const comprimento = Number(document.getElementById("comprimento")?.value);
  const areaInput = document.getElementById("area");

  if (!largura || !comprimento || largura <= 0 || comprimento <= 0) {
    if (areaInput) areaInput.value = "";
    mostrarResultado();
    return;
  }

  const area = largura * comprimento;
  if (areaInput) areaInput.value = area.toFixed(2);
  mostrarResultado();
}

function calcularTotal() {
  const tipo = document.getElementById("tipo");
  const areaEl = document.getElementById("area");
  const pagamentoEl = document.getElementById("pagamento");
  const freteEl = document.getElementById("frete");

  if (!tipo || !areaEl || !pagamentoEl) return null;

  const precoM2 = Number(tipo.value);
  const area = Number(areaEl.value);
  const pagamento = Number(pagamentoEl.value);
  const frete = Number(freteEl?.value || 0);

  if (!area || area <= 0) return null;

  // 🔹 Subtotal da laje
  const subtotalLaje = precoM2 * area;

  // 🔹 Produtos avulsos selecionados
  const produtosSelecionados = document.querySelectorAll("#produtosAvulsos input:checked");

  let totalProdutos = 0;

  produtosSelecionados.forEach(produto => {
    totalProdutos += Number(produto.value);
  });

  // 🔹 Subtotal geral antes do pagamento
  const subtotal = subtotalLaje + totalProdutos;

  // 🔹 Aplicação da forma de pagamento + frete
  const total = (subtotal * pagamento) + frete;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

// Variáveis globais para armazenar os cálculos temporariamente
let calculoAtual = {
  subtotal: 0,
  custoTotal: 0,
  lucro: 0,
  totalFinal: 0
};


function mostrarResultado() {
  const frete = parseFloat(document.getElementById("frete").value) || 0;
  const multiplicadorPagamento = parseFloat(document.getElementById("pagamento").value) || 1;

  let subtotalLajes = 0;
  let custoLajes = 0;
  let areaTotal = 0;

  const ambientes = document.querySelectorAll(".ambiente");

  if (ambientes.length === 0) {
    document.getElementById("resultado").innerHTML = "Adicione pelo menos um ambiente.";
    return;
  }

  ambientes.forEach(div => {
    const largura = parseFloat(div.querySelector(".amb-largura")?.value) || 0;
    const comprimento = parseFloat(div.querySelector(".amb-comprimento")?.value) || 0;
    const lajeId = div.querySelector(".amb-laje")?.value;
    const spanVigas = div.querySelector(".amb-qtd-vigas");

    const area = largura * comprimento;
    if (!lajeId) return;

    const laje = lajesGlobais.find(l => l.id == lajeId);
    if (!laje) return;

    // --- LÓGICA DE CÁLCULO DE VIGAS BASEADA NO SEU INSERT ---
    let qtdVigas = 0;
    const nomeLaje = laje.nome.toLowerCase();

    if (nomeLaje.includes("painel treliçado")) {
      // Regra: largura * 4
      qtdVigas = largura * 4;
    } 
    else if (nomeLaje.includes("convencional")) {
      // Regra: largura * 2.94 (para isopor ou cerâmica)
      qtdVigas = largura * 2.94;
    } 
    else if (nomeLaje.includes("treliça") && nomeLaje.includes("isopor")) {
      // Regra: largura / 0.47
      qtdVigas = largura / 0.47;
    } 
    else if (nomeLaje.includes("treliça") && nomeLaje.includes("cerâmica")) {
      // Regra: largura / 0.37
      qtdVigas = largura / 0.37;
    }

    // Atualiza o contador de vigas no card do ambiente
    if (spanVigas) {
      spanVigas.innerText = Math.ceil(qtdVigas);
    }

    // Cálculos Financeiros
    const subtotal = area * laje.preco_venda_m2;
    const custo = area * laje.custo_m2;

    subtotalLajes += subtotal;
    custoLajes += custo;
    areaTotal += area;
  });

  // 🔹 PRODUTOS AVULSOS
  let totalAvulsosVenda = 0;
  let totalAvulsosCusto = 0;
  document.querySelectorAll(".qtd-avulso").forEach(input => {
    const qtd = parseInt(input.value) || 0;
    const preco = parseFloat(input.dataset.preco) || 0;
    const custo = parseFloat(input.dataset.custo) || 0;
    totalAvulsosVenda += qtd * preco;
    totalAvulsosCusto += qtd * custo;
  });

  const subtotalGeral = subtotalLajes + totalAvulsosVenda;
  const totalFinal = (subtotalGeral + frete) * multiplicadorPagamento;
  const custoTotal = custoLajes + totalAvulsosCusto;
  const lucro = totalFinal - custoTotal;

  calculoAtual = {
    subtotal: subtotalGeral,
    custoTotal: custoTotal,
    lucro: lucro,
    totalFinal: totalFinal
  };

  document.getElementById("resultado").innerHTML = `
    <div style="text-align:left;font-size:0.9em">
      Área total: <strong>${areaTotal.toFixed(2)} m²</strong><br>
      Lajes: R$ ${subtotalLajes.toLocaleString('pt-BR',{minimumFractionDigits:2})}<br>
      Produtos: R$ ${totalAvulsosVenda.toLocaleString('pt-BR',{minimumFractionDigits:2})}<br>
      Frete: R$ ${frete.toLocaleString('pt-BR',{minimumFractionDigits:2})}
    </div>
    <hr>
    <div style="font-size:1.2em;color:var(--primary)">
      Total: <strong>R$ ${totalFinal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
    </div>
  `;
}


async function salvarOrcamento() {
  if (!clienteSelecionadoId) {
    return alert("Selecione um cliente antes de salvar.");
  }

  try {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "index.html";
      return;
    }

    const frete = parseFloat(document.getElementById("frete").value) || 0;
    const pagamentoIdx = document.getElementById("pagamento").value;
    const multiplicadorPagamento = parseFloat(pagamentoIdx) || 1;
    const dataEntrega = document.getElementById("data").value;
    const enderecoEntrega = document.getElementById("endereco_entrega").value;

    const ambientes = document.querySelectorAll(".ambiente");
    if (ambientes.length === 0) {
      return alert("Adicione pelo menos um ambiente.");
    }

    let subtotalLajes = 0;
    let custoLajes = 0;
    let metragemTotal = 0;
    const dadosAmbientes = [];

    // 1️⃣ COLETAR DADOS DOS AMBIENTES (LAJES)
    for (const div of ambientes) {
      const nome = div.querySelector(".amb-nome").value || "Ambiente";
      const largura = parseFloat(div.querySelector(".amb-largura").value) || 0;
      const comprimento = parseFloat(div.querySelector(".amb-comprimento").value) || 0;
      const lajeId = div.querySelector(".amb-laje").value;
      const qtdVigas = parseFloat(div.querySelector(".amb-qtd-vigas")?.innerText) || 0;

      const area = largura * comprimento;
      metragemTotal += area;
      
      const laje = lajesGlobais.find(l => l.id == lajeId);
      if (!laje) continue;

      const subtotalAmbiente = area * laje.preco_venda_m2;
      const custoAmbiente = area * laje.custo_m2;

      subtotalLajes += subtotalAmbiente;
      custoLajes += custoAmbiente;

      dadosAmbientes.push({
        nome,
        largura,
        comprimento,
        area,
        tipo_laje_id: lajeId,
        subtotal: subtotalAmbiente,
        custo: custoAmbiente,
        lucro: subtotalAmbiente - custoAmbiente,
        qtd_vigas: qtdVigas
      });
    }

    // 2️⃣ COLETAR PRODUTOS AVULSOS
    let totalAvulsosVenda = 0;
    let totalAvulsosCusto = 0;
    const dadosItens = [];
    const inputsProdutos = document.querySelectorAll(".qtd-avulso");

    inputsProdutos.forEach(input => {
      const qtd = parseInt(input.value) || 0;
      if (qtd > 0) {
        const precoVenda = parseFloat(input.dataset.preco) || 0;
        const custoUnitario = parseFloat(input.dataset.custo) || 0;
        
        totalAvulsosVenda += qtd * precoVenda;
        totalAvulsosCusto += qtd * custoUnitario;

        dadosItens.push({
          produto_id: input.dataset.id,
          quantidade: qtd,
          preco_unitario: precoVenda
        });
      }
    });

    // 3️⃣ CÁLCULOS FINAIS
    const subtotalGeral = subtotalLajes + totalAvulsosVenda;
    const totalFinal = (subtotalGeral + frete) * multiplicadorPagamento;
    const custoTotalGeral = custoLajes + totalAvulsosCusto;
    const lucroFinal = totalFinal - custoTotalGeral;

    // 4️⃣ SALVAR CABEÇALHO DO ORÇAMENTO
    const { data: orcamentoCriado, error: erroOrc } = await supabaseClient
      .from("orcamentos")
      .insert({
        cliente_id: clienteSelecionadoId,
        usuario_id: user.id,
        metragem_calculada: metragemTotal,
        subtotal: subtotalGeral,
        total_final: totalFinal,
        custo_total: custoTotalGeral,
        lucro: lucroFinal,
        frete: frete,
        forma_pagamento: pagamentoIdx === "1" ? "À vista" : "Parcelado",
        data_entrega: dataEntrega || null,
        endereco_entrega: enderecoEntrega || null,
        status: "PENDENTE",
        validade: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
      })
      .select()
      .single();

    if (erroOrc) throw erroOrc;

    // 5️⃣ SALVAR OS AMBIENTES
    for (const amb of dadosAmbientes) {
      const { error: erroAmb } = await supabaseClient
        .from("orcamento_ambientes")
        .insert({
          orcamento_id: orcamentoCriado.id,
          ...amb
        });
      if (erroAmb) console.error("Erro ao salvar ambiente:", erroAmb);
    }

    // 6️⃣ SALVAR OS ITENS AVULSOS
    for (const item of dadosItens) {
      const { error: erroItem } = await supabaseClient
        .from("orcamento_itens")
        .insert({
          orcamento_id: orcamentoCriado.id,
          ...item
        });
      if (erroItem) console.error("Erro ao salvar item avulso:", erroItem);
    }

    alert("Orçamento salvo com sucesso!");
    window.location.href = "consulta.html";

  } catch (err) {
    console.error("Erro ao salvar orçamento:", err);
    alert("Erro técnico: " + (err.message || "Falha na conexão com o banco"));
  }
}

async function carregarOrcamentos(clienteId, nomeCliente) {
  const div = document.getElementById("orcamentos");
  
  // Captura os valores dos filtros da tela
  const statusFiltro = document.getElementById("filtroStatus")?.value;
  const dataInicio = document.getElementById("dataInicio")?.value;
  const dataFim = document.getElementById("dataFim")?.value;

  let query = supabaseClient
    .from("orcamentos")
    .select(`
      *,
      clientes (nome, whatsapp, endereco),
      orcamento_ambientes (*, tipos_laje (nome)),
      orcamento_itens (*, produtos_avulsos (nome))
    `)
    .order("criado_em", { ascending: false });

  // Aplica os filtros na Query do Supabase
  if (clienteId) query = query.eq("cliente_id", clienteId);
  if (statusFiltro) query = query.eq("status", statusFiltro);
  
  if (dataInicio) {
    // Ajusta para o início do dia
    query = query.gte("criado_em", `${dataInicio}T00:00:00`);
  }
  if (dataFim) {
    // Ajusta para o fim do dia
    query = query.lte("criado_em", `${dataFim}T23:59:59`);
  }

  const { data, error } = await query;

  if (error) {
    console.error(error);
    div.innerHTML = "Erro ao carregar orçamentos.";
    return;
  }

  // Renderiza os resultados (use sua função de renderizarOrcamentos ou o loop interno)
  renderizarOrcamentos(data); 
}
/* =================================================
   HISTÓRICO E ARQUIVAMENTO
================================================= */
async function arquivarOrcamento(id, clienteId, nomeCliente) {
  if (!confirm("Deseja mover este orçamento para o histórico?")) return;

  const { error } = await supabaseClient
    .from("orcamentos")
    .update({ status: "ARQUIVADO" })
    .eq("id", id);

  if (error) return alert("Erro: " + error.message);

  // Atualiza lista automaticamente
  carregarOrcamentos(clienteId, nomeCliente);
}
async function carregarHistorico(clienteId, nomeCliente) {
  clienteHistoricoAtual = clienteId;
  nomeHistoricoAtual = nomeCliente;

  const div = document.getElementById("orcamentos");
  div.innerHTML = "<p>Carregando histórico completo...</p>";

  // 🔹 BUSCA ANINHADA: Orçamento + Ambientes + Itens Avulsos
  const { data: orcamentos, error } = await supabaseClient
    .from("orcamentos")
    .select(`
      *,
      orcamento_ambientes (
        *,
        tipos_laje (nome)
      ),
      orcamento_itens (
        *,
        produtos_avulsos (nome)
      )
    `)
    .eq("cliente_id", clienteId)
    .eq("status", "ARQUIVADO")
    .order("criado_em", { ascending: false });

  if (error) {
    console.error("Erro Supabase:", error);
    div.innerHTML = "Erro ao carregar dados.";
    return;
  }

  if (!orcamentos || orcamentos.length === 0) {
    div.innerHTML = `<h2>Histórico de ${nomeCliente}</h2><p>Nenhum orçamento arquivado.</p>`;
    return;
  }

  let html = `<h2>Histórico de ${nomeCliente}</h2>`;

  orcamentos.forEach(o => {
    const dataF = new Date(o.criado_em).toLocaleDateString("pt-BR");

    html += `
      <div class="card" style="margin-top:20px; border-top: 4px solid #444; background: #fff; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px">
          <strong>Orçamento #${o.id.slice(0,5)}</strong>
          <span style="font-size:0.8em; color:#666">${dataF}</span>
        </div>

        <div style="margin-bottom:15px">
          <div style="font-weight:bold; font-size:0.85em; border-bottom:1px solid #eee; margin-bottom:5px; color:var(--primary)">
            LAJES E VIGAS
          </div>
          <table style="width:100%; font-size:0.85em;">
            ${o.orcamento_ambientes.map(amb => `
              <tr>
                <td>${amb.nome} (${amb.tipos_laje?.nome})</td>
                <td style="text-align:center"><strong>${amb.qtd_vigas || 0} un de vigas</strong></td>
                <td style="text-align:right">R$ ${amb.subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
              </tr>
            `).join('')}
          </table>
        </div>

        ${o.orcamento_itens && o.orcamento_itens.length > 0 ? `
          <div style="margin-bottom:15px">
            <div style="font-weight:bold; font-size:0.85em; border-bottom:1px solid #eee; margin-bottom:5px; color:#c2780e">
              PRODUTOS ADICIONAIS
            </div>
            <table style="width:100%; font-size:0.85em;">
              ${o.orcamento_itens.map(item => `
                <tr>
                  <td>${item.quantidade}x ${item.produtos_avulsos?.nome || 'Produto'}</td>
                  <td style="text-align:right">R$ ${(item.quantidade * item.preco_unitario).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        ` : ''}

        <div style="background:#f8f9fa; padding:10px; border-radius:4px; font-size:0.9em">
          <div style="display:flex; justify-content:space-between">
            <span>Frete:</span>
            <span>R$ ${o.frete.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
          </div>
          <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.1em; color:var(--primary); border-top:1px solid #ddd; margin-top:5px; padding-top:5px">
            <span>TOTAL:</span>
            <span>R$ ${o.total_final.toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
          </div>
          <div style="display:flex; justify-content:space-between; color:green; font-size:0.8em; margin-top:5px">
            <span>Lucro Líquido:</span>
            <span>R$ ${o.lucro ? o.lucro.toLocaleString('pt-BR',{minimumFractionDigits:2}) : '0,00'}</span>
          </div>
        </div>

        <div style="margin-top:10px; display:flex; gap:10px">
          <button onclick="restaurarOrcamento('${o.id}')" style="flex:1; background:#666">Restaurar</button>
          <button onclick="window.print()" style="flex:1">Imprimir</button>
        </div>
      </div>
    `;
  });

  div.innerHTML = html;
}

async function restaurarOrcamento(id) {
  const { error } = await supabaseClient
    .from("orcamentos")
    .update({ status: "PENDENTE" })
    .eq("id", id);

  if (error) return alert(error.message);

  alert("Orçamento restaurado!");

  // Atualiza histórico automaticamente
  if (clienteHistoricoAtual) {
    carregarHistorico(clienteHistoricoAtual, nomeHistoricoAtual);
  }
}

/* =================================================
   SISTEMA DE AUTENTICAÇÃO
================================================= */
async function loginAdmin() {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) return alert("Login inválido");
  window.location.href = "orcamento.html";
}


async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

async function carregarLajes(){

  const { data, error } = await supabaseClient
    .from("tipos_laje")
    .select("*")
    .eq("ativo", true)

  if (error) {
    console.error(error)
    return
  }

  lajesGlobais = data
}

async function buscarClientesHistorico(nome) {
  const lista = document.getElementById("listaClientes");
  const input = document.getElementById("cliente_busca");

  if (!nome || nome.length < 2) {
    lista.innerHTML = "";
    lista.style.display = "none";
    return;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id, nome, whatsapp")
    .ilike("nome", `%${nome}%`)
    .order("nome")
    .limit(5);

  if (error || !data) return;

  lista.style.display = "block";
  lista.innerHTML = "";

  if (data.length === 0) {
    lista.innerHTML = "<li style='padding:12px'>Nenhum cliente encontrado</li>";
    return;
  }

  data.forEach(c => {
    const li = document.createElement("li");

    li.innerHTML = `
      <div style="padding:10px">
        <strong>${c.nome}</strong><br>
        <small>WhatsApp: ${c.whatsapp || "Não informado"}</small>
      </div>
    `;

    li.style.cursor = "pointer";
    li.style.borderBottom = "1px solid #eee";

    li.onclick = () => {
      // Preenche o input com o nome selecionado
      if (input) input.value = c.nome;

      // Esconde a lista
      lista.innerHTML = "";
      lista.style.display = "none";

      // Carrega o histórico
      carregarHistorico(c.id, c.nome);
    };

    lista.appendChild(li);
  });
}

// Exemplo de como renderizar o card com os novos status
function renderizarOrcamentos(orcamentos) {
  const container = document.getElementById("orcamentos");

  if (!orcamentos || orcamentos.length === 0) {
    container.innerHTML = "<p>Nenhum orçamento encontrado.</p>";
    return;
  }

  container.innerHTML = orcamentos.map(orc => `
    <div class="card-orcamento" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      
      <div style="display: flex; justify-content: space-between; align-items:flex-start; flex-wrap: wrap; gap: 10px;">
        <div>
          <h2 style="margin:0; color:#2c3e50;">Orçamento ${orc.numero || '—'}</h2>
          <strong style="display:block; color:#555; font-size:0.9em; margin-top:3px;">
            Cliente: ${orc.clientes?.nome || 'Não identificado'}
          </strong>
          <small style="color:#888;">${new Date(orc.criado_em).toLocaleDateString('pt-BR')}</small>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px; align-items:flex-end;">
          <select onchange="mudarStatus('${orc.id}', this.value)" 
                  style="padding:5px; border-radius:4px; border:1px solid #ccc; font-weight:bold; background:#f9f9f9; cursor:pointer;">
            <option value="PENDENTE" ${orc.status === "PENDENTE" ? "selected" : ""}>Pendente</option>
            <option value="EM_PRODUCAO" ${orc.status === "EM_PRODUCAO" ? "selected" : ""}>Em Produção</option>
            <option value="PRODUZIDO" ${orc.status === "PRODUZIDO" ? "selected" : ""}>Produzido</option>
            <option value="ENTREGUE" ${orc.status === "ENTREGUE" ? "selected" : ""}>Entregue</option>
            <option value="CANCELADO" ${orc.status === "CANCELADO" ? "selected" : ""}>Cancelado</option>
            <option value="ARQUIVADO" ${orc.status === "ARQUIVADO" ? "selected" : ""}>Arquivado</option>
          </select>

          <button onclick="imprimirOrcamentoPorId('${orc.id}')" 
                  style="background:#007bff; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer; font-weight:bold; display:flex; align-items:center; gap:5px;">
            🖨️ Imprimir 2 Vias
          </button>
        </div>
      </div>
      
      <hr style="margin:15px 0; border:0; border-top:1px solid #eee;">

      <table style="width:100%; font-size:0.9em; border-collapse: collapse; margin-bottom: 10px;">
        <thead>
          <tr style="text-align:left; color:#777; font-size:0.8em; border-bottom: 1px solid #eee;">
            <th style="padding-bottom:5px;">Ambiente</th>
            <th style="text-align:center; padding-bottom:5px;">Medidas</th>
            <th style="text-align:right; padding-bottom:5px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${orc.orcamento_ambientes.map(amb => `
            <tr>
              <td style="padding:8px 0; border-bottom:1px solid #f9f9f9;">
                <strong>${amb.nome}</strong><br>
                <small style="color:#666;">${amb.tipos_laje?.nome || 'Laje'}</small>
              </td>
              <td style="text-align:center; border-bottom:1px solid #f9f9f9;">${amb.largura}x${amb.comprimento}m</td>
              <td style="text-align:right; border-bottom:1px solid #f9f9f9;">R$ ${Number(amb.subtotal).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${orc.orcamento_itens && orc.orcamento_itens.length > 0 ? `
        <div style="border-top: 1px dashed #eee; padding-top: 10px; margin-top: 10px;">
          <small style="color: #666; text-transform: uppercase; font-weight:bold; font-size:0.75em;">Produtos Avulsos</small>
          <table style="width:100%; font-size:0.9em; border-collapse: collapse;">
            ${orc.orcamento_itens.map(item => `
              <tr>
                <td style="padding:5px 0;">${item.quantidade}x ${item.produtos_avulsos?.nome || 'Produto'}</td>
                <td style="text-align:right;">R$ ${Number(item.quantidade * item.preco_unitario).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` : ''}

      <div style="margin-top:15px; padding:12px; background:#f8f9fa; border-radius:5px; border:1px solid #eee;">
        <div style="display:flex; justify-content:space-between; font-size: 0.9em; margin-bottom: 5px; color:#555;">
            <span>Custo de Frete:</span>
            <span>R$ ${Number(orc.frete).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; color:#d32f2f; font-size:1.15em; border-top: 1px solid #ddd; padding-top:5px; margin-top:5px;">
          <span>VALOR TOTAL:</span>
          <span>R$ ${Number(orc.total_final).toLocaleString('pt-BR',{minimumFractionDigits:2})}</span>
        </div>
      </div>
    </div>
  `).join('');
}

async function mudarStatus(id, novoStatus) {
  const { error } = await supabaseClient
    .from("orcamentos")
    .update({ status: novoStatus })
    .eq("id", id);

  if (error) return alert(error.message);
  // Em vez de recarregar a página toda, chama a busca novamente
  carregarOrcamentos(clienteSelecionadoId, nomeHistoricoAtual);
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

async function carregarLajes() {
  const { data, error } = await supabaseClient
    .from("tipos_laje")
    .select("*")
    .eq("ativo", true);
  if (!error) lajesGlobais = data;
}

// Esta função deve ser a ÚLTIMA do arquivo. Remova qualquer "}" que sobrar abaixo dela.
async function imprimirOrcamentoPorId(id) {
  const { data: orc, error } = await supabaseClient
    .from("orcamentos")
    .select(`
      *,
      clientes (nome, whatsapp, endereco),
      orcamento_ambientes (*, tipos_laje (nome)),
      orcamento_itens (*, produtos_avulsos (nome))
    `)
    .eq("id", id)
    .single();

  if (error || !orc) return alert("Erro ao carregar orçamento");
  imprimirOrcamento(orc);
}

async function atualizarObservacao(id, texto) {
  const { error } = await supabaseClient
    .from("orcamentos")
    .update({ observacao: texto })
    .eq("id", id);

  if (error) console.error("Erro ao salvar observação:", error.message);
}

function adicionarAmbiente() {
  const container = document.getElementById("listaAmbientes");
  const id = Date.now(); // ID único para os campos

  const div = document.createElement("div");
  div.className = "ambiente card"; // Ajuste conforme seu CSS
div.innerHTML = `
  <div class="linha-ambiente">
    
    <input type="text" class="amb-nome" placeholder="Ambiente">

    <input type="number" class="amb-largura" placeholder="Largura (m)" oninput="mostrarResultado()">
    
    <input type="number" class="amb-comprimento" placeholder="Comprimento (m)" oninput="mostrarResultado()">

    <select class="amb-laje" onchange="mostrarResultado()">
      <option value="">Laje</option>
      ${lajesGlobais.map(l => `<option value="${l.id}">${l.nome}</option>`).join('')}
    </select>

    <button type="button" class="btn-remover" onclick="this.closest('.ambiente').remove(); mostrarResultado()">✕</button>

  </div>

  <div class="info-vigas">
    Vigas necessárias: <span class="amb-qtd-vigas">0</span>
  </div>
`;
  container.appendChild(div);
}
function calcularAreaAmbientes(){

let areaTotal = 0

document.querySelectorAll(".ambiente").forEach(div => {

const largura = parseFloat(div.querySelector(".amb-largura").value) || 0
const comprimento = parseFloat(div.querySelector(".amb-comprimento").value) || 0

areaTotal += largura * comprimento

})

document.getElementById("area").value = areaTotal.toFixed(2)

mostrarResultado()

}

function montarDescricaoAmbientes(){

let lista = []

document.querySelectorAll(".ambiente").forEach(div => {

const nome = div.querySelector(".amb-nome").value
const largura = parseFloat(div.querySelector(".amb-largura").value) || 0
const comprimento = parseFloat(div.querySelector(".amb-comprimento").value) || 0

const area = largura * comprimento

if(nome){
lista.push(`${nome} (${area.toFixed(2)}m²)`)
}

})

return lista.join(", ")

}

function calcularAmbientes(){

let total = 0
let custoTotal = 0

document.querySelectorAll(".ambiente").forEach(div => {

const largura = parseFloat(div.querySelector(".amb-largura").value) || 0
const comprimento = parseFloat(div.querySelector(".amb-comprimento").value) || 0
const lajeId = div.querySelector(".amb-laje").value

const area = largura * comprimento

const laje = lajesGlobais.find(l => l.id == lajeId)

if(laje){

total += area * laje.preco_venda_m2
custoTotal += area * laje.custo_m2

}

})

console.log("Venda:", total)
console.log("Custo:", custoTotal)

}

// No arquivo app.js
function filtrarOrcamentos() {
  // Pegamos o ID do cliente que já está selecionado na tela
  const clienteId = clienteSelecionadoId; 
  const nomeCliente = nomeHistoricoAtual;

  // Se não houver cliente selecionado, a busca pode ser geral ou exigir um cliente
  if (!clienteId) {
    console.log("Selecione um cliente primeiro ou remova essa trava para busca geral");
  }

  // Chamamos a função que já faz a query no Supabase, ela já trata status e datas
  carregarOrcamentos(clienteId, nomeCliente);
}

async function imprimirOrcamentoPorId(id) {

  const { data: orc, error } = await supabaseClient
    .from("orcamentos")
    .select(`
      *,
      clientes (nome, whatsapp, endereco),
      orcamento_ambientes (
        *,
        tipos_laje (nome)
      ),
      orcamento_itens (
        *,
        produtos_avulsos (nome)
      )
    `)
    .eq("id", id)
    .single();

  if (error || !orc) {
    alert("Erro ao carregar orçamento");
    return;
  }

  imprimirOrcamento(orc)
};