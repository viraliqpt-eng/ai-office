const { createClient } = require('@supabase/supabase-js');

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(payload)
  };
}

function makeTitle(text, attachment) {
  if (attachment?.name) return `Documento: ${attachment.name}`.slice(0, 70);
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 70) || 'Nova conversa';
}

function extractResponseText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const parts = [];
  for (const item of Array.isArray(data.output) ? data.output : []) {
    for (const content of Array.isArray(item.content) ? item.content : []) {
      if (content?.type === 'output_text' && typeof content.text === 'string') parts.push(content.text);
    }
  }
  return parts.join('\n').trim();
}

async function uploadOpenAIFile(apiKey, attachment) {
  const bytes = Buffer.from(attachment.data, 'base64');
  const form = new FormData();
  form.append('purpose', 'user_data');
  form.append(
    'file',
    new Blob([bytes], { type: attachment.type || 'application/octet-stream' }),
    attachment.name || 'documento'
  );

  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });

  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); }
  catch { throw new Error(`A OpenAI devolveu uma resposta inválida ao guardar o documento (${response.status}).`); }

  if (!response.ok) {
    throw new Error(data?.error?.message || `Não foi possível guardar o documento na OpenAI (${response.status}).`);
  }
  return data.id;
}

function buildInput(prompt, fileId) {
  const content = [{
    type: 'input_text',
    text: prompt || 'Analisa este documento e apresenta um resumo estruturado.'
  }];

  if (fileId) {
    content.push({ type: 'input_file', file_id: fileId });
  }

  return [{ role: 'user', content }];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' });

  let payload;
  try { payload = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'Pedido inválido.' }); }

  const prompt = String(payload.prompt || '').trim();
  const attachment = payload.attachment || null;
  const existingDocumentId = payload.documentId || null;

  if (!prompt && !attachment && !existingDocumentId) {
    return json(400, { error: 'Escreva um pedido ou selecione um documento.' });
  }

  if (prompt.length > 4000) {
    return json(400, { error: 'O pedido não pode ultrapassar 4000 caracteres.' });
  }

  if (attachment) {
    if (!attachment.name || !attachment.data) {
      return json(400, { error: 'O documento anexado está incompleto.' });
    }
    const estimatedBytes = Math.ceil(String(attachment.data).length * 0.75);
    if (estimatedBytes > 4 * 1024 * 1024) {
      return json(413, { error: 'O documento excede o limite de 4 MB desta versão.' });
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: 'Supabase não configurado na Netlify.' });
  }

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const authHeader = event.headers.authorization || event.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return json(401, { error: 'Sessão inválida. Inicie sessão novamente.' });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(401, { error: 'Não foi possível validar a sessão.' });

  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, plan')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (customerError || !customer) return json(403, { error: 'Perfil de cliente não encontrado.' });

  const limits = { starter: 50, business: 250, complete: 1000 };
  const limit = limits[String(customer.plan || 'starter').toLowerCase()] || 50;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { count } = await supabase
    .from('ai_requests')
    .select('*', { count: 'exact', head: true })
    .eq('customer_id', customer.id)
    .gte('created_at', monthStart);

  if ((count || 0) >= limit) return json(429, { error: 'Atingiu o limite mensal do seu plano.' });

  const apiKey = String(process.env.AI_API_KEY || '').trim();
  const model = String(process.env.AI_MODEL || 'gpt-5-mini').trim();
  if (!apiKey) return json(500, { error: 'A variável AI_API_KEY não está configurada.' });

  let documentRow = null;
  let fileId = null;

  if (existingDocumentId) {
    const { data: existingDocument, error: documentError } = await supabase
      .from('ai_documents')
      .select('id,filename,mime_type,file_size,openai_file_id,status')
      .eq('id', existingDocumentId)
      .eq('customer_id', customer.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (documentError || !existingDocument) {
      return json(404, { error: 'Documento não encontrado.' });
    }
    if (!existingDocument.openai_file_id) {
      return json(409, { error: 'Este documento antigo precisa de ser anexado novamente uma vez.' });
    }

    documentRow = existingDocument;
    fileId = existingDocument.openai_file_id;
  }

  if (attachment) {
    try {
      fileId = await uploadOpenAIFile(apiKey, attachment);
    } catch (error) {
      return json(502, { error: error.message });
    }

    const { data: insertedDocument, error: documentSaveError } = await supabase
      .from('ai_documents')
      .insert({
        customer_id: customer.id,
        filename: attachment.name,
        mime_type: attachment.type || null,
        file_size: attachment.size || null,
        openai_file_id: fileId,
        status: 'ready',
        last_used_at: new Date().toISOString()
      })
      .select('id,filename,mime_type,file_size,openai_file_id,status')
      .single();

    if (documentSaveError) {
      return json(500, { error: 'O documento foi carregado, mas não foi possível guardá-lo na biblioteca.' });
    }
    documentRow = insertedDocument;
  }

  let conversationId = payload.conversationId || null;

  if (conversationId) {
    const { data: existingConversation } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('customer_id', customer.id)
      .maybeSingle();

    if (!existingConversation) return json(403, { error: 'Conversa inválida.' });
  } else {
    const { data: created, error: createError } = await supabase
      .from('ai_conversations')
      .insert({
        customer_id: customer.id,
        title: makeTitle(prompt, attachment || documentRow),
        agent_type: payload.agent || 'general'
      })
      .select('id')
      .single();

    if (createError) return json(500, { error: 'Não foi possível criar a conversa.' });
    conversationId = created.id;
  }

  let answer;

  try {
    const openaiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        instructions: [
          'És o AI Office™ Intelligence.',
          'Responde sempre em português de Portugal.',
          'Age como um assistente empresarial profissional, claro e prático.',
          'Quando existir um documento, responde apenas com base no conteúdo suportado.',
          'Distingue dados do documento de recomendações adicionais.',
          'Não inventes nomes, números, cláusulas ou conclusões ausentes.',
          'Por defeito, apresenta respostas executivas e concisas. Só aprofunda quando solicitado.'
        ].join(' '),
        input: buildInput(prompt, fileId)
      })
    });

    const rawBody = await openaiResponse.text();
    let openaiData;
    try { openaiData = JSON.parse(rawBody); }
    catch { throw new Error(`A OpenAI devolveu uma resposta não reconhecida (${openaiResponse.status}).`); }

    if (!openaiResponse.ok) {
      throw new Error(openaiData?.error?.message || openaiData?.message || `Erro da OpenAI (${openaiResponse.status}).`);
    }

    answer = extractResponseText(openaiData);
    if (!answer) throw new Error('A OpenAI devolveu uma resposta vazia.');
  } catch (error) {
    return json(502, { error: error.message });
  }

  const { data: requestRow, error: saveError } = await supabase
    .from('ai_requests')
    .insert({
      customer_id: customer.id,
      conversation_id: conversationId,
      agent_type: payload.agent || 'general',
      prompt: prompt || `Documento: ${documentRow?.filename || 'documento'}`,
      answer,
      status: 'completed'
    })
    .select('id')
    .single();

  if (saveError) {
    return json(500, { error: 'A resposta foi criada, mas não foi possível guardar a conversa.' });
  }

  if (documentRow) {
    await supabase
      .from('ai_documents')
      .update({
        conversation_id: conversationId,
        request_id: requestRow?.id || null,
        last_used_at: new Date().toISOString()
      })
      .eq('id', documentRow.id)
      .eq('customer_id', customer.id);
  }

  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('customer_id', customer.id);

  return json(200, {
    answer,
    conversationId,
    document: documentRow ? {
      id: documentRow.id,
      filename: documentRow.filename,
      type: documentRow.mime_type,
      size: documentRow.file_size
    } : null
  });
};
