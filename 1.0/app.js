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
        document.getElementById("cliente_nome").value = c.nome;
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

  const descricao = document.getElementById("descricao").value;
  const valor = document.getElementById("valor").value;

  const { error } = await supabaseClient
    .from("orcamentos")
    .insert({
      cliente_id: clienteSelecionadoId,
      descricao,
      valor
    });

  if (error) return alert(error.message);
  alert("Orçamento salvo");
}
