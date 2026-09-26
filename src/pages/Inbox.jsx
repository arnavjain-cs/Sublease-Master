import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChatCircleDots, PaperPlaneTilt } from '@phosphor-icons/react';
import { api, dateRange } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, ButtonLink, EmptyState, PageLoader, Textarea } from '../components/UI';

export default function Inbox() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [threads, setThreads] = useState(null);
  const [thread, setThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const bottom = useRef(null);
  useEffect(() => { api('/threads').then(({ threads: items }) => setThreads(items)).catch((caught) => setError(caught.message)); }, [id]);
  useEffect(() => {
    if (!id) { setThread(null); setMessages([]); return; }
    let active = true;
    api(`/threads/${id}`).then((result) => { if (active) { setThread(result.thread); setMessages(result.messages); } }).catch((caught) => { if (active) setError(caught.message); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [messages.length]);
  async function send(event) {
    event.preventDefault(); if (!body.trim()) return;
    setBusy(true); setError('');
    try { await api(`/threads/${id}/messages`, { method: 'POST', body: { body } }); const result = await api(`/threads/${id}`); setMessages(result.messages); setBody(''); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  return <div className="inbox-page shell page-pad"><div className="page-heading"><p className="overline">The conversation starts here</p><h1>Your inbox.</h1><p>Keep questions and plans with each listing.</p></div><Alert>{error}</Alert>{threads === null ? <PageLoader /> : threads.length ? <div className="inbox-layout"><aside className={`thread-list ${id ? 'thread-list--hide-mobile' : ''}`} aria-label="Conversations"><div className="thread-list-head"><h2>Conversations</h2><span>{threads.length}</span></div>{threads.map((item) => <button type="button" key={item.id} className={`thread-item ${item.id === id ? 'is-active' : ''}`} onClick={() => navigate(`/inbox/${item.id}`)}><img src={item.photo || '/images/room-olive.jpg'} alt="" /><span><strong>{item.counterpart}</strong><small>{item.listingTitle}</small><em>{item.lastMessage}</em></span></button>)}</aside><section className={`conversation ${!id ? 'conversation--hide-mobile' : ''}`} aria-label="Messages">{thread ? <><div className="conversation-head"><Link className="conversation-back" to="/inbox" aria-label="Back to conversations"><ArrowLeft size={20} /></Link><div><h2>{thread.counterpart}</h2><Link to={`/rooms/${thread.listingId}`}>{thread.listingTitle} <ArrowRight size={14} /></Link></div></div>{thread.requestedFrom && <p className="conversation-dates">Requested dates: {dateRange(thread.requestedFrom, thread.requestedTo || thread.requestedFrom)}</p>}<div className="message-list">{messages.map((message) => <div key={message.id} className={`message ${message.senderId === user.id ? 'message--mine' : ''}`}><p>{message.body}</p><small>{new Date(`${message.createdAt.replace(' ', 'T')}Z`).toLocaleString()}</small></div>)}<div ref={bottom} /></div><form className="message-composer" onSubmit={send}><label className="visually-hidden" htmlFor="message-body">Your message</label><textarea id="message-body" rows={2} maxLength={1500} required placeholder="Write a message..." value={body} onChange={(e) => setBody(e.target.value)} /><Button type="submit" loading={busy} aria-label="Send message"><PaperPlaneTilt size={19} /></Button></form></> : <div className="conversation-placeholder"><ChatCircleDots size={34} /><h2>Select a conversation</h2><p>Your messages will appear here.</p></div>}</section></div> : <EmptyState icon={ChatCircleDots} title="No conversations yet" body="Ask about a room to start a conversation with its poster." action={<ButtonLink to="/explore">Explore rooms</ButtonLink>} />}</div>;
}
