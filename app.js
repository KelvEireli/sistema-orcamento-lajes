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
async function selecionarCliente(id, nome) {
  const inputOrcamento = document.getElementById("cliente_nome");
  const inputConsulta = document.getElementById("cliente_busca");

  if (inputOrcamento) inputOrcamento.value = nome;
  if (inputConsulta) inputConsulta.value = nome;

  clienteSelecionadoId = id;

  const lista = document.getElementById("listaClientes");
  if (lista) {
    lista.innerHTML = "";
    lista.style.display = "none";
  }

  // 🔥 Buscar WhatsApp do cliente
  const { data } = await supabaseClient
    .from("clientes")
    .select("whatsapp")
    .eq("id", id)
    .single();

  if (data?.whatsapp) {
    const inputWpp = document.getElementById("whatsapp");
    if (inputWpp) inputWpp.value = data.whatsapp;
  }

  if (inputConsulta) {
    carregarOrcamentos(id, nome);
  } else if (window.location.pathname.includes("historico")) {
    carregarHistorico(id, nome);
  }
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
async function buscarClientes(nome) {

  const lista = document.getElementById("listaClientes");
  if (!lista) return;

  if (!nome || nome.length < 2) {
    lista.innerHTML = "";
    lista.style.display = "none";
    return;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id, nome, whatsapp")
    .or(`nome.ilike.%${nome}%,whatsapp.ilike.%${nome}%`)
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
        <small>WhatsApp: ${c.whatsapp || "Não informado"}</small>
      </div>
    `;

    li.style.cursor = "pointer";
    li.style.borderBottom = "1px solid #eee";

    li.onclick = () => selecionarCliente(c.id, c.nome);

    lista.appendChild(li);

  });
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

  const frete = parseFloat(document.getElementById("frete").value) || 0
  const multiplicadorPagamento =
    parseFloat(document.getElementById("pagamento").value) || 1

  let subtotalLajes = 0
  let custoLajes = 0
  let areaTotal = 0

  const ambientes = document.querySelectorAll(".ambiente")

  if (ambientes.length === 0) {
    document.getElementById("resultado").innerHTML =
      "Adicione pelo menos um ambiente."
    return
  }

  // 🔹 CALCULA CADA AMBIENTE
  ambientes.forEach(div => {

    const largura =
      parseFloat(div.querySelector(".amb-largura")?.value) || 0

    const comprimento =
      parseFloat(div.querySelector(".amb-comprimento")?.value) || 0

    const lajeId =
      div.querySelector(".amb-laje")?.value

    const area = largura * comprimento

    if (!area || !lajeId) return

    const laje = lajesGlobais.find(l => l.id == lajeId)

    if (!laje) return

    const subtotal = area * laje.preco_venda_m2
    const custo = area * laje.custo_m2

    subtotalLajes += subtotal
    custoLajes += custo
    areaTotal += area

  })

  // 🔹 PRODUTOS AVULSOS
  let totalAvulsosVenda = 0
  let totalAvulsosCusto = 0

  document.querySelectorAll(".qtd-avulso").forEach(input => {

    const qtd = parseInt(input.value) || 0
    const preco = parseFloat(input.dataset.preco)
    const custo = parseFloat(input.dataset.custo)

    totalAvulsosVenda += qtd * preco
    totalAvulsosCusto += qtd * custo

  })

  // 🔹 SUBTOTAL
  const subtotalGeral = subtotalLajes + totalAvulsosVenda

  // 🔹 TOTAL FINAL
  const totalFinal =
    (subtotalGeral + frete) * multiplicadorPagamento

  // 🔹 CUSTO TOTAL
  const custoTotal =
    custoLajes + totalAvulsosCusto

  // 🔹 LUCRO
  const lucro =
    totalFinal - custoTotal

  // 🔹 salvar para o sistema usar depois
  calculoAtual = {
    subtotal: subtotalGeral,
    custoTotal: custoTotal,
    lucro: lucro,
    totalFinal: totalFinal
  }

  // 🔹 UI
  document.getElementById("resultado").innerHTML = `
    <div style="text-align:left;font-size:0.9em">

      Área total: ${areaTotal.toFixed(2)} m²<br>

      Lajes: R$ ${subtotalLajes.toLocaleString('pt-BR',{minimumFractionDigits:2})}<br>

      Produtos: R$ ${totalAvulsosVenda.toLocaleString('pt-BR',{minimumFractionDigits:2})}<br>

      Frete: R$ ${frete.toLocaleString('pt-BR',{minimumFractionDigits:2})}

    </div>

    <hr>

    <div style="font-size:1.2em;color:var(--primary)">
      Total:
      <strong>
        R$ ${totalFinal.toLocaleString('pt-BR',{minimumFractionDigits:2})}
      </strong>
    </div>
  `
}
async function salvarOrcamento() {

  if (!clienteSelecionadoId) {
    return alert("Selecione um cliente antes de salvar.");
  }

  try {

    const { data: { user }, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError || !user) {
      alert("Sessão expirada. Faça login novamente.");
      window.location.href = "index.html";
      return;
    }

    const frete = parseFloat(document.getElementById("frete").value) || 0;
    const pagamentoIdx = document.getElementById("pagamento").value;
    const dataEntrega = document.getElementById("data").value;
    const enderecoEntrega =
      document.getElementById("endereco_entrega").value;

    const ambientes = document.querySelectorAll(".ambiente");

    if (ambientes.length === 0) {
      return alert("Adicione pelo menos um ambiente.");
    }

    let subtotalGeral = 0;
    let custoTotalGeral = 0;
    let lucroTotal = 0;
    let metragemTotal = 0;
    const dadosAmbientes = [];

    for (const div of ambientes) {

      const nome =
        div.querySelector(".amb-nome").value || "Ambiente";

      const largura =
        parseFloat(div.querySelector(".amb-largura").value) || 0;

      const comprimento =
        parseFloat(div.querySelector(".amb-comprimento").value) || 0;

      const lajeId =
        div.querySelector(".amb-laje").value;

      const area = largura * comprimento;
      ametragemTotal += area;
      const laje =
        lajesGlobais.find(l => l.id == lajeId);

      if (!laje) continue;

      const subtotal = area * laje.preco_venda_m2;
      const custo = area * laje.custo_m2;
      const lucro = subtotal - custo;

      subtotalGeral += subtotal;
      custoTotalGeral += custo;
      lucroTotal += lucro;

      dadosAmbientes.push({
        nome,
        largura,
        comprimento,
        area,
        tipo_laje_id: lajeId,
        subtotal,
        custo,
        lucro
      });

    }

    const multiplicadorPagamento =
      parseFloat(document.getElementById("pagamento").value) || 1;

    const totalFinal =
      (subtotalGeral + frete) * multiplicadorPagamento;

    // SALVAR ORÇAMENTO
    const { data: orcamentoCriado, error: erroOrc } =
      await supabaseClient
        .from("orcamentos")
        .insert({
          cliente_id: clienteSelecionadoId,
          usuario_id: user.id,
          metragem_calculada: metragemTotal,
          subtotal: subtotalGeral,
          total_final: totalFinal,
          custo_total: custoTotalGeral,
          lucro: lucroTotal,
          frete: frete,
          forma_pagamento:
            pagamentoIdx === "1" ? "À vista" : "Parcelado",
          data_entrega: dataEntrega || null,
          endereco_entrega: enderecoEntrega || null,
          status: "PENDENTE",
          validade: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString().split("T")[0]
        })
        .select()
        .single();

    if (erroOrc) throw erroOrc;

    // SALVAR AMBIENTES
    for (const amb of dadosAmbientes) {

      await supabaseClient
        .from("orcamento_ambientes")
        .insert({
          orcamento_id: orcamentoCriado.id,
          ...amb
        });

    }

    alert("Orçamento salvo com sucesso!");

    window.location.href = "consulta.html";

  } catch (err) {

    console.error("Erro ao salvar orçamento:", err);

    alert(
      "Erro técnico: " +
      (err.message || "Falha na conexão com o banco")
    );

  }

}

async function carregarOrcamentos(clienteId, nomeCliente) {
  const div = document.getElementById("orcamentos");

const { data, error } = await supabaseClient
    .from("orcamentos")
    .select(`
      id,
      metragem_calculada,
      total_final,
      status,
      criado_em
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
    html += "<p>Nenhum orçamento encontrado.</p>";
    div.innerHTML = html;
    return;
  }

  data.forEach(o => {
    const dataFormatada = new Date(o.criado_em).toLocaleDateString("pt-BR");

      html += `
        <div class="card" style="margin-top:15px">

          <strong>Orçamento</strong><br>
          Área total: ${Number(o.metragem_calculada).toFixed(2)} m²<br>
          Criado em: ${dataFormatada}<br>
          Status: ${o.status}<br>

          <strong>Total:</strong> 
          R$ ${Number(o.total_final).toLocaleString('pt-BR',{minimumFractionDigits:2})}
          
          <br><br>

          <button onclick="arquivarOrcamento('${o.id}', '${clienteId}', '${nomeCliente}')">
            Arquivar
          </button>

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

  const { data, error } = await supabaseClient
    .from("orcamentos")
      .select(`
        id,
        metragem_calculada,
        total_final,
        status,
        criado_em
      `)
    .eq("cliente_id", clienteId)
    .eq("status", "ARQUIVADO")
    .order("criado_em", { ascending: false });

  if (error) {
    div.innerHTML = "Erro ao carregar histórico.";
    return;
  }

  let html = `<h2>Histórico de ${nomeCliente}</h2>`;

  if (!data || data.length === 0) {
    html += "<p>Nenhum orçamento arquivado.</p>";
    div.innerHTML = html;
    return;
  }

  data.forEach(o => {
    const dataFormatada = new Date(o.criado_em).toLocaleDateString("pt-BR");

    html += `
      <div class="card" style="margin-top:15px; opacity:0.85">
        <strong>${o.ambiente || "Ambiente não informado"}</strong><br>
        ${o.tipos_laje?.nome || "Tipo não definido"}<br>
        ${o.metragem_calculada} m²<br>
        Criado em: ${dataFormatada}<br>
        Status: ${o.status}<br>
        <strong>Total:</strong> R$ ${Number(o.total_final).toFixed(2)}<br><br>

        <button onclick="restaurarOrcamento('${o.id}')">
          Restaurar
        </button>
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

function adicionarAmbiente(){

  const container = document.getElementById("listaAmbientes")

  let opcoes = ""

  lajesGlobais.forEach(laje => {

    opcoes += `
      <option value="${laje.id}">
        ${laje.nome} - R$ ${Number(laje.preco_venda_m2).toFixed(2)}/m²
      </option>
    `

  })

  const html = `
  <div class="ambiente">

    <label>Ambiente</label>
    <input class="amb-nome" placeholder="Ex: Sala">

    <label>Largura</label>
    <input type="number" class="amb-largura" oninput="mostrarResultado()">

    <label>Comprimento</label>
    <input type="number" class="amb-comprimento" oninput="mostrarResultado()">

    <label>Tipo de Laje</label>
    <select class="amb-laje" onchange="mostrarResultado()">
      ${opcoes}
    </select>

  </div>
  `

  container.insertAdjacentHTML("beforeend", html)

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