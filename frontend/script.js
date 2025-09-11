const API_URL = "https://tcem-duvidas-backend.onrender.com";

async function carregarDuvidas() {
  const res = await fetch(API_URL);
  const duvidas = await res.json();

  const div = document.getElementById("duvidas");
  div.innerHTML = "";

  duvidas.forEach(duvida => {
    const duvidaDiv = document.createElement("div");
    duvidaDiv.classList.add("duvida");
    duvidaDiv.innerHTML = `
      <h3>${duvida.titulo}</h3>
      <p>${duvida.descricao}</p>
      <p><b>Autor:</b> ${duvida.autor}</p>
      <div id="respostas-${duvida._id}">
        ${duvida.respostas.map(r => `<div class="resposta"><b>${r.autor}:</b> ${r.texto}</div>`).join("")}
      </div>
      <input type="text" id="resposta-texto-${duvida._id}" placeholder="Sua resposta">
      <input type="text" id="resposta-autor-${duvida._id}" placeholder="Seu nome">
      <button onclick="enviarResposta('${duvida._id}')">Responder</button>
    `;
    div.appendChild(duvidaDiv);
  });
}

async function enviarDuvida() {
  const titulo = document.getElementById("titulo").value;
  const descricao = document.getElementById("descricao").value;
  const autor = document.getElementById("autor").value;

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ titulo, descricao, autor, respostas: [] })
  });

  document.getElementById("titulo").value = "";
  document.getElementById("descricao").value = "";
  document.getElementById("autor").value = "";

  carregarDuvidas();
}

async function enviarResposta(id) {
  const texto = document.getElementById(`resposta-texto-${id}`).value;
  const autor = document.getElementById(`resposta-autor-${id}`).value;

  await fetch(`${API_URL}/${id}/resposta`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto, autor })
  });

  document.getElementById(`resposta-texto-${id}`).value = "";
  document.getElementById(`resposta-autor-${id}`).value = "";

  carregarDuvidas();
}


carregarDuvidas();
