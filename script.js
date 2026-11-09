// ---------- Elementos ----------
const el = {
  apiKey: document.getElementById("apiKey"),
  recurso: document.getElementById("recurso"),
  urlBase: document.getElementById("urlBase"),
  form: document.getElementById("form"),
  tituloForm: document.getElementById("tituloForm"),
  idEdicao: document.getElementById("idEdicao"),
  nome: document.getElementById("nome"),
  email: document.getElementById("email"),
  idade: document.getElementById("idade"),
  btnSalvar: document.getElementById("btnSalvar"),
  btnCancelar: document.getElementById("btnCancelar"),
  btnListar: document.getElementById("btnListar"),
  btnLimpar: document.getElementById("btnLimpar"),
  lista: document.getElementById("lista"),
  vazio: document.getElementById("vazio"),
  log: document.getElementById("log"),
  logVazio: document.getElementById("logVazio"),
};

// ---------- Configuração ----------
el.apiKey.value = localStorage.getItem("crud_apiKey") || "";
el.recurso.value = localStorage.getItem("crud_recurso") || "usuarios";

function urlBase() {
  const chave = el.apiKey.value.trim();
  const recurso = el.recurso.value.trim() || "usuarios";
  return `https://crudcrud.com/api/${chave || "38739a2212b14cce8254904845aee634"}/${recurso}`;
}

function atualizarUrlBase() {
  el.urlBase.textContent = urlBase();
  localStorage.setItem("crud_apiKey", el.apiKey.value.trim());
  localStorage.setItem("crud_recurso", el.recurso.value.trim());
}

el.apiKey.addEventListener("input", atualizarUrlBase);
el.recurso.addEventListener("input", atualizarUrlBase);
atualizarUrlBase();

// ---------- Função única para todas as requisições HTTP ----------
async function requisicao(metodo, caminho = "", corpo = null) {
  if (!el.apiKey.value.trim()) {
    alert("Cole a chave da API do CRUDCRUD antes de continuar.");
    el.apiKey.focus();
    throw new Error("Chave da API não informada");
  }

  const url = urlBase() + caminho;
  const opcoes = { method: metodo, headers: {} };

  if (corpo !== null) {
    opcoes.headers["Content-Type"] = "application/json";
    opcoes.body = JSON.stringify(corpo);
  }

  const inicio = performance.now();
  let resposta;
  try {
    resposta = await fetch(url, opcoes);
  } catch (erro) {
    registrarLog({ metodo, url, corpo, status: "falha de rede", ok: false, tempo: performance.now() - inicio, texto: String(erro) });
    throw erro;
  }

  const texto = await resposta.text(); // PUT e DELETE respondem sem corpo
  let dados = null;
  try { dados = texto ? JSON.parse(texto) : null; } catch { dados = texto; }

  registrarLog({
    metodo, url, corpo,
    status: `${resposta.status} ${resposta.statusText}`.trim(),
    ok: resposta.ok,
    tempo: performance.now() - inicio,
    texto: texto ? (typeof dados === "object" ? JSON.stringify(dados, null, 2) : texto) : "(sem corpo na resposta)",
  });

  if (!resposta.ok) throw new Error(`Erro ${resposta.status}`);
  return dados;
}

// ---------- As quatro operações ----------
const api = {
  listar:  ()         => requisicao("GET"),                  // GET    /recurso
  buscar:  (id)       => requisicao("GET", `/${id}`),        // GET    /recurso/:id
  criar:   (dados)    => requisicao("POST", "", dados),      // POST   /recurso
  editar:  (id, dados)=> requisicao("PUT", `/${id}`, dados), // PUT    /recurso/:id
  excluir: (id)       => requisicao("DELETE", `/${id}`),     // DELETE /recurso/:id
};

// ---------- Painel de requisições ----------
function registrarLog({ metodo, url, corpo, status, ok, tempo, texto }) {
  el.logVazio.hidden = true;

  const item = document.createElement("li");
  item.className = `req ${metodo.toLowerCase()}`;

  const topo = document.createElement("div");
  topo.className = "req-topo";

  const m = document.createElement("span");
  m.className = "metodo";
  m.textContent = metodo;

  const s = document.createElement("span");
  s.className = `status ${ok ? "ok" : "erro"}`;
  s.textContent = status;

  const t = document.createElement("span");
  t.className = "tempo";
  t.textContent = `${Math.round(tempo)} ms`;

  topo.append(m, s, t);

  const u = document.createElement("p");
  u.className = "req-url";
  u.textContent = url;

  item.append(topo, u);

  if (corpo) {
    const r = document.createElement("p");
    r.className = "rotulo";
    r.textContent = "Corpo enviado";
    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(corpo, null, 2);
    item.append(r, pre);
  }

  const r2 = document.createElement("p");
  r2.className = "rotulo";
  r2.textContent = "Resposta";
  const pre2 = document.createElement("pre");
  pre2.textContent = texto;
  item.append(r2, pre2);

  el.log.prepend(item);
}

el.btnLimpar.addEventListener("click", () => {
  el.log.innerHTML = "";
  el.logVazio.hidden = false;
});

// ---------- Lista de usuários ----------
function desenharLista(usuarios) {
  el.lista.innerHTML = "";
  el.vazio.hidden = usuarios.length > 0;
  if (usuarios.length === 0) el.vazio.textContent = "Nenhum usuário cadastrado ainda. Preencha o formulário para criar o primeiro.";

  usuarios.forEach((u) => {
    const li = document.createElement("li");

    const info = document.createElement("div");
    const nome = document.createElement("div");
    nome.className = "nome";
    nome.textContent = u.nome || "(sem nome)";
    const detalhe = document.createElement("div");
    detalhe.className = "detalhe";
    detalhe.textContent = [u.email, u.idade ? `${u.idade} anos` : null].filter(Boolean).join(" · ") || "Sem outros dados";
    info.append(nome, detalhe);

    const botoes = document.createElement("div");
    botoes.className = "botoes";

    const editar = document.createElement("button");
    editar.type = "button";
    editar.className = "secundario";
    editar.textContent = "Editar";
    editar.addEventListener("click", () => iniciarEdicao(u._id));

    const excluir = document.createElement("button");
    excluir.type = "button";
    excluir.className = "secundario btn-excluir";
    excluir.textContent = "Excluir";
    excluir.addEventListener("click", () => excluirUsuario(u._id, u.nome));

    botoes.append(editar, excluir);
    li.append(info, botoes);
    el.lista.append(li);
  });
}

async function carregarLista() {
  el.btnListar.disabled = true;
  try {
    const usuarios = await api.listar();
    desenharLista(Array.isArray(usuarios) ? usuarios : []);
  } catch (e) {
    console.error(e);
  } finally {
    el.btnListar.disabled = false;
  }
}

// ---------- Formulário (criar / editar) ----------
function lerFormulario() {
  return {
    nome: el.nome.value.trim(),
    email: el.email.value.trim(),
    idade: el.idade.value ? Number(el.idade.value) : null,
  };
}

function limparFormulario() {
  el.form.reset();
  el.idEdicao.value = "";
  el.tituloForm.textContent = "Novo usuário";
  el.btnSalvar.textContent = "Criar usuário";
  el.btnCancelar.hidden = true;
}

async function iniciarEdicao(id) {
  try {
    const u = await api.buscar(id); // GET por id
    el.idEdicao.value = u._id;
    el.nome.value = u.nome || "";
    el.email.value = u.email || "";
    el.idade.value = u.idade ?? "";
    el.tituloForm.textContent = "Editar usuário";
    el.btnSalvar.textContent = "Salvar alterações";
    el.btnCancelar.hidden = false;
    el.nome.focus();
  } catch (e) {
    console.error(e);
  }
}

el.btnCancelar.addEventListener("click", limparFormulario);

el.form.addEventListener("submit", async (evento) => {
  evento.preventDefault();
  const dados = lerFormulario();

  if (!dados.nome) {
    el.nome.focus();
    alert("Informe o nome do usuário.");
    return;
  }

  el.btnSalvar.disabled = true;
  try {
    if (el.idEdicao.value) {
      await api.editar(el.idEdicao.value, dados); // PUT (o corpo não pode ter _id)
    } else {
      await api.criar(dados); // POST
    }
    limparFormulario();
    await carregarLista();
  } catch (e) {
    console.error(e);
  } finally {
    el.btnSalvar.disabled = false;
  }
});

async function excluirUsuario(id, nome) {
  if (!confirm(`Excluir ${nome || "este usuário"}?`)) return;
  try {
    await api.excluir(id); // DELETE
    if (el.idEdicao.value === id) limparFormulario();
    await carregarLista();
  } catch (e) {
    console.error(e);
  }
}

el.btnListar.addEventListener("click", carregarLista);

// Se já existe uma chave salva, carrega a lista ao abrir a página
if (el.apiKey.value.trim()) carregarLista();
