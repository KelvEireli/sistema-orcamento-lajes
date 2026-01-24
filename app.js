const supabaseClient = window.supabase.createClient(
  "https://dtznxqqcyrzlaijjbwzr.supabase.co",
  "sb_publishable_3UwkzJX1ewfPXb8qAl1E8g_cUSKgI_f"
);

let clienteSelecionadoId = null;

async function salvarCliente() {
  const nome = document.getElementById("nome").value;
  const email = document.getElementById("email").value;

  const { error } = await supabaseClient
    .from("clientes")
    .insert({ nome, email });

  if (error) return alert(error.message);
  alert("Cliente salvo");
}

async function buscarClientes(nome) {
  const lista = document.getElementById("listaClientes");

  // 1️⃣ Se apagou ou digitou pouco → limpa estado e some com tudo
  if (!nome || nome.length < 2) {
    lista.innerHTML = "";
    clienteSelecionadoId = null;
    return;
  }

  const { data, error } = await supabaseClient
    .from("clientes")
    .select("id, nome")
    .ilike("nome", `%${nome}%`)
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }

  // 2️⃣ Sempre limpa antes de renderizar
  lista.innerHTML = "";

  // 3️⃣ Nenhum resultado? Some com a lista
  if (!data || data.length === 0) return;

  data.forEach(c => {
    const li = document.createElement("li");

    const label = document.createElement("label");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "cliente_checkbox";

    checkbox.onchange = () => {
      // 4️⃣ Garante seleção única
      document
        .querySelectorAll('input[name="cliente_checkbox"]')
        .forEach(cb => {
          if (cb !== checkbox) cb.checked = false;
        });

      if (checkbox.checked) {
        const clienteNomeInput = document.getElementById("cliente_nome");
if (clienteNomeInput) {
  clienteNomeInput.value = c.nome;
}
        clienteSelecionadoId = c.id;
      } else {
        clienteSelecionadoId = null;
        document.getElementById("cliente_nome").value = "";
        lista.innerHTML = ""; // some com a lista ao desmarcar
      }
    };

    const nomeSpan = document.createElement("span");
    nomeSpan.textContent = c.nome;

    label.appendChild(checkbox);
    label.appendChild(nomeSpan);
    li.appendChild(label);
    lista.appendChild(li);
  });
}


async function salvarOrcamento() {
  if (!clienteSelecionadoId) {
    alert("Selecione um cliente");
    return;
  }

  const ambiente = document.getElementById("ambiente").value;
  const area = Number(document.getElementById("area").value);
  const data = document.getElementById("data").value;
  const pagamento = Number(document.getElementById("pagamento").value);

  const calc = calcularTotal();
  if (!calc || !ambiente || !data) {
    alert("Preencha todos os campos corretamente");
    return;
  }

  const { total, tipoNome } = calc;

  const { error } = await supabaseClient
    .from("orcamentos")
    .insert({
      cliente_id: clienteSelecionadoId,
      ambiente,
      tipo_laje: tipoNome,
      area,
      total,
      data_entrega: data
    });

  if (error) return alert(error.message);

  alert("Orçamento salvo com sucesso");
}

async function buscarClientesConsulta(nome) {
  if (nome.length < 2) return;

  const { data } = await supabaseClient
    .from("clientes")
    .select("id, nome")
    .ilike("nome", `%${nome}%`)
    .limit(5);

  const lista = document.getElementById("listaClientes");
  lista.innerHTML = "";

  data.forEach(c => {
    const li = document.createElement("li");
    li.textContent = c.nome;

    li.onclick = () => carregarOrcamentos(c.id, c.nome);

    lista.appendChild(li);
  });
}

async function carregarOrcamentos(clienteId, nomeCliente) {
  const { data, error } = await supabaseClient
    .from("orcamentos")
    .select("*")
    .eq("cliente_id", clienteId)
    .order("id", { ascending: false }); // ou remove o order

  if (error) {
    console.error("Erro ao buscar orçamentos:", error.message);
    alert("Erro ao buscar orçamentos");
    return;
  }

  const div = document.getElementById("orcamentos");
  div.innerHTML = `<h2>Orçamentos de ${nomeCliente}</h2>`;

  if (!data || data.length === 0) {
    div.innerHTML += "<p>Nenhum orçamento encontrado</p>";
    return;
  }

  data.forEach(o => {
    div.innerHTML += `
      <div class="card" style="margin-top:15px">
        <strong>Ambiente:</strong> ${o.ambiente}<br>
        <strong>Tipo:</strong> ${o.tipo_laje}<br>
        <strong>Área:</strong> ${o.area} m²<br>
        <strong>Total:</strong> R$ ${Number(o.total).toFixed(2)}<br>
        <strong>Entrega:</strong> ${o.data_entrega}
      </div>
    `;
  });
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

  return {
    subtotal,
    total,
    tipoNome: tipo.options[tipo.selectedIndex].text
  };
}


function mostrarResultado() {
  const resultado = document.getElementById("resultado");
  if (!resultado) return;

  const calc = calcularTotal();
  if (!calc) return;

  resultado.style.display = "block";
  resultado.innerHTML = `
    <strong>Total Final:</strong> R$ ${calc.total.toFixed(2)}
  `;
}


