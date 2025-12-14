const API = "https://perguntai-nvid.onrender.com";

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
let currentPage = 1;
const itemsPerPage = 5;
let feedbacks = [];
let filterSemRespostas = false;

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

function createReplyElement(r, duvidaId, loggedUserId, token) {
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
        const res = await fetch(`${API}/duvidas/${duvidaId}/respostas/${replyId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          li.remove();
          const duvida = todasDuvidas.find(dv => (dv._id || dv.id) === duvidaId);
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
  
  return li;
}

function createDuvidaElement(d) {
  const id = d._id || d.id;
  const title = d.title || "";
  const description = d.description || "";
  const author = d.author || "Anônimo";
  const createdAt = d.createdAt ? new Date(d.createdAt).toLocaleString("pt-BR") : "";
  const tag = d.tag || "";

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
          renderDuvidasFiltradas();
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
  
  // Mostrar apenas as 3 primeiras respostas
  const maxVisible = 3;
  const visibleReplies = replies.slice(0, maxVisible);
  const hiddenReplies = replies.slice(maxVisible);
  
  visibleReplies.forEach((r) => {
    repliesList.appendChild(createReplyElement(r, id, loggedUserId, token));
  });
  
  // Container para respostas ocultas
  const hiddenContainer = document.createElement("div");
  hiddenContainer.className = "hidden-replies";
  hiddenContainer.style.display = "none";
  repliesList.appendChild(hiddenContainer);
  
  hiddenReplies.forEach((r) => {
    hiddenContainer.appendChild(createReplyElement(r, id, loggedUserId, token));
  });
  
  // Botão "Ver mais respostas" - só aparece se tiver mais de 3 respostas
  if (hiddenReplies.length > 0) {
    const showMoreBtn = document.createElement("button");
    showMoreBtn.className = "btn-show-more-replies";
    showMoreBtn.textContent = `Ver mais ${hiddenReplies.length} resposta(s)`;
    showMoreBtn.addEventListener("click", () => {
      const isHidden = hiddenContainer.style.display === "none";
      hiddenContainer.style.display = isHidden ? "block" : "none";
      showMoreBtn.textContent = isHidden ? "Ocultar respostas" : `Ver mais ${hiddenReplies.length} resposta(s)`;
    });
    wrapper.insertBefore(showMoreBtn, wrapper.querySelector(".reply-area"));
  }

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
        const li = createReplyElement(saved, id, loggedUserId, token);
        repliesList.insertBefore(li, hiddenContainer);
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
    currentPage = 1;
    renderDuvidasFiltradas();
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
  currentFilter = tagText;
  currentPage = 1;
  
  document.querySelectorAll(".sidebar .tag").forEach(t => {
    t.dataset.tag === tagText ? t.classList.add("active") : t.classList.remove("active");
  });
  
  const filterInfo = document.getElementById("filterInfo");
  const btnClear = document.getElementById("btnClearFilter");
  
  if (filterInfo) {
    filterInfo.textContent = `Filtrando: ${tagText}`;
    filterInfo.style.display = "block";
  }
  if (btnClear) btnClear.style.display = "block";
  
  renderDuvidasFiltradas();
  document.getElementById("duvidas")?.scrollIntoView({ behavior: "smooth" });
}

function limparFiltro() {
  currentFilter = "";
  filterSemRespostas = false;
  currentPage = 1;
  
  document.querySelectorAll(".sidebar .tag").forEach(t => t.classList.remove("active"));
  
  const btnSemRespostas = document.getElementById("btnSemRespostas");
  if (btnSemRespostas) btnSemRespostas.classList.remove("active");
  
  const filterInfo = document.getElementById("filterInfo");
  const btnClear = document.getElementById("btnClearFilter");
  
  if (filterInfo) filterInfo.style.display = "none";
  if (btnClear) btnClear.style.display = "none";
  
  renderDuvidasFiltradas();
}

function filtrarSemRespostas() {
  filterSemRespostas = !filterSemRespostas;
  currentPage = 1;
  
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
  
  if (currentFilter) {
    filtered = filtered.filter(d => (d.tag || "").toString().trim() === currentFilter);
  }
  
  if (filterSemRespostas) {
    filtered = filtered.filter(d => (d.replies || []).length === 0);
  }

  if (!filtered.length) {
    container.innerHTML = '<p class="small-muted">Nenhuma dúvida encontrada.</p>';
    const paginationContainer = document.getElementById("pagination");
    if (paginationContainer) paginationContainer.innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  paginatedItems.forEach(d => container.appendChild(createDuvidaElement(d)));
  renderPagination(filtered.length);
}

function renderPagination(totalItems) {
  const paginationContainer = document.getElementById("pagination");
  if (!paginationContainer) return;
  
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }
  
  paginationContainer.innerHTML = "";
  
  const paginationDiv = document.createElement("div");
  paginationDiv.className = "pagination";
  
  if (currentPage > 1) {
    const prevBtn = document.createElement("button");
    prevBtn.className = "pagination-btn";
    prevBtn.textContent = "← Anterior";
    prevBtn.addEventListener("click", () => goToPage(currentPage - 1));
    paginationDiv.appendChild(prevBtn);
  }
  
  const numbersDiv = document.createElement("div");
  numbersDiv.className = "pagination-numbers";
  
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.className = "pagination-num" + (i === currentPage ? " active" : "");
    pageBtn.textContent = i;
    if (i !== currentPage) pageBtn.addEventListener("click", () => goToPage(i));
    numbersDiv.appendChild(pageBtn);
  }
  
  paginationDiv.appendChild(numbersDiv);
  
  if (currentPage < totalPages) {
    const nextBtn = document.createElement("button");
    nextBtn.className = "pagination-btn";
    nextBtn.textContent = "Próxima →";
    nextBtn.addEventListener("click", () => goToPage(currentPage + 1));
    paginationDiv.appendChild(nextBtn);
  }
  
  paginationContainer.appendChild(paginationDiv);
}

function goToPage(page) {
  currentPage = page;
  renderDuvidasFiltradas();
  document.getElementById("duvidas")?.scrollIntoView({ behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname;

  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      
      const eyeOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
      const eyeClosed = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
      
      btn.innerHTML = isPassword ? eyeClosed : eyeOpen;
    });
  });

  if (path.includes("index.html") || path === "/" || path.endsWith("/")) {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");
    const tabs = document.querySelectorAll(".tab-btn");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        document.querySelectorAll(".auth-form").forEach((form) => form.classList.remove("active"));
        (tab.dataset.tab === "login" ? loginForm : registerForm).classList.add("active");
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

    document.getElementById("btnLogout")?.addEventListener("click", logout);

    const btnFazerPergunta = document.getElementById("btnFazerPergunta");
    const postArea = document.querySelector(".post-area");
    
    if (btnFazerPergunta && postArea) {
      btnFazerPergunta.addEventListener("click", () => {
        const isHidden = postArea.style.display === "none";
        postArea.style.display = isHidden ? "block" : "none";
        if (isHidden) setTimeout(() => postArea.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
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
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title, description, tag }),
          });

          if (res.ok) {
            const data = await res.json();
            todasDuvidas.unshift(data);
            currentPage = 1;
            renderDuvidasFiltradas();
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

    document.querySelectorAll(".sidebar .tag").forEach((tag) => {
      tag.addEventListener("click", () => {
        filtrarPorTag(tag.dataset.tag);
        if (postArea) {
          postArea.style.display = "block";
          const tagSelect = document.getElementById("tag");
          if (tagSelect) tagSelect.value = tag.dataset.tag;
        }
      });
    });

    document.getElementById("btnClearFilter")?.addEventListener("click", limparFiltro);
    document.getElementById("btnSemRespostas")?.addEventListener("click", filtrarSemRespostas);

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) { renderDuvidasFiltradas(); return; }

        const container = document.getElementById("duvidas");
        const paginationContainer = document.getElementById("pagination");
        if (!container) return;

        const filtered = todasDuvidas.filter((d) => {
          const title = (d.title || "").toLowerCase();
          const desc = (d.description || "").toLowerCase();
          const tag = (d.tag || "").toLowerCase();
          return title.includes(query) || desc.includes(query) || tag.includes(query);
        });

        container.innerHTML = "";
        if (paginationContainer) paginationContainer.innerHTML = "";
        
        if (!filtered.length) {
          container.innerHTML = '<p class="small-muted">Nenhuma dúvida encontrada.</p>';
          return;
        }

        filtered.forEach((d) => container.appendChild(createDuvidaElement(d)));
      });
    }

    // Modais
    const profileModal = document.getElementById("profileModal");
    const notificationsModal = document.getElementById("notificationsModal");
    
    document.getElementById("btnProfile")?.addEventListener("click", async () => {
      profileModal.style.display = "flex";
      await carregarDadosPerfil();
    });
    document.getElementById("closeProfile")?.addEventListener("click", () => profileModal.style.display = "none");
    document.getElementById("formProfile")?.addEventListener("submit", async (e) => { e.preventDefault(); await atualizarPerfil(); });

    document.getElementById("btnNotifications")?.addEventListener("click", async () => {
      notificationsModal.style.display = "flex";
      await carregarNotificacoes();
    });
    document.getElementById("closeNotifications")?.addEventListener("click", () => notificationsModal.style.display = "none");

    window.addEventListener("click", (e) => {
      if (e.target === profileModal) profileModal.style.display = "none";
      if (e.target === notificationsModal) notificationsModal.style.display = "none";
    });

    // Mobile Menu
    const mobileMenuToggle = document.getElementById("mobileMenuToggle");
    const mobileMenu = document.getElementById("mobileMenu");
    
    if (mobileMenuToggle && mobileMenu) {
      mobileMenuToggle.addEventListener("click", (e) => { e.stopPropagation(); mobileMenu.classList.toggle("active"); });
      document.addEventListener("click", (e) => {
        if (!mobileMenu.contains(e.target) && !mobileMenuToggle.contains(e.target)) mobileMenu.classList.remove("active");
      });
    }

    document.getElementById("btnNotificationsMobile")?.addEventListener("click", async () => {
      notificationsModal.style.display = "flex";
      await carregarNotificacoes();
      mobileMenu?.classList.remove("active");
    });
    document.getElementById("btnProfileMobile")?.addEventListener("click", async () => {
      profileModal.style.display = "flex";
      await carregarDadosPerfil();
      mobileMenu?.classList.remove("active");
    });
    document.getElementById("btnLogoutMobile")?.addEventListener("click", () => { mobileMenu?.classList.remove("active"); logout(); });

    await carregarDuvidas();
    await atualizarBadgeNotificacoes();
    setInterval(atualizarBadgeNotificacoes, 30000);
  }
});

async function carregarDadosPerfil() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const user = await res.json();
      document.getElementById("profileName").value = user.name || "";
      document.getElementById("profileEmail").value = user.email || "";
    }
  } catch (err) { console.error("Erro ao carregar perfil:", err); }
}

async function atualizarPerfil() {
  const token = getToken();
  if (!token) return;
  
  const name = document.getElementById("profileName").value.trim();
  const senha = document.getElementById("profileSenha").value.trim();
  
  if (!name) { alert("Nome é obrigatório!"); return; }
  
  const body = { name };
  if (senha) body.senha = senha;
  
  try {
    const res = await fetch(`${API}/auth/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (res.ok) {
      alert("Perfil atualizado com sucesso!");
      document.getElementById("profileModal").style.display = "none";
      document.getElementById("profileSenha").value = "";
    } else { alert(data.error || "Erro ao atualizar perfil"); }
  } catch (err) { console.error("Erro:", err); alert("Erro de conexão"); }
}

async function carregarNotificacoes() {
  const token = getToken();
  if (!token) return;
  
  const lista = document.getElementById("notificationsList");
  if (!lista) return;
  
  lista.innerHTML = '<p class="small-muted">Carregando...</p>';
  
  try {
    const res = await fetch(`${API}/auth/notifications`, { headers: { Authorization: `Bearer ${token}` } });
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
        div.innerHTML = `<p><strong>${notif.authorName || "Alguém"}</strong> respondeu sua dúvida: <strong>"${notif.duvidaTitle}"</strong></p><small>${new Date(notif.createdAt).toLocaleString("pt-BR")}</small>`;
        lista.appendChild(div);
      });
      await fetch(`${API}/auth/notifications/mark-read`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      await atualizarBadgeNotificacoes();
    } else { lista.innerHTML = '<p class="small-muted">Erro ao carregar notificações.</p>'; }
  } catch (err) { console.error("Erro:", err); lista.innerHTML = '<p class="small-muted">Erro de conexão.</p>'; }
}

async function atualizarBadgeNotificacoes() {
  const token = getToken();
  if (!token) return;
  try {
    const res = await fetch(`${API}/auth/notifications/count`, { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      const badge = document.getElementById("notificationBadge");
      const badgeMobile = document.getElementById("notificationBadgeMobile");
      [badge, badgeMobile].forEach(b => {
        if (b) {
          b.textContent = data.count;
          b.style.display = data.count > 0 ? "block" : "none";
        }
      });
    }
  } catch (err) { console.error("Erro ao atualizar badge:", err); }
}