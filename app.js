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
function selecionarCliente(id, nome) {
  // 1. Identifica os inputs das diferentes telas
  const inputOrcamento = document.getElementById("cliente_nome");
  const inputConsulta = document.getElementById("cliente_busca");

  // 2. Preenche o input que estiver visível
  if (inputOrcamento) inputOrcamento.value = nome;
  if (inputConsulta) inputConsulta.value = nome;

  // 3. Define o ID global
  clienteSelecionadoId = id;
  
  // 4. Limpa e esconde o balão (lista)
  const lista = document.getElementById("listaClientes");
  if (lista) {
    lista.innerHTML = "";
    lista.style.display = "none";
  }

  // 5. Lógica automática por tela
  if (inputConsulta) {
    // Se estiver na tela de consulta, carrega os orçamentos na hora
    carregarOrcamentos(id, nome);
  } else if (window.location.pathname.includes("historico")) {
    // Se estiver na tela de histórico, carrega o histórico
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
    .select("id, nome")
    .ilike("nome", `%${nome}%`)
    .limit(5);

  if (error || !data) return;

  lista.style.display = "block"; 
  lista.innerHTML = data.map(c => `
    <li onclick="selecionarCliente('${c.id}', '${c.nome}')" 
        style="padding: 12px; cursor: pointer; border-bottom: 1px solid #eee;">
      ${c.nome}
    </li>
  `).join("");
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
    .select("id, nome")
    .ilike("nome", `%${nome}%`)
    .order("nome")
    .limit(5);

  if (buscaId !== ultimaBuscaId) return;
  if (error) return;

  lista.style.display = "block";
  lista.innerHTML = "";

  if (data.length === 0) {
    lista.innerHTML = "<li style='padding:12px'>Nenhum cliente encontrado</li>";
    return;
  }

  data.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.nome;
    li.style.padding = "12px";
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
  if (!clienteSelecionadoId) return alert("Selecione um cliente");

  const largura = Number(document.getElementById("largura").value);
  const comprimento = Number(document.getElementById("comprimento").value);
  const validade = document.getElementById("data").value;
  const calc = calcularTotal();

  if (!largura || !comprimento || !calc) return alert("Verifique os dados da laje");

  const { data: userData } = await supabaseClient.auth.getUser();
  if (!userData?.user) return alert("Sessão expirada. Faça login novamente.");

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
  if (!div) return;

  const { data, error } = await supabaseClient
    .from("orcamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("status", "PENDENTE")
    .order("criado_em", { ascending: false });

  if (error) return div.innerHTML = "<p>Erro ao carregar.</p>";

  let html = `<h2>Orçamentos de ${nomeCliente}</h2>`;
  if (!data || data.length === 0) {
    html += "<p>Nenhum orçamento pendente encontrado.</p>";
  } else {
    data.forEach(o => {
      html += `
        <div class="card" style="margin-top:15px">
          <strong>Área:</strong> ${o.metragem_calculada} m² (${o.largura}x${o.comprimento})<br>
          <strong>Total:</strong> R$ ${Number(o.total_final).toFixed(2)}<br>
          <small>Data: ${new Date(o.criado_em).toLocaleDateString()}</small><br><br>
          <button onclick="arquivarOrcamento('${o.id}', '${clienteId}', '${nomeCliente}')">
            Apagar / Arquivar
          </button>
        </div>
      `;
    });
  }
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
  carregarOrcamentos(clienteId, nomeCliente);
}

async function carregarHistorico(clienteId, nomeCliente) {
  clienteHistoricoAtual = clienteId;
  nomeHistoricoAtual = nomeCliente;
  const div = document.getElementById("orcamentos");

  const { data, error } = await supabaseClient
    .from("orcamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .eq("status", "ARQUIVADO")
    .order("criado_em", { ascending: false });

  if (error) return;

  let html = `<h2>Histórico de ${nomeCliente}</h2>`;
  data.forEach(o => {
    html += `
      <div class="card" style="margin-top:15px; opacity: 0.8">
        <strong>Total:</strong> R$ ${Number(o.total_final).toFixed(2)}<br>
        <button onclick="restaurarOrcamento('${o.id}')">Restaurar</button>
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
  alert("Restaurado!");
  if (clienteHistoricoAtual) carregarHistorico(clienteHistoricoAtual, nomeHistoricoAtual);
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