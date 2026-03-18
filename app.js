/* =================================================
   CONFIGURAÇÕES E ESTADO GLOBAL
================================================= */
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
async function selecionarCliente(id, nome, whatsapp) {
  // Identifica os elementos das diferentes telas (Novo Orçamento vs Consulta)
  const lista = document.getElementById("listaClientes");
  const inputBusca = document.getElementById("cliente_nome") || document.getElementById("cliente_busca");
  const inputWhats = document.getElementById("whatsapp");
  const orcamentosDiv = document.getElementById("orcamentos");

  // 1. Limpa a lista de sugestões
  if (lista) {
    lista.style.display = "none";
    lista.innerHTML = "";
  }

  // 2. Preenche o Nome no campo de busca
  if (inputBusca) {
    inputBusca.value = nome;
  }

  // 3. ⚡ PREENCHIMENTO AUTOMÁTICO DO WHATSAPP
  if (inputWhats && whatsapp) {
    inputWhats.value = whatsapp;
  }

  // 4. Define o ID global para ser usado no salvarOrcamento()
  clienteSelecionadoId = id; 
  console.log("Cliente selecionado:", nome, "ID:", id);

  // 5. Se estiver na tela de CONSULTA (onde existe a div 'orcamentos')
  if (orcamentosDiv) {
    orcamentosDiv.innerHTML = "<p>Buscando orçamentos...</p>";
    
    const { data: orcamentos, error } = await supabaseClient
      .from("orcamentos")
      .select(`
        *,
        orcamento_ambientes (
          *,
          tipos_laje (nome)
        )
      `)
      .eq("cliente_id", id)
      .eq("status", "PENDENTE") // Filtra apenas os que não foram arquivados/aprovados
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar orçamentos:", error);
      orcamentosDiv.innerHTML = "Erro ao carregar.";
      return;
    }

    // Chama a função que desenha os cards na tela
    renderizarOrcamentos(orcamentos);
  }
}

function renderizarOrcamentos(orcamentos) {
  const container = document.getElementById("orcamentos");
  
  if (!orcamentos || orcamentos.length === 0) {
    container.innerHTML = "<p>Nenhum orçamento encontrado para este cliente.</p>";
    return;
  }

  container.innerHTML = orcamentos.map(orc => `
    <div class="card-orcamento" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; background: #fff;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <h2 style="margin:0; color:var(--primary)">Orçamento #${orc.id.slice(0,5)}</h2>
          <small>Data: ${new Date(orc.criado_em).toLocaleDateString('pt-BR')}</small>
        </div>
        <span class="status-badge status-${orc.status.toLowerCase()}" 
              style="padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; background: #e0e0e0;">
          ${orc.status}
        </span>
      </div>

      <hr style="margin: 15px 0; border: 0; border-top: 1px solid #eee;">

      <h3 style="font-size: 1em; margin-bottom: 10px;"><i data-lucide="layers"></i> Ambientes e Vigas</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
        <thead>
          <tr style="text-align: left; border-bottom: 2px solid #eee;">
            <th style="padding: 5px;">Local</th>
            <th>Laje</th>
            <th>Medidas</th>
            <th>Vigas</th>
            <th style="text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${orc.orcamento_ambientes.map(amb => `
            <tr style="border-bottom: 1px solid #f9f9f9;">
              <td style="padding: 8px 5px;">${amb.nome}</td>
              <td>${amb.tipos_laje?.nome || 'N/A'}</td>
              <td>${amb.largura}x${amb.comprimento}m</td>
              <td style="font-weight: bold; color: #d32f2f;">${amb.qtd_vigas || 0} un</td>
              <td style="text-align: right;">R$ ${amb.subtotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="margin-top: 15px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Metragem Total:</span>
          <strong>${orc.metragem_calculada.toFixed(2)} m²</strong>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span>Frete:</span>
          <strong>R$ ${orc.frete.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
        </div>
        <div style="display: flex; justify-content: space-between; color: var(--primary); font-size: 1.1em;">
          <span><strong>Total Final (${orc.forma_pagamento}):</strong></span>
          <strong>R$ ${orc.total_final.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong>
        </div>
      </div>
      
      ${orc.endereco_entrega ? `
        <p style="font-size: 0.85em; margin-top: 10px; color: #666;">
          <i data-lucide="map-pin" style="width:14px"></i> Entrega: ${orc.endereco_entrega}
        </p>
      ` : ''}
    </div>
  `).join('');

  // Reinicializa os ícones da Lucide nos novos cards
  lucide.createIcons();
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
    .insert({
      nome,
      email,
      whatsapp,
      endereco
    });

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

  // Só busca se tiver 2 ou mais caracteres
  if (!termo || termo.length < 2) {
    lista.innerHTML = "";
    lista.style.display = "none";
    return;
  }

  // 🔍 BUSCA DUPLA: Nome OU WhatsApp
  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id, nome, whatsapp")
    .or(`nome.ilike.%${termo}%,whatsapp.ilike.%${termo}%`) 
    .order("nome")
    .limit(5);

  if (error) {
    console.error("Erro na busca:", error);
    return;
  }

  lista.innerHTML = "";
  
  if (data && data.length > 0) {
    lista.style.display = "block";
    data.forEach(c => {
      const li = document.createElement("li");
      li.style.cursor = "pointer";
      li.style.padding = "10px";
      li.style.borderBottom = "1px solid #eee";
      
      // Mostra Nome e WhatsApp na listinha de sugestão
      li.innerHTML = `
        <strong>${c.nome}</strong><br>
        <small style="color:#25D366">
          <i data-lucide="phone" style="width:12px; height:12px; display:inline-block"></i> 
          ${c.whatsapp || "Sem número"}
        </small>
      `;

      // Ao clicar, envia ID, Nome e o WhatsApp para preencher os campos
      li.onclick = () => selecionarCliente(c.id, c.nome, c.whatsapp);
      lista.appendChild(li);
    });
    
    if (window.lucide) lucide.createIcons();
  } else {
    lista.style.display = "none";
  }
}
// Busca usada na tela de "Consulta"
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

    li.innerHTML = `
      <div style="padding:10px">
        <strong>${c.nome}</strong><br>
        <small>WhatsApp: ${c.whatsapp || "Não informado"}</small><br>
        <small>Endereço: ${c.endereco || "Não informado"}</small>
      </div>
    `;

    li.style.cursor = "pointer";
    li.style.borderBottom = "1px solid #eee";

    li.onclick = () => selecionarCliente(c.id, c.nome);

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

  // Busca orçamentos PENDENTES com detalhes dos ambientes e nomes das lajes
  const { data, error } = await supabaseClient
    .from("orcamentos")
    .select(`
      *,
      orcamento_ambientes (
        *,
        tipos_laje (nome)
      )
    `)
    .eq("cliente_id", clienteId)
    .eq("status", "PENDENTE")
    .order("criado_em", { ascending: false });

  if (error) {
    div.innerHTML = "Erro ao carregar orçamentos.";
    return;
  }

  let html = `<h2>${nomeCliente}</h2>`;

  if (!data || data.length === 0) {
    html += "<p>Nenhum orçamento pendente encontrado.</p>";
    div.innerHTML = html;
    return;
  }

  data.forEach(o => {
    const dataFormatada = new Date(o.criado_em).toLocaleDateString("pt-BR");

    html += `
      <div class="card-orcamento" style="border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; background: #fff;">
        <div style="display: flex; justify-content: space-between;">
          <strong>Orçamento #${o.id.slice(0,5)}</strong>
          <span style="color:orange; font-weight:bold">${o.status}</span>
        </div>
        <small>Criado em: ${dataFormatada}</small>
        
        <table style="width: 100%; margin-top:10px; font-size: 0.85em; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #eee; text-align:left;">
            <th>Ambiente</th>
            <th>Vigas</th>
            <th style="text-align:right">Subtotal</th>
          </tr>
          ${o.orcamento_ambientes.map(amb => `
            <tr>
              <td>${amb.nome} <br><small>${amb.tipos_laje?.nome || ''}</small></td>
              <td><strong>${amb.qtd_vigas || 0} un</strong></td>
              <td style="text-align:right">R$ ${amb.subtotal.toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
            </tr>
          `).join('')}
        </table>

        <div style="margin-top:10px; padding:10px; background:#f9f9f9; border-radius:5px;">
          <strong>Total: R$ ${Number(o.total_final).toLocaleString('pt-BR',{minimumFractionDigits:2})}</strong>
        </div>

        <div style="margin-top:10px; display:flex; gap:10px">
          <button onclick="arquivarOrcamento('${o.id}', '${clienteId}', '${nomeCliente}')" style="background:#666">
            Arquivar
          </button>
          <button onclick="window.print()" style="background:var(--primary)">Imprimir</button>
        </div>
      </div>
    `;
  });

  div.innerHTML = html;
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
function renderizarCardOrcamento(o) {
  return `
    <div class="card">
      <strong>Status: ${o.status}</strong><br>
      <p>Cliente: ${o.cliente_nome}</p>
      
      <label>Observações:</label>
      <textarea id="obs_${o.id}" onchange="atualizarObservacao('${o.id}', this.value)">${o.observacao || ''}</textarea>
      
      <div class="acoes">
        ${o.status === 'PENDENTE' ? `<button onclick="mudarStatus('${o.id}', 'EM_PRODUCAO')">Iniciar Produção</button>` : ''}
        ${o.status === 'EM_PRODUCAO' ? `<button onclick="mudarStatus('${o.id}', 'PRODUZIDO')">Finalizar Produção</button>` : ''}
        ${o.status === 'PRODUZIDO' ? `<button onclick="mudarStatus('${o.id}', 'ENTREGUE')">Confirmar Entrega</button>` : ''}
      </div>
    </div>
  `;
}

async function mudarStatus(id, novoStatus) {
  const { error } = await supabaseClient
    .from("orcamentos")
    .update({ status: novoStatus })
    .eq("id", id);

  if (error) return alert(error.message);
  location.reload(); // Recarrega para atualizar a lista
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
    <input type="text" class="amb-nome" placeholder="Nome do Ambiente (ex: Sala)">
    
    <label>Largura (m)</label>
    <input type="number" class="amb-largura" oninput="mostrarResultado()">
    
    <label>Comprimento (m)</label>
    <input type="number" class="amb-comprimento" oninput="mostrarResultado()">

    <label>Tipo de Laje</label>
    <select class="amb-laje" onchange="mostrarResultado()">
      <option value="">Selecione...</option>
      ${lajesGlobais.map(l => `<option value="${l.id}">${l.nome}</option>`).join('')}
    </select>

    <div class="info-vigas" style="margin-top:10px; font-weight:bold; color: var(--primary)">
      Vigas necessárias: <span class="amb-qtd-vigas">0</span>
    </div>
    
    <button type="button" onclick="this.parentElement.remove(); mostrarResultado()">Remover</button>
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