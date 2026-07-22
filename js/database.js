async function aiOfficeGetClientDashboard() {
  if (!aiOfficeSupabase) {
    return {
      profile: {
        full_name: "João Silva",
        company_name: "Silva Imobiliária, Lda.",
        sector: "Imobiliário"
      },
      orders: [
        {
          order_number: "AO-2026-0007",
          service_name: "Business",
          status: "Em produção",
          progress: 70,
          value_eur: 399,
          delivery_date: "2026-07-24"
        }
      ],
      documents: [
        { name: "Proposta comercial", file_type: "PDF", size_label: "1,2 MB" },
        { name: "Modelos de email", file_type: "DOCX", size_label: "620 KB" },
        { name: "Checklist", file_type: "XLSX", size_label: "340 KB" }
      ],
      messages: [
        {
          sender_role: "admin",
          body: "O seu pedido já está em produção.",
          created_at: "2026-07-22T18:40:00"
        }
      ]
    };
  }

  const { data: userData, error: userError } = await aiOfficeSupabase.auth.getUser();
  if (userError) throw userError;

  const userId = userData.user.id;

  const [profileResult, ordersResult, documentsResult, messagesResult] = await Promise.all([
    aiOfficeSupabase.from("profiles").select("*").eq("id", userId).single(),
    aiOfficeSupabase.from("orders").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
    aiOfficeSupabase.from("documents").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
    aiOfficeSupabase.from("messages").select("*").eq("client_id", userId).order("created_at", { ascending: true })
  ]);

  if (profileResult.error) throw profileResult.error;
  if (ordersResult.error) throw ordersResult.error;
  if (documentsResult.error) throw documentsResult.error;
  if (messagesResult.error) throw messagesResult.error;

  return {
    profile: profileResult.data,
    orders: ordersResult.data,
    documents: documentsResult.data,
    messages: messagesResult.data
  };
}

async function aiOfficeCreateOrder(payload) {
  if (!aiOfficeSupabase) {
    const orders = JSON.parse(localStorage.getItem("aiOfficeClientOrders") || "[]");
    orders.push({ ...payload, created_at: new Date().toISOString() });
    localStorage.setItem("aiOfficeClientOrders", JSON.stringify(orders));
    return payload;
  }

  const { data: userData, error: userError } = await aiOfficeSupabase.auth.getUser();
  if (userError) throw userError;

  const { data, error } = await aiOfficeSupabase
    .from("orders")
    .insert({
      client_id: userData.user.id,
      service_name: payload.service_name,
      priority: payload.priority,
      description: payload.description,
      status: "Novo",
      progress: 10
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function aiOfficeSendMessage(body) {
  if (!aiOfficeSupabase) return { body };

  const { data: userData, error: userError } = await aiOfficeSupabase.auth.getUser();
  if (userError) throw userError;

  const { data, error } = await aiOfficeSupabase
    .from("messages")
    .insert({
      client_id: userData.user.id,
      sender_id: userData.user.id,
      sender_role: "client",
      body
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
