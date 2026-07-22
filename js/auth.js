async function aiOfficeLogin(email, password) {
  if (aiOfficeSupabase) {
    const { data, error } = await aiOfficeSupabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { mode: "supabase", data };
  }

  if (window.AI_OFFICE_CONFIG.DEMO_MODE &&
      email.toLowerCase() === "cliente@aioffice.pt" &&
      password === "demo2026") {
    sessionStorage.setItem("aiOfficeDemoAuthenticated", "true");
    return { mode: "demo" };
  }

  throw new Error("Credenciais inválidas.");
}

async function aiOfficeLogout() {
  if (aiOfficeSupabase) {
    await aiOfficeSupabase.auth.signOut();
  }
  sessionStorage.removeItem("aiOfficeDemoAuthenticated");
  window.location.href = "login.html";
}

async function aiOfficeRequireAuth() {
  if (aiOfficeSupabase) {
    const { data } = await aiOfficeSupabase.auth.getSession();
    if (!data.session) {
      window.location.href = "login.html";
      return null;
    }
    return data.session;
  }

  if (sessionStorage.getItem("aiOfficeDemoAuthenticated") !== "true") {
    window.location.href = "login.html";
    return null;
  }

  return { demo: true };
}
