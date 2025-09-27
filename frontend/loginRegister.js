// auth-extra.js
// NÃO previne envio. Só lê pelos ids e mostra info para debug.

document.addEventListener("DOMContentLoaded", () => {
  const out = document.getElementById("debugOutput");
  const logBtn = document.getElementById("btnDebugLog");
  const checkBtn = document.getElementById("btnCheckFiles");

  function safeText(s) { return String(s === null || s === undefined ? "" : s); }

  logBtn.addEventListener("click", () => {
    // lê valores diretamente pelos ids (não depende de name)
    const loginEmail = document.getElementById("loginEmail")?.value || "";
    const loginPassword = document.getElementById("loginPassword")?.value || "";
    const registerName = document.getElementById("registerName")?.value || "";
    const registerEmail = document.getElementById("registerEmail")?.value || "";
    const registerPassword = document.getElementById("registerPassword")?.value || "";

    const info = {
      login: { email: safeText(loginEmail), passwordLength: loginPassword.length },
      register: { name: safeText(registerName), email: safeText(registerEmail), passwordLength: registerPassword.length },
      forms: Array.from(document.querySelectorAll("form")).map(f => ({ id: f.id || null, action: f.action || null, method: (f.method||"GET").toUpperCase() }))
    };

    console.log("=== Debug: valores dos inputs (não altera envio) ===");
    console.log(info);
    console.log("===================================================");

    out.textContent = "Dados registrados no console. (Senha mostrada apenas como comprimento por segurança)";
    // limpa mensagem depois de 4s
    setTimeout(() => { if (out) out.textContent = ""; }, 4000);
  });

  checkBtn.addEventListener("click", () => {
    const cssLoaded = !!document.querySelector('link[href="auth.css"], link[href="./auth.css"], link[href="/auth.css"]');
    const jsLoaded = !!document.querySelector('script[src="loginRegister.js"], script[src="./loginRegister.js"], script[src="/loginRegister.js"]');

    const msg = [
      `auth.css carregado: ${cssLoaded ? "✅" : "❌"}`,
      `loginRegister.js carregado: ${jsLoaded ? "✅" : "❌"}`,
      `número de forms na página: ${document.querySelectorAll("form").length}`
    ].join("\n");

    console.log("=== Check arquivos ===\n" + msg);
    out.textContent = msg;
    setTimeout(() => { if (out) out.textContent = ""; }, 7000);
  });
});
