/* =================================================
   CONFIGURAÇÕES E ESTADO GLOBAL
================================================= */
let clienteSelecionadoId = null; // ID para novos orçamentos
let clienteHistoricoAtual = null; // Controle para tela de histórico
let nomeHistoricoAtual = null;
let ultimaBuscaId = 0;
let ultimaBuscaHistoricoId = 0;
let ultimaBuscaHistoricoClienteId = 0;

const supabaseClient = window.supabase.createClient(
  "https://dtznxqqcyrzlaijjbwzr.supabase.co",
  "sb_publishable_3UwkzJX1ewfPXb8qAl1E8g_cUSKgI_f"
);

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

  if (!nome) return alert("Nome é obrigatório");

  const { error } = await supabaseClient
    .from("clientes")
    .insert({ nome, email });

  if (error) return alert(error.message);
  alert("Cliente salvo com sucesso!");
  location.reload();
}

// Busca usada na tela de "Novo Orçamento"
async function buscarClientes(nome) {
  const lista = document.getElementById("listaClientes");

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

    li.onclick = () => selecionarCliente(c.id, c.nome);

    lista.appendChild(li);
  });
}

// Busca usada na tela de "Consulta"
async function buscarClientesConsulta(nome) {
  const buscaId = ++ultimaBuscaId;
  const lista = document.getElementById("listaClientes");
  const divOrcamentos = document.getElementById("orcamentos");

  if (!nome || nome.length < 2) {
    lista.innerHTML = "";
    lista.style.display = "none";
    if (divOrcamentos) divOrcamentos.innerHTML = "";
    return;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id, nome, whatsapp")
    .ilike("nome", `%${nome}%`)
    .order("nome")
    .limit(5);

  if (buscaId !== ultimaBuscaId) return;
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

  if (!tipo || !areaEl || !pagamentoEl) return null;

  const precoM2 = Number(tipo.value);
  const area = Number(areaEl.value);
  const pagamento = Number(pagamentoEl.value);

  if (!area || area <= 0) return null;

  const subtotal = precoM2 * area;
  const total = subtotal * pagamento;

  return { subtotal, total };
}

function mostrarResultado() {
  const resultado = document.getElementById("resultado");
  if (!resultado) return;

  const calc = calcularTotal();
  if (!calc) {
    resultado.innerHTML = "";
    return;
  }

  resultado.innerHTML = `
    <p>Subtotal: R$ ${calc.subtotal.toFixed(2)}</p>
    <p><strong>Total Final:</strong> R$ ${calc.total.toFixed(2)}</p>
  `;
}

async function salvarOrcamento() {
  if (!clienteSelecionadoId) 
    return alert("Selecione um cliente");

  const largura = Number(document.getElementById("largura").value);
  const comprimento = Number(document.getElementById("comprimento").value);
  const validade = document.getElementById("data").value;
  const whatsapp = document.getElementById("whatsapp")?.value?.trim();

  const calc = calcularTotal();

  if (!largura || !comprimento || !calc)
    return alert("Verifique os dados da laje");

  const { data: userData } = await supabaseClient.auth.getUser();
  if (!userData?.user)
    return alert("Sessão expirada. Faça login novamente.");

  /* ================================
     1️⃣ ATUALIZA WHATSAPP DO CLIENTE
  ================================== */

  if (whatsapp) {
    const { error: erroCliente } = await supabaseClient
      .from("clientes")
      .update({ whatsapp })
      .eq("id", clienteSelecionadoId);

    if (erroCliente) {
      console.error("Erro ao atualizar WhatsApp:", erroCliente);
    }
  }

  /* ================================
     2️⃣ SALVA ORÇAMENTO
  ================================== */

  const { error } = await supabaseClient
    .from("orcamentos")
    .insert({
      cliente_id: clienteSelecionadoId,
      usuario_id: userData.user.id,
      largura,
      comprimento,
      metragem_calculada: largura * comprimento,
      subtotal: calc.subtotal,
      total_final: calc.total,
      status: "PENDENTE",
      validade
    });

  if (error) return alert(error.message);

  alert("Orçamento salvo com sucesso!");
  location.href = "consulta.html";
}

async function carregarOrcamentos(clienteId, nomeCliente) {
  const div = document.getElementById("orcamentos");

  const { data, error } = await supabaseClient
    .from("orcamentos")
    .select(`
      id,
      ambiente,
      metragem_calculada,
      total_final,
      status,
      criado_em,
      tipos_laje ( nome )
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
        <strong>${o.ambiente || "Ambiente não informado"}</strong><br>
        ${o.tipos_laje?.nome || "Tipo não definido"}<br>
        ${o.metragem_calculada} m²<br>
        Criado em: ${dataFormatada}<br>
        Status: ${o.status}<br>
        <strong>Total:</strong> R$ ${Number(o.total_final).toFixed(2)}<br><br>

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
      ambiente,
      metragem_calculada,
      total_final,
      status,
      criado_em,
      tipos_laje ( nome )
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

async function protegerPaginaAdmin() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    // Se não estiver logado, volta para a index (Login)
    window.location.href = "index.html"; 
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
}

async function carregarLajes() {
  const select = document.getElementById("tipo");
  if (!select) return;

  const { data, error } = await supabaseClient
    .from("tipos_laje")
    .select("id, nome, preco_venda_m2")
    .eq("ativo", true)
    .order("nome");

  if (error) {
    console.error(error);
    return;
  }

  select.innerHTML = "";

  data.forEach(laje => {
    const option = document.createElement("option");
    option.value = laje.preco_venda_m2;
    option.textContent = `${laje.nome} - R$ ${laje.preco_venda_m2.toFixed(2)} /m²`;
    option.dataset.id = laje.id;
    select.appendChild(option);
  });

  mostrarResultado();
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