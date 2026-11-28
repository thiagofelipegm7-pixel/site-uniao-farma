"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, Clock3, MessageCircle, Plus, Search, Send, Sparkles, UserRound, UsersRound, X } from "lucide-react";
import { WHATSAPP_SLA } from "../../site-config";

type Status = "novo" | "em_atendimento" | "aguardando" | "encerrado";
type Conversa = { id: string; nome: string; telefone: string; status: Status; atualizadoEm: string; ultimaEntradaEm: string | null; preview: string; naoLidas: number; unidade?: string };
type Mensagem = { id: string; tipo: "entrada" | "saida" | "nota"; texto: string; criadaEm: string };
type Detalhe = { conversa: Conversa; mensagens: Mensagem[]; modo?: "demo" | "real"; envioDisponivel?: boolean };
const statusLabel: Record<Status, string> = { novo: "Novo", em_atendimento: "Em atendimento", aguardando: "Aguardando", encerrado: "Encerrado" };
const displayName = (name: string, phone: string) => name.trim() || phone || "Contato sem nome";
const initials = (name: string, phone = "") => displayName(name, phone).split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const time = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)) : "";
const fullDate = (value?: string | null) => value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value)) : "";

export default function CrmClient() {
  const [items, setItems] = useState<Conversa[]>([]);
  const [activeId, setActiveId] = useState("");
  const [detailState, setDetailState] = useState<{ id: string; data: Detalhe } | null>(null);
  const [filter, setFilter] = useState("todas");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [noteMode, setNoteMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>();
  const [error, setError] = useState("");
  const [mobileChat, setMobileChat] = useState(false);
  const [mode, setMode] = useState<"demo" | "real" | null>(null);
  const [sendingAvailable, setSendingAvailable] = useState(true);
  const activeIdRef = useRef(activeId);
  const draftByConversation = useRef(new Map<string, string>());
  const requestIds = useRef(new Map<string, string>());
  const readTimestamps = useRef(new Set<string>());
  const detail = detailState?.id === activeId ? detailState.data : null;
  const loadDetail = useCallback(async (id: string) => {
    const res = await fetch(`/api/interno/crm?id=${encodeURIComponent(id)}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || "Não foi possível abrir a conversa.");
    if (activeIdRef.current !== id) return data as Detalhe;
    setNow(Date.now());
    setDetailState({ id, data });
    if (data.modo) setMode(data.modo);
    if (typeof data.envioDisponivel === "boolean") setSendingAvailable(data.envioDisponivel);
    const timestamp = data.conversa?.ultimaEntradaEm;
    const key = `${id}:${timestamp || ""}`;
    if (id === activeIdRef.current && data.conversa?.naoLidas > 0 && timestamp && !readTimestamps.current.has(key)) {
      readTimestamps.current.add(key);
      try {
        const readRes = await fetch("/api/interno/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, acao: "ler", valor: timestamp }) });
        if (readRes.ok) {
          const listRes = await fetch("/api/interno/crm", { cache: "no-store" });
          const listData = await listRes.json(); if (listRes.ok) setItems(listData.conversas || []);
          const latestRes = await fetch(`/api/interno/crm?id=${encodeURIComponent(id)}`, { cache: "no-store" });
          const latest = await latestRes.json(); if (latestRes.ok) setDetailState({ id, data: latest });
        } else readTimestamps.current.delete(key);
      } catch { readTimestamps.current.delete(key); }
    }
    return data as Detalhe;
  }, []);

  const refresh = useCallback(async (preferredId?: string) => {
    try {
      const res = await fetch("/api/interno/crm", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || "Não foi possível carregar as conversas.");
      const conversations: Conversa[] = data.conversas || [];
      setNow(Date.now());
      if (data.modo) setMode(data.modo);
      if (typeof data.envioDisponivel === "boolean") setSendingAvailable(data.envioDisponivel);
      setItems(conversations);
      setActiveId((current) => preferredId || (current && conversations.some((c) => c.id === current) ? current : conversations[0]?.id || ""));
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao carregar."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const initial = window.setTimeout(() => void refresh(), 0); const timer = window.setInterval(() => { void refresh(); if (activeId) void loadDetail(activeId).catch(() => {}); }, 30000); return () => { window.clearTimeout(initial); window.clearInterval(timer); }; }, [refresh, activeId, loadDetail]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => {
    if (!activeId) return;
    let live = true;
    (async () => {
      try {
        await loadDetail(activeId);
      } catch (e) { if (live) setError(e instanceof Error ? e.message : "Falha ao abrir conversa."); }
    })();
    return () => { live = false; };
  }, [activeId, loadDetail]);

  const visible = useMemo(() => items.filter((c) => {
    const matchesFilter = filter === "todas" || (filter === "nao_lidas" ? c.naoLidas > 0 : filter.startsWith("unidade:") ? c.unidade === filter.slice(8) : c.status === filter);
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return matchesFilter && (!term || `${c.nome} ${c.telefone} ${c.preview}`.toLocaleLowerCase("pt-BR").includes(term));
  }), [items, filter, query]);
  const units = useMemo(() => Array.from(new Set(items.map((item) => item.unidade).filter((unit): unit is string => Boolean(unit)))), [items]);
  const active = detail?.conversa || items.find((c) => c.id === activeId) || null;
  const withinWindow = Boolean(active?.ultimaEntradaEm && now && now - new Date(active.ultimaEntradaEm).getTime() < 24 * 60 * 60 * 1000);
  const unreadCount = items.reduce((sum, c) => sum + (c.naoLidas || 0), 0);

  const action = async (acao: string, valor?: string, id = activeId) => {
    if (!id || busy) return false;
    setBusy(true);
    try {
      const key = `${id}:${valor || ""}`;
      let requestId: string | undefined;
      if (acao === "responder" && typeof globalThis.crypto?.randomUUID === "function") {
        requestId = requestIds.current.get(key) || globalThis.crypto.randomUUID();
        requestIds.current.set(key, requestId);
      }
      const res = await fetch("/api/interno/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, acao, ...(valor !== undefined ? { valor } : {}), ...(requestId ? { solicitacaoId: requestId } : {}) }) });
      const data = await res.json();
      if (!res.ok || data.erro) throw new Error(data.erro || "Ação não concluída.");
      if (requestId) requestIds.current.delete(key);
      await refresh(id);
      if (acao === "responder" || acao === "nota" || acao === "status") await loadDetail(id);
      return true;
    } catch (e) { setError(e instanceof Error ? e.message : "Ação não concluída."); return false; }
    finally { setBusy(false); }
  };
  const selectConversation = (id: string) => {
    draftByConversation.current.set(activeId, draft);
    setDraft(draftByConversation.current.get(id) || "");
    setNoteDraft(""); setNoteMode(false); activeIdRef.current = id; setActiveId(id); setMobileChat(true);
  };
  const submit = async (event: FormEvent) => { event.preventDefault(); const targetId = activeId; const message = draft.trim(); if (!message || !withinWindow || message.length > 4096) return; if (await action("responder", message, targetId)) { draftByConversation.current.delete(targetId); if (activeIdRef.current === targetId) setDraft(""); } };
  const changeStatus = (event: React.ChangeEvent<HTMLSelectElement>) => { void action("status", event.target.value); };
  const addNote = async () => { const note = noteDraft.trim(); if (note && await action("nota", note)) { setNoteDraft(""); setNoteMode(false); } };
  const whatsapp = active && mode !== "demo" ? `https://wa.me/${active.telefone.replace(/\D/g, "")}` : "#";

  return <main className="crm-page">
    <header className="crm-header">
      <div><p className="crm-eyebrow"><span className="crm-live-dot" /> CENTRAL DE RELACIONAMENTO</p><h1>CRM WhatsApp</h1><p className="crm-subtitle">Conversas das lojas em um só lugar. Meta da equipe: primeira resposta {WHATSAPP_SLA}.</p></div>
      <div className="crm-header-actions"><div className="crm-agent"><span className="crm-agent-avatar">UF</span><span><strong>Equipe União Farma</strong><small>Central de atendimento</small></span>{mode === "real" && <span className="crm-online" />}</div></div>
    </header>
    <section className="crm-stats" aria-label="Resumo da fila">
      <div className="crm-stat"><span className="crm-stat-icon purple"><MessageCircle size={17} /></span><span><small>Conversas na fila</small><strong>{items.length}</strong></span></div>
      <div className="crm-stat"><span className="crm-stat-icon amber"><Sparkles size={17} /></span><span><small>Precisam de atenção</small><strong>{unreadCount.toString().padStart(2, "0")}</strong></span></div>
      <div className="crm-stat"><span className="crm-stat-icon green"><UsersRound size={17} /></span><span><small>Em atendimento</small><strong>{items.filter((c) => c.status === "em_atendimento").length}</strong></span></div>
      <div className="crm-service"><span className="crm-service-icon"><Clock3 size={17} /></span><span><strong>{mode === "demo" ? "Ambiente de demonstração" : mode === "real" ? "Atendimento conectado" : "Carregando atendimento"}</strong><small>{mode === "demo" ? "Mensagens de teste não são enviadas ao cliente" : mode === "real" ? "Atualizado automaticamente a cada 30 segundos" : "Conferindo conexão com o WhatsApp"}</small></span></div>
    </section>
    {error && <div className="crm-error" role="alert">{error}<button onClick={() => setError("")}>Fechar</button></div>}
    <section className={`crm-workspace ${mobileChat ? "show-chat" : ""}`} aria-label="Caixa de entrada">
      <aside className="crm-inbox">
        <div className="crm-inbox-heading"><div><h2>Caixa de entrada</h2><span>{items.length} conversas</span></div></div>
        <label className="crm-search"><Search size={16} /><input type="search" placeholder="Buscar conversa..." value={query} onChange={(e) => setQuery(e.target.value)} /></label>
        <div className="crm-filters" role="tablist" aria-label="Filtrar conversas">
          {[ ["todas", "Todas"], ["nao_lidas", "Não lidas"], ["novo", "Novos"], ["em_atendimento", "Em atendimento"], ["aguardando", "Aguardando"], ["encerrado", "Encerrados"] ].map(([value, label]) => <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{label}{value === "nao_lidas" && unreadCount > 0 && <i>{unreadCount}</i>}</button>)}
          {units.map((unit) => { const value = `unidade:${unit}`; return <button key={value} role="tab" aria-selected={filter === value} className={filter === value ? "selected" : ""} onClick={() => setFilter(value)}>{unit}</button>; })}
        </div>
        <div className="crm-list" aria-live="polite">
          {loading ? <div className="crm-list-empty">Carregando conversas…</div> : visible.length ? visible.map((conversation) => <button key={conversation.id} className={`crm-conversation ${activeId === conversation.id ? "active" : ""}`} onClick={() => selectConversation(conversation.id)}>
            <span className={`crm-avatar avatar-${conversation.id.length % 5}`}>{initials(conversation.nome, conversation.telefone)}</span><span className="crm-conversation-content"><span className="crm-conversation-top"><strong>{displayName(conversation.nome, conversation.telefone)}</strong><time>{time(conversation.atualizadoEm)}</time></span><span className="crm-preview">{conversation.preview || "Sem mensagens"}</span><span className="crm-conversation-bottom"><span className={`crm-pill ${conversation.status}`}>{statusLabel[conversation.status]}</span>{conversation.naoLidas > 0 && <span className="crm-unread">{conversation.naoLidas}</span>}</span></span>
          </button>) : <div className="crm-list-empty"><span className="crm-empty-icon"><MessageCircle size={20} /></span><strong>Nenhuma conversa por aqui</strong><span>Quando alguém chamar no WhatsApp, a conversa aparece nesta fila.</span></div>}
        </div>
        <div className="crm-inbox-footer"><span className="crm-live-dot" /> Sincronização ativa <button onClick={() => void refresh()} aria-label="Atualizar conversas"><span>↻</span></button></div>
      </aside>
      <section className="crm-thread">
        {active ? <>
          <header className="crm-thread-header"><button className="crm-back" onClick={() => setMobileChat(false)} aria-label="Voltar para conversas"><ArrowLeft size={19} /></button><span className="crm-avatar avatar-large">{initials(active.nome, active.telefone)}</span><div className="crm-contact-heading"><h2>{displayName(active.nome, active.telefone)}</h2><span>{active.telefone} <i /> {active.unidade || "WhatsApp"} {mode === "demo" && <em className="crm-demo-badge">DEMO</em>}</span></div><div className="crm-thread-actions">{mode === "real" && <a href={whatsapp} target="_blank" rel="noreferrer" className="crm-whatsapp-link"><MessageCircle size={16} /> Abrir WhatsApp <ArrowUpRight size={14} /></a>}</div></header>
          <div className="crm-contact-strip"><span><UserRound size={15} /> Atendimento</span><label><span className="crm-strip-label">Status</span><select aria-label="Status da conversa" value={active.status} onChange={changeStatus} disabled={busy}>{Object.entries(statusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
          <div className="crm-messages" aria-live="polite">
            <div className="crm-day-divider"><span>Histórico da conversa</span></div>
            <div className="crm-window-note"><Clock3 size={14} /> Resposta livre disponível por 24h após a última mensagem do cliente.</div>
            {detail?.mensagens.map((message) => message.tipo === "nota" ? <div className="crm-note" key={message.id}><Sparkles size={14} /><span><strong>Nota interna</strong>{message.texto}</span><time>{fullDate(message.criadaEm)}</time></div> : <div className={`crm-message ${message.tipo}`} key={message.id}><p>{message.texto}</p><span>{time(message.criadaEm)}</span></div>)}
            {!detail && <div className="crm-messages-loading">Abrindo histórico…</div>}
          </div>
          <footer className="crm-composer-area">
            {withinWindow ? <><div className="crm-window-open"><span className="crm-window-check"><Check size={12} /></span> Janela de 24h aberta <span>·</span> {mode === "demo" ? "envio simulado" : "resposta livre habilitada"}</div><form className="crm-composer" onSubmit={submit}><textarea aria-label="Escreva sua mensagem" placeholder="Escreva sua mensagem…" value={draft} maxLength={4096} onChange={(e) => { setDraft(e.target.value); draftByConversation.current.set(activeId, e.target.value); }} rows={1} disabled={!sendingAvailable || !detail} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} /><button type="submit" className="crm-send" disabled={busy || !sendingAvailable || !detail || !draft.trim()} aria-label="Enviar mensagem"><Send size={17} /></button></form><div className="crm-composer-foot"><span>{draft.length}/4096 · {sendingAvailable ? "Enter para enviar · Shift + Enter para nova linha" : "Envio indisponível no momento"}</span><button onClick={() => setNoteMode((open) => !open)}><Plus size={14} /> Nota interna</button></div>{noteMode && <div className="crm-note-composer"><textarea aria-label="Nota interna" maxLength={2000} placeholder="Escreva uma nota visível somente para a equipe…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={2} /><div><span>{noteDraft.length}/2000</span><button onClick={() => { setNoteMode(false); setNoteDraft(""); }} aria-label="Cancelar nota"><X size={14} /></button><button onClick={() => void addNote()} disabled={busy || !noteDraft.trim()}>Salvar nota</button></div></div>}</> : <div className="crm-window-closed"><Clock3 size={18} /><div><strong>Janela de 24h encerrada</strong><span>{mode === "demo" ? "A demonstração aguarda uma nova mensagem do cliente." : "Para retomar o atendimento, abra o WhatsApp e envie um modelo aprovado."}</span></div>{mode === "real" && <a href={whatsapp} target="_blank" rel="noreferrer">Abrir WhatsApp <ArrowUpRight size={14} /></a>}<button onClick={() => setNoteMode((open) => !open)}>Adicionar nota</button>{noteMode && <div className="crm-note-composer"><textarea aria-label="Nota interna" maxLength={2000} placeholder="Nota visível somente para a equipe…" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={2} /><div><span>{noteDraft.length}/2000</span><button onClick={() => { setNoteMode(false); setNoteDraft(""); }} aria-label="Cancelar nota"><X size={14} /></button><button onClick={() => void addNote()} disabled={busy || !noteDraft.trim()}>Salvar nota</button></div></div>}</div>}
          </footer>
        </> : <div className="crm-empty-thread"><span><MessageCircle size={26} /></span><h2>Escolha uma conversa</h2><p>Selecione alguém na caixa de entrada para ver o histórico e continuar o atendimento.</p></div>}
      </section>
        {active && <aside className="crm-details"><div className="crm-details-top"><h2>Detalhes do contato</h2></div><div className="crm-profile"><span className="crm-avatar profile-avatar">{initials(active.nome, active.telefone)}</span><h3>{displayName(active.nome, active.telefone)}</h3><p>{active.telefone}</p>{mode === "real" && <a href={whatsapp} target="_blank" rel="noreferrer"><MessageCircle size={15} /> Abrir no WhatsApp</a>}</div><div className="crm-detail-section"><h3>Informações</h3><div className="crm-detail-row"><span>Canal</span><strong><i className="crm-channel-dot" /> WhatsApp</strong></div><div className="crm-detail-row"><span>Unidade</span><strong>{active.unidade || "—"}</strong></div><div className="crm-detail-row"><span>Última mensagem</span><strong>{fullDate(active.atualizadoEm) || "—"}</strong></div><div className="crm-detail-row"><span>Atendimento</span><strong>Equipe União Farma</strong></div></div><div className="crm-detail-section crm-activity"><h3>Atividade recente</h3><div><span className="crm-activity-dot" /><p><strong>Conversa recebida</strong><small>{fullDate(active.atualizadoEm)}</small></p></div></div><button className="crm-add-note" onClick={() => setNoteMode((open) => !open)}><Plus size={15} /> Adicionar nota interna</button></aside>}
    </section>
    <div className="crm-privacy"><span><Check size={12} /></span> Acesso restrito à equipe União Farma · dados tratados conforme a LGPD</div>
  </main>;
}
