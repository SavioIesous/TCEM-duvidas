const API = "https://tcem-duvidas-backend.onrender.com";

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

function safeJson(res) {
  return res.text().then((t) => {
    try {
      return JSON.parse(t || "{}");
    } catch {
      return null;
    }
  });
}

function getToken() {
  return localStorage.getItem("token");
}

function getLoggedUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || payload._id || null;
  } catch {
    return null;
  }
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}
window.logout = logout;

function addReplyToList(listEl, reply) {
  const autor =
    escapeHtml(getField(reply, "author", "name", "autor")) || "alguém";
  const texto =
    escapeHtml(getField(reply, "text", "message", "conteudo")) || "";
  const criado =
    reply && reply.createdAt ? new Date(reply.createdAt).toLocaleString() : "";

  const li = document.createElement("li");
  li.className = "reply";
  li.dataset.replyId = reply._id || reply.id || "";
  li.innerHTML =
    `<strong>${autor}:</strong> ${texto}` +
    (criado ? `<small> — ${criado}</small>` : "");
  listEl.appendChild(li);
  return li;
}

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

  const token = getToken();
  const loggedUserId = getLoggedUserIdFromToken(token);

  const duvidaAuthorId = d.authorId || d.author_id || null;
  if (
    duvidaAuthorId &&
    loggedUserId &&
    String(duvidaAuthorId) === String(loggedUserId)
  ) {
    const delBtn = document.createElement("button");
    delBtn.textContent = "Excluir dúvida";
    delBtn.className = "delete-btn";
    delBtn.addEventListener("click", async () => {
      if (!confirm("Tem certeza que deseja excluir esta dúvida?")) return;
      try {
        const res = await fetch(`${API}/duvidas/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) wrapper.remove();
        else {
          const err = await safeJson(res);
          alert(err?.error || "Erro ao excluir dúvida");
        }
      } catch (err) {
        console.error(err);
        alert("Erro de conexão");
      }
    });
    wrapper.appendChild(delBtn);
  }

  const replies =
    getField(d, "replies", "respostas", "answers", "comments") || [];
  const repliesList = wrapper.querySelector(".replies");
  replies.forEach((r) => {
    const li = addReplyToList(repliesList, r);

    const rAuthorId = r.authorId || r.author_id || r.author;
    if (
      rAuthorId &&
      loggedUserId &&
      String(rAuthorId) === String(loggedUserId)
    ) {
      const delReplyBtn = document.createElement("button");
      delReplyBtn.textContent = "Excluir resposta";
      delReplyBtn.className = "delete-reply-btn";
      delReplyBtn.addEventListener("click", async () => {
        if (!confirm("Deseja excluir esta resposta?")) return;
        try {
          const replyId = li.dataset.replyId || r._id || r.id;
          const res = await fetch(`${API}/duvidas/${id}/respostas/${replyId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) li.remove();
          else {
            const err = await safeJson(res);
            alert(err?.error || "Erro ao excluir resposta");
          }
        } catch (err) {
          console.error(err);
          alert("Erro de conexão");
        }
      });
      li.appendChild(delReplyBtn);
    }
  });

  const btn = wrapper.querySelector(".reply-btn");
  if (btn) {
    btn.addEventListener("click", async () => {
      const textEl = wrapper.querySelector(".reply-text");
      const texto = ((textEl && textEl.value) || "").trim();
      if (!texto) return alert("Escreva algo antes de enviar a resposta.");

      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;

      try {
        const res = await fetch(`${API}/duvidas/${id}/respostas`, {
          method: "POST",
          headers,
          body: JSON.stringify({ text: texto }),
        });

        if (res.ok) {
          const saved = await res.json();
          const li = addReplyToList(repliesList, saved);

          li.dataset.replyId =
            saved._id || saved.id || li.dataset.replyId || "";

          const savedAuthorId =
            saved.authorId || saved.author_id || saved.author;
          if (
            savedAuthorId &&
            loggedUserId &&
            String(savedAuthorId) === String(loggedUserId)
          ) {
            const delReplyBtn = document.createElement("button");
            delReplyBtn.textContent = "Excluir resposta";
            delReplyBtn.className = "delete-reply-btn";
            delReplyBtn.addEventListener("click", async () => {
              if (!confirm("Deseja excluir esta resposta?")) return;
              delReplyBtn.disabled = true;
              delReplyBtn.textContent = "Excluindo...";

              try {
                const replyId = li.dataset.replyId || r._id || r.id;
                const res = await fetch(
                  `${API}/duvidas/${id}/respostas/${replyId}`,
                  {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${getToken()}` },
                  }
                );

                if (res.ok) {
                  li.remove();
                } else {
                  const err = await safeJson(res);
                  alert(err?.error || "Erro ao excluir resposta");
                  delReplyBtn.disabled = false;
                  delReplyBtn.textContent = "Excluir resposta";
                }
              } catch (err) {
                console.error(err);
                alert("Erro de conexão");
                delReplyBtn.disabled = false;
                delReplyBtn.textContent = "Excluir resposta";
              }
            });

            li.appendChild(delReplyBtn);
          }
        } else {
          const err = await safeJson(res);
          alert(err?.error || "Erro ao enviar resposta");
        }
      } catch (err) {
        console.error(err);
        alert("Erro de conexão");
      }

      if (textEl) textEl.value = "";
    });
  }

  return wrapper;
}

async function carregarDuvidas() {
  const container = document.getElementById("duvidas");
  if (!container) return;
  container.innerHTML = '<p class="small-muted">Carregando dúvidas...</p>';
  try {
    const res = await fetch(`${API}/duvidas`);
    if (!res.ok) {
      container.innerHTML =
        '<p class="small-muted">Erro ao carregar dúvidas.</p>';
      return;
    }
    const list = await res.json();
    container.innerHTML = "";
    if (!Array.isArray(list) || list.length === 0) {
      container.innerHTML = '<p class="small-muted">Nenhuma dúvida ainda.</p>';
      return;
    }

    list.forEach((d) => {
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
  const titleEl = document.getElementById("title");
  const descriptionEl = document.getElementById("description");

  const title = (titleEl && titleEl.value || "").trim();
  const description = (descriptionEl && descriptionEl.value || "").trim();

  if (!title || !description) {
    alert("Preencha título e descrição!");
    return;
  }

  const payload = { title, description };

  try {
    console.log("Token:", getToken());

    const res = await fetch(`${API}/duvidas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await safeJson(res);
      throw new Error(err?.error || "Erro ao enviar dúvida");
    }

    if (titleEl) titleEl.value = "";
    if (descriptionEl) descriptionEl.value = "";

    carregarDuvidas();
  } catch (error) {
    console.error(error);
    alert("Erro ao enviar dúvida: " + (error.message || ""));
  }
}

async function validarToken(token) {
  if (!token) return false;
  try {
    const res = await fetch(`${API}/auth/validate`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;

  if (
    path.includes("index.html") ||
    path.endsWith("/") ||
    path.endsWith("index")
  ) {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = document.getElementById("loginEmail").value;
        const senha = document.getElementById("loginPassword").value;
        try {
          const res = await fetch(`${API}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha }),
          });
          const data = await res.json();
          if (res.ok) {
            localStorage.setItem("token", data.token);
            window.location.href = "home.html";
          } else {
            alert(data.error || "Erro no login");
          }
        } catch (err) {
          console.error(err);
          alert("Erro de conexão");
        }
      });
    }

    if (registerForm) {
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
          alert(
            res.ok ? "Cadastro realizado!" : data.error || "Erro no cadastro"
          );
        } catch (err) {
          console.error(err);
          alert("Erro de conexão");
        }
      });
    }

    return;
  }

  if (path.includes("home.html")) {
    const token = getToken();
    const isValid = await validarToken(token);
    if (!isValid) {
      localStorage.removeItem("token");
      window.location.href = "index.html";
      return;
    }

    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) btnLogout.addEventListener("click", logout);

    const btnEnviar = document.getElementById("btnEnviar");
    if (btnEnviar) btnEnviar.addEventListener("click", enviarDuvida);

    carregarDuvidas();
  }
});
