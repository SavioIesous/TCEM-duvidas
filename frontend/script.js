const API = "https://tcem-duvidas-backend.onrender.com"; // Altere para o URL do seu backend se necessário

function escapeHtml(text) {
  if (!text) return "";
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}

let todasDuvidas = [];
let currentFilter = "";

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

function getLoggedUserIdFromToken(token) {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.id || payload._id || null;
  } catch {
    return null;
  }
}

function updateStats() {
  const totalPerguntas = todasDuvidas.length;
  const totalRespostas = todasDuvidas.reduce((acc, d) => acc + (d.replies?.length || 0), 0);
  
  const statPerguntas = document.getElementById("statPerguntas");
  const statRespostas = document.getElementById("statRespostas");
  
  if (statPerguntas) statPerguntas.textContent = totalPerguntas;
  if (statRespostas) statRespostas.textContent = totalRespostas;
}

function createDuvidaElement(d) {
  const id = d._id || d.id;
  const title = d.title || "";
  const description = d.description || "";
  const author = d.author || "Anônimo";
  const createdAt = d.createdAt ? new Date(d.createdAt).toLocaleString("pt-BR") : "";
  const tag = d.tag || "";

  console.log("Criando elemento para dúvida:", { id, title, tag }); // DEBUG

  const wrapper = document.createElement("div");
  wrapper.className = "duvida-card";
  wrapper.dataset.id = id;
  if (tag) wrapper.dataset.tag = tag;

  wrapper.innerHTML = `
    <h3>${escapeHtml(title) || "(sem título)"}</h3>
    <div class="meta">
      <span class="author"><strong>Autor:</strong> ${escapeHtml(author)}</span>
      ${createdAt ? `<span class="date">${createdAt}</span>` : ""}
      ${tag ? `<span class="tag-label"><button class="tag-text" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button></span>` : ""}
    </div>
    <p class="desc">${escapeHtml(description) || ""}</p>
    <ul class="replies"></ul>
    <div class="reply-area">
      <input class="reply-text" placeholder="Sua resposta" />
      <button class="reply-btn">Responder</button>
    </div>
  `;

  const token = getToken();
  const loggedUserId = getLoggedUserIdFromToken(token);
  const duvidaAuthorId = d.authorId || d.author_id;

  if (duvidaAuthorId && loggedUserId && String(duvidaAuthorId) === String(loggedUserId)) {
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
        if (res.ok) {
          wrapper.remove();
          todasDuvidas = todasDuvidas.filter(dv => (dv._id || dv.id) !== id);
          updateStats();
        } else {
          alert("Erro ao excluir dúvida");
        }
      } catch (err) {
        console.error(err);
        alert("Erro de conexão");
      }
    });
    wrapper.appendChild(delBtn);
  }

  const repliesList = wrapper.querySelector(".replies");
  const replies = d.replies || [];
  
  replies.forEach((r) => {
    const li = document.createElement("li");
    li.className = "reply";
    li.dataset.replyId = r._id || r.id;
    
    const autor = escapeHtml(r.author || "alguém");
    const texto = escapeHtml(r.text || "");
    const criado = r.createdAt ? new Date(r.createdAt).toLocaleString("pt-BR") : "";
    
    li.innerHTML = `<strong>${autor}:</strong> ${texto}${criado ? ` <small>— ${criado}</small>` : ""}`;
    
    const rAuthorId = r.authorId || r.author_id;
    if (rAuthorId && loggedUserId && String(rAuthorId) === String(loggedUserId)) {
      const delReplyBtn = document.createElement("button");
      delReplyBtn.textContent = "Excluir resposta";
      delReplyBtn.className = "delete-reply-btn";
      delReplyBtn.addEventListener("click", async () => {
        if (!confirm("Deseja excluir esta resposta?")) return;
        try {
          const replyId = r._id || r.id;
          const res = await fetch(`${API}/duvidas/${id}/respostas/${replyId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            li.remove();
            const duvida = todasDuvidas.find(dv => (dv._id || dv.id) === id);
            if (duvida) {
              duvida.replies = duvida.replies.filter(rp => (rp._id || rp.id) !== replyId);
              updateStats();
            }
          } else {
            alert("Erro ao excluir resposta");
          }
        } catch (err) {
          console.error(err);
          alert("Erro de conexão");
        }
      });
      li.appendChild(delReplyBtn);
    }
    
    repliesList.appendChild(li);
  });

  const replyBtn = wrapper.querySelector(".reply-btn");
  replyBtn.addEventListener("click", async () => {
    const textEl = wrapper.querySelector(".reply-text");
    const texto = (textEl.value || "").trim();
    if (!texto) return alert("Escreva algo antes de enviar a resposta.");

    try {
      const res = await fetch(`${API}/duvidas/${id}/respostas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: texto }),
      });

      if (res.ok) {
        const saved = await res.json();
        const li = document.createElement("li");
        li.className = "reply";
        li.dataset.replyId = saved._id || saved.id;
        
        const autor = escapeHtml(saved.author || "Você");
        const textoEscaped = escapeHtml(saved.text || texto);
        const criado = saved.createdAt ? new Date(saved.createdAt).toLocaleString("pt-BR") : "";
        
        li.innerHTML = `<strong>${autor}:</strong> ${textoEscaped}${criado ? ` <small>— ${criado}</small>` : ""}`;
        
        const savedAuthorId = saved.authorId || saved.author_id;
        if (savedAuthorId && loggedUserId && String(savedAuthorId) === String(loggedUserId)) {
          const delReplyBtn = document.createElement("button");
          delReplyBtn.textContent = "Excluir resposta";
          delReplyBtn.className = "delete-reply-btn";
          delReplyBtn.addEventListener("click", async () => {
            if (!confirm("Deseja excluir esta resposta?")) return;
            try {
              const replyId = saved._id || saved.id;
              const res = await fetch(`${API}/duvidas/${id}/respostas/${replyId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${getToken()}` },
              });
              if (res.ok) {
                li.remove();
                const duvida = todasDuvidas.find(dv => (dv._id || dv.id) === id);
                if (duvida) {
                  duvida.replies = duvida.replies.filter(rp => (rp._id || rp.id) !== replyId);
                  updateStats();
                }
              } else {
                alert("Erro ao excluir resposta");
              }
            } catch (err) {
              console.error(err);
              alert("Erro de conexão");
            }
          });
          li.appendChild(delReplyBtn);
        }
        
        repliesList.appendChild(li);
        textEl.value = "";
        
        const duvida = todasDuvidas.find(dv => (dv._id || dv.id) === id);
        if (duvida) {
          if (!duvida.replies) duvida.replies = [];
          duvida.replies.push(saved);
          updateStats();
        }
      } else {
        alert("Erro ao enviar resposta");
      }
    } catch (err) {
      console.error(err);
      alert("Erro de conexão");
    }
  });

  const tagBtn = wrapper.querySelector(".tag-text");
  if (tagBtn) {
    tagBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const tagText = tagBtn.dataset.tag;
      console.log("Tag clicada na dúvida:", tagText); // DEBUG
      filtrarPorTag(tagText);
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
      container.innerHTML = '<p class="small-muted">Erro ao carregar dúvidas.</p>';
      return;
    }
    const list = await res.json();
    todasDuvidas = Array.isArray(list) ? list : [];
    console.log("Dúvidas carregadas:", todasDuvidas);
    renderDuvidas();
    updateStats();
  } catch (err) {
    console.error("Erro ao carregar dúvidas:", err);
    container.innerHTML = '<p class="small-muted">Não foi possível carregar neste momento.</p>';
  }
}

function renderDuvidas() {
  renderDuvidasFiltradas();
}

function filtrarPorTag(tagText) {
  console.log("Filtrando por tag:", tagText);
  currentFilter = tagText;
  
  document.querySelectorAll(".sidebar .tag").forEach(t => {
    if (t.dataset.tag === tagText) {
      t.classList.add("active");
    } else {
      t.classList.remove("active");
    }
  });
  
  const filterInfo = document.getElementById("filterInfo");
  const btnClear = document.getElementById("btnClearFilter");
  
  if (filterInfo) {
    filterInfo.textContent = `Filtrando: ${tagText}`;
    filterInfo.style.display = "block";
  }
  
  if (btnClear) {
    btnClear.style.display = "block";
  }
  
  renderDuvidas();
  document.getElementById("duvidas")?.scrollIntoView({ behavior: "smooth" });
}

function limparFiltro() {
  currentFilter = "";
  filterSemRespostas = false;
  
  document.querySelectorAll(".sidebar .tag").forEach(t => {
    t.classList.remove("active");
  });
  
  const btnSemRespostas = document.getElementById("btnSemRespostas");
  if (btnSemRespostas) btnSemRespostas.classList.remove("active");
  
  const filterInfo = document.getElementById("filterInfo");
  const btnClear = document.getElementById("btnClearFilter");
  
  if (filterInfo) filterInfo.style.display = "none";
  if (btnClear) btnClear.style.display = "none";
  
  renderDuvidas();
}

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;

  if (path.includes("index.html") || path === "/" || path.endsWith("/")) {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const tabs = document.querySelectorAll(".tab-btn");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const tabName = tab.dataset.tab;
        document.querySelectorAll(".auth-form").forEach((form) => {
          form.classList.remove("active");
        });

        if (tabName === "login") {
          loginForm.classList.add("active");
        } else {
          registerForm.classList.add("active");
        }
      });
    });

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
          
          if (res.ok) {
            alert("Cadastro realizado com sucesso! Faça login para continuar.");
            tabs[0].click();
          } else {
            alert(data.error || "Erro no cadastro");
          }
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
    if (btnLogout) {
      btnLogout.addEventListener("click", logout);
    }

    const btnFazerPergunta = document.getElementById("btnFazerPergunta");
    const postArea = document.querySelector(".post-area");
    
    if (btnFazerPergunta && postArea) {
      btnFazerPergunta.addEventListener("click", () => {
        postArea.style.display = postArea.style.display === "none" ? "block" : "none";
      });
    }

    const formDuvida = document.getElementById("formDuvida");
    if (formDuvida) {
      formDuvida.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const title = document.getElementById("title").value.trim();
        const description = document.getElementById("description").value.trim();
        const tag = document.getElementById("tag").value.trim();

        if (!title || !description || !tag) {
          alert("Preencha título, descrição e selecione uma tag!");
          return;
        }

        try {
          const res = await fetch(`${API}/duvidas`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ title, description, tag }),
          });

          if (res.ok) {
            const data = await res.json();
            console.log("Dúvida criada:", data);
            todasDuvidas.unshift(data);
            renderDuvidas();
            updateStats();
            
            formDuvida.reset();
            if (postArea) postArea.style.display = "none";
            
            alert("Dúvida postada com sucesso!");
          } else {
            const err = await res.json();
            alert(err.error || "Erro ao enviar dúvida");
          }
        } catch (error) {
          console.error("Erro:", error);
          alert("Erro de conexão");
        }
      });
    }

    const sidebarTags = document.querySelectorAll(".sidebar .tag");
    console.log("Tags da sidebar encontradas:", sidebarTags.length); // DEBUG
    sidebarTags.forEach((tag) => {
      tag.addEventListener("click", () => {
        const tagText = tag.dataset.tag;
        console.log("Tag da sidebar clicada:", tagText); // DEBUG
        filtrarPorTag(tagText);
        
        if (postArea) {
          postArea.style.display = "block";
          const tagSelect = document.getElementById("tag");
          if (tagSelect) tagSelect.value = tagText;
        }
      });
    });

    const btnClearFilter = document.getElementById("btnClearFilter");
    if (btnClearFilter) {
      btnClearFilter.addEventListener("click", limparFiltro);
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const container = document.getElementById("duvidas");
        if (!container) return;

        const filtered = todasDuvidas.filter((d) => {
          const title = (d.title || "").toLowerCase();
          const desc = (d.description || "").toLowerCase();
          const tag = (d.tag || "").toLowerCase();
          return title.includes(query) || desc.includes(query) || tag.includes(query);
        });

        container.innerHTML = "";
        
        if (!filtered.length) {
          container.innerHTML = '<p class="small-muted">Nenhuma dúvida encontrada.</p>';
          return;
        }

        filtered.forEach((d) => {
          const el = createDuvidaElement(d);
          container.appendChild(el);
        });
      });
    }

    // Botão de filtrar sem respostas
    const btnSemRespostas = document.getElementById("btnSemRespostas");
    if (btnSemRespostas) {
      btnSemRespostas.addEventListener("click", filtrarSemRespostas);
    }

    // Modal de perfil
    const btnProfile = document.getElementById("btnProfile");
    const profileModal = document.getElementById("profileModal");
    const closeProfile = document.getElementById("closeProfile");
    const formProfile = document.getElementById("formProfile");

    if (btnProfile && profileModal) {
      btnProfile.addEventListener("click", async () => {
        profileModal.style.display = "flex";
        await carregarDadosPerfil();
      });
    }

    if (closeProfile && profileModal) {
      closeProfile.addEventListener("click", () => {
        profileModal.style.display = "none";
      });
    }

    if (formProfile) {
      formProfile.addEventListener("submit", async (e) => {
        e.preventDefault();
        await atualizarPerfil();
      });
    }

    // Modal de notificações
    const btnNotifications = document.getElementById("btnNotifications");
    const notificationsModal = document.getElementById("notificationsModal");
    const closeNotifications = document.getElementById("closeNotifications");

    if (btnNotifications && notificationsModal) {
      btnNotifications.addEventListener("click", async () => {
        notificationsModal.style.display = "flex";
        await carregarNotificacoes();
      });
    }

    if (closeNotifications && notificationsModal) {
      closeNotifications.addEventListener("click", () => {
        notificationsModal.style.display = "none";
      });
    }

    // Fechar modais clicando fora
    window.addEventListener("click", (e) => {
      if (e.target === profileModal) {
        profileModal.style.display = "none";
      }
      if (e.target === notificationsModal) {
        notificationsModal.style.display = "none";
      }
    });

    // Carregar dúvidas e atualizar badge de notificações
    await carregarDuvidas();
    await atualizarBadgeNotificacoes();
    
    // Atualizar notificações a cada 30 segundos
    setInterval(atualizarBadgeNotificacoes, 30000);
  }
});

// Filtrar dúvidas sem respostas
let filterSemRespostas = false;

function filtrarSemRespostas() {
  filterSemRespostas = !filterSemRespostas;
  
  const btnSemRespostas = document.getElementById("btnSemRespostas");
  const filterInfo = document.getElementById("filterInfo");
  const btnClear = document.getElementById("btnClearFilter");
  
  if (filterSemRespostas) {
    if (btnSemRespostas) btnSemRespostas.classList.add("active");
    if (filterInfo) {
      filterInfo.textContent = "Filtrando: Sem Respostas";
      filterInfo.style.display = "block";
    }
    if (btnClear) btnClear.style.display = "block";
  } else {
    if (btnSemRespostas) btnSemRespostas.classList.remove("active");
    if (filterInfo && !currentFilter) filterInfo.style.display = "none";
    if (btnClear && !currentFilter) btnClear.style.display = "none";
  }
  
  renderDuvidasFiltradas();
}

function renderDuvidasFiltradas() {
  const container = document.getElementById("duvidas");
  if (!container) return;
  
  container.innerHTML = "";

  let filtered = todasDuvidas;
  
  // Aplicar filtro de tag
  if (currentFilter) {
    filtered = filtered.filter((d) => {
      const duvidaTag = (d.tag || "").toString().trim();
      return duvidaTag === currentFilter;
    });
  }
  
  // Aplicar filtro sem respostas
  if (filterSemRespostas) {
    filtered = filtered.filter((d) => {
      const replies = d.replies || [];
      return replies.length === 0;
    });
  }

  if (!filtered.length) {
    container.innerHTML = '<p class="small-muted">Nenhuma dúvida encontrada.</p>';
    return;
  }

  filtered.forEach((d) => {
    const el = createDuvidaElement(d);
    container.appendChild(el);
  });
}

// Carregar dados do perfil
async function carregarDadosPerfil() {
  const token = getToken();
  if (!token) return;
  
  try {
    const res = await fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      const user = await res.json();
      document.getElementById("profileName").value = user.name || "";
      document.getElementById("profileEmail").value = user.email || "";
    }
  } catch (err) {
    console.error("Erro ao carregar perfil:", err);
  }
}

// Atualizar perfil
async function atualizarPerfil() {
  const token = getToken();
  if (!token) return;
  
  const name = document.getElementById("profileName").value.trim();
  const senha = document.getElementById("profileSenha").value.trim();
  
  if (!name) {
    alert("Nome é obrigatório!");
    return;
  }
  
  const body = { name };
  if (senha) body.senha = senha;
  
  try {
    const res = await fetch(`${API}/auth/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert("Perfil atualizado com sucesso!");
      document.getElementById("profileModal").style.display = "none";
      document.getElementById("profileSenha").value = "";
    } else {
      alert(data.error || "Erro ao atualizar perfil");
    }
  } catch (err) {
    console.error("Erro:", err);
    alert("Erro de conexão");
  }
}

// Carregar notificações
async function carregarNotificacoes() {
  const token = getToken();
  if (!token) return;
  
  const lista = document.getElementById("notificationsList");
  if (!lista) return;
  
  lista.innerHTML = '<p class="small-muted">Carregando...</p>';
  
  try {
    const res = await fetch(`${API}/auth/notifications`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      const notifications = await res.json();
      
      if (!notifications || notifications.length === 0) {
        lista.innerHTML = '<p class="small-muted">Nenhuma notificação nova.</p>';
        return;
      }
      
      lista.innerHTML = "";
      
      notifications.forEach(notif => {
        const div = document.createElement("div");
        div.className = "notification-item";
        div.innerHTML = `
          <p><strong>${notif.authorName || "Alguém"}</strong> respondeu sua dúvida: <strong>"${notif.duvidaTitle}"</strong></p>
          <small>${new Date(notif.createdAt).toLocaleString("pt-BR")}</small>
        `;
        lista.appendChild(div);
      });
      
      // Marcar como lidas
      await fetch(`${API}/auth/notifications/mark-read`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      await atualizarBadgeNotificacoes();
    } else {
      lista.innerHTML = '<p class="small-muted">Erro ao carregar notificações.</p>';
    }
  } catch (err) {
    console.error("Erro:", err);
    lista.innerHTML = '<p class="small-muted">Erro de conexão.</p>';
  }
}

// Atualizar badge de notificações
async function atualizarBadgeNotificacoes() {
  const token = getToken();
  if (!token) return;
  
  try {
    const res = await fetch(`${API}/auth/notifications/count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (res.ok) {
      const data = await res.json();
      const badge = document.getElementById("notificationBadge");
      
      if (badge) {
        if (data.count > 0) {
          badge.textContent = data.count;
          badge.style.display = "block";
        } else {
          badge.style.display = "none";
        }
      }
    }
  } catch (err) {
    console.error("Erro ao atualizar badge:", err);
  }
}