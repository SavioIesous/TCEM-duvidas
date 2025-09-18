// ---------- CONFIG ----------
const API = "https://tcem-duvidas-backend.onrender.com";

// ---------- HELPERS ----------
function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getField(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined) return obj[k];
  }
  return "";
}

// ---------- SESSÃO ----------
function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}
window.logout = logout;

// ---------- RENDER DÚVIDA ----------
function createDuvidaElement(d) {
  const id =
    getField(d, "_id", "id", "ID") || Math.random().toString(36).slice(2);
  const title = escapeHtml(getField(d, "title", "titulo"));
  const description = escapeHtml(getField(d, "description", "descricao"));
  const author =
    escapeHtml(getField(d, "author", "autor", "user", "name")) || "Anônimo";
  const createdAt = d.createdAt ? new Date(d.createdAt).toLocaleString() : "";

  const wrapper = document.createElement("div");
  wrapper.className = "duvida-card";
  wrapper.dataset.id = id;

  wrapper.innerHTML = `
    <h3>${title || "(sem título)"}</h3>
    <p class="desc">${description || ""}</p>
    <div class="meta"><strong>Autor:</strong> ${author} ${
    createdAt ? " — " + createdAt : ""
  }</div>

    <ul class="replies"></ul>

    <div class="reply-area">
      <input class="reply-text" placeholder="Sua resposta" />
      <button class="reply-btn">Responder</button>
    </div>
  `;

  // Pega o usuário logado do token
  const token = localStorage.getItem("token");
  let loggedUserId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      loggedUserId = payload.id; // id do usuário logado
    } catch (err) {
      console.warn("Token inválido:", err);
    }
  }

  // Se a dúvida for do usuário logado, mostra botão de excluir
  if (d.authorId && loggedUserId && d.authorId === loggedUserId) {
    const delBtn = document.createElement("button");
    delBtn.textContent = "Excluir dúvida";
    delBtn.className = "delete-btn";
    delBtn.addEventListener("click", async () => {
      if (!confirm("Tem certeza que deseja excluir esta dúvida?")) return;
      try {
        const res = await fetch(`${API}/duvidas/${id}/resposta`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) wrapper.remove();
        else alert("Erro ao excluir dúvida");
      } catch (err) {
        console.error(err);
        alert("Erro de conexão");
      }
    });
    wrapper.appendChild(delBtn);
  }

  // Renderizar replies
  const replies =
    getField(d, "replies", "respostas", "answers", "comments") || [];
  const repliesList = wrapper.querySelector(".replies");
  replies.forEach((r) => {
    const li = addReplyToList(repliesList, r);

    // botão de excluir resposta (só aparece se for do dono)
    if (r.authorId && loggedUserId && r.authorId === loggedUserId) {
      const delReplyBtn = document.createElement("button");
      delReplyBtn.textContent = "Excluir resposta";
      delReplyBtn.className = "delete-reply-btn";
      delReplyBtn.addEventListener("click", async () => {
        if (!confirm("Deseja excluir esta resposta?")) return;
        try {
          const res = await fetch(`${API}/duvidas/${id}/respostas/${r._id}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) li.remove();
          else alert("Erro ao excluir resposta");
        } catch (err) {
          console.error(err);
          alert("Erro de conexão");
        }
      });
      li.appendChild(delReplyBtn);
    }
  });

  // Evento do botão responder
  const btn = wrapper.querySelector(".reply-btn");
  btn.addEventListener("click", async () => {
    const textEl = wrapper.querySelector(".reply-text");
    const texto = textEl.value.trim();
    if (!texto) return alert("Escreva algo antes de enviar a resposta.");

    try {
      const res = await fetch(`${API}/duvidas/${id}/resposta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text: texto }),
      });
      if (res.ok) {
        const saved = await res.json();
        const li = addReplyToList(repliesList, saved);

        // se o dono da resposta for o usuário logado, já adiciona o botão excluir
        if (saved.authorId && loggedUserId && saved.authorId === loggedUserId) {
          const delReplyBtn = document.createElement("button");
          delReplyBtn.textContent = "Excluir resposta";
          delReplyBtn.className = "delete-reply-btn";
          delReplyBtn.addEventListener("click", async () => {
            if (!confirm("Deseja excluir esta resposta?")) return;
            try {
              const resDel = await fetch(
                `${API}/duvidas/${id}/respostas/${saved._id}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );
              if (resDel.ok) li.remove();
              else alert("Erro ao excluir resposta");
            } catch (err) {
              console.error(err);
              alert("Erro de conexão");
            }
          });
          li.appendChild(delReplyBtn);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão");
    }

    textEl.value = "";
  });

  return wrapper;
}

function addReplyToList(listEl, reply) {
  // reply pode ter chaves (author/name, text/message, createdAt)
  const autor = escapeHtml(getField(reply, "author", "name", "autor"));
  const texto = escapeHtml(getField(reply, "text", "message", "conteudo"));
  const criado =
    reply && reply.createdAt ? new Date(reply.createdAt).toLocaleString() : "";

  const li = document.createElement("li");
  li.className = "reply";
  li.innerHTML =
    `<strong>${autor || "alguém"}:</strong> ${texto}` +
    (criado ? `<small>${criado}</small>` : "");
  listEl.appendChild(li);
}

// ---------- CARREGAR / ENVIAR DÚVIDAS ----------
async function carregarDuvidas() {
  const container = document.getElementById("duvidas");
  if (!container) return;
  container.innerHTML = '<p class="small-muted">Carregando dúvidas...</p>';
  try {
    const res = await fetch(`${API}/duvidas`);
    const list = await res.json();
    container.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = '<p class="small-muted">Nenhuma dúvida ainda.</p>';
      return;
    }

    list.forEach((d) => {
      // transforma para o formato que a função espera se necessário:
      // se seu backend usa 'titulo'/'descricao' mapeia para 'title'/'description' (não obrigatório)
      const el = createDuvidaElement(d);
      container.appendChild(el);
    });
  } catch (err) {
    console.error("Erro ao carregar dúvidas:", err);
    container.innerHTML =
      '<p class="small-muted">Não foi possível carregar neste momento.</p>';
  }
}

async function enviarDuvida() {
  const title = document.getElementById("titulo").value.trim();
  const author = document.getElementById("autor").value.trim() || "Anônimo";
  const description = document.getElementById("descricao").value.trim();
  if (!title || !description) return alert("Preencha título e descrição.");

  const payload = { title, author, description };
  const token = localStorage.getItem("token");

  try {
    const res = await fetch(`${API}/duvidas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const saved = await res.json();
      // adiciona no topo da lista
      const container = document.getElementById("duvidas");
      const el = createDuvidaElement(saved);
      container.insertBefore(el, container.firstChild);

      // limpa form
      document.getElementById("titulo").value = "";
      document.getElementById("autor").value = "";
      document.getElementById("descricao").value = "";
    } else {
      const err = await res.json().catch(() => ({ error: "Erro" }));
      alert(err.error || "Erro ao enviar dúvida.");
    }
  } catch (err) {
    console.error("Erro ao enviar dúvida:", err);
    // tenta mostrar na UI mesmo se backend não responder
    const container = document.getElementById("duvidas");
    const temp = createDuvidaElement({
      title,
      description,
      author,
      createdAt: new Date().toISOString(),
    });
    container.insertBefore(temp, container.firstChild);
    document.getElementById("titulo").value = "";
    document.getElementById("descricao").value = "";
  }
}

// ---------- INICIALIZAÇÃO ----------
async function validarToken(token) {
  try {
    const res = await fetch(`${API}/auth/validate`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return res.ok;
  } catch {
    return false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  // if (!token || !(await validarToken(token))) {
  //   localStorage.removeItem('token');
  //   window.location.href = 'index.html';
  //   return;
  // }

  document.getElementById('btnLogout').addEventListener('click', logout);
  document.getElementById('btnEnviar').addEventListener('click', enviarDuvida);
  carregarDuvidas();
});

// ================== SÓ RODA NA home.html ==================
if (window.location.pathname.includes("home.html")) {
  carregarDuvidas();
}

// Pega os formulários
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// ================= LOGIN =================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const senha = document.getElementById("loginPassword").value;

  try {
    const response = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });

    const data = await response.json();
    console.log("Resposta do backend:", data);

    if (response.ok) {
      // ⚡ Salva o token corretamente
      localStorage.setItem("token", data.token);

      window.location.href = "home.html"; // redireciona
    } else {
      alert("Erro no login: " + (data.error || "Verifique suas credenciais"));
    }
  } catch (err) {
    console.error("Erro no login:", err);
  }
});

// ================= CADASTRO =================
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("registerName").value;
  const email = document.getElementById("registerEmail").value;
  const senha = document.getElementById("registerPassword").value;

  try {
    const res = await fetch(`${API}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, senha }),
    });

    const data = await res.json();

    if (res.ok) {
      alert("Cadastro realizado com sucesso!");
    } else {
      alert(data.error || "Erro no cadastro.");
    }
  } catch (err) {
    alert("Erro de conexão com o servidor.");
  }
});
