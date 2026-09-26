import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, EnvelopeSimple, ShieldCheck } from '@phosphor-icons/react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Alert, Button, Input } from '../components/UI';

function safeNext(value) { return value?.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'; }

function AuthFrame({ eyebrow, title, body, children }) {
  return <div className="auth-page shell"><div className="auth-story"><p className="overline">{eyebrow}</p><h1>{title}</h1><p>{body}</p><div className="auth-story-photo"><img src="/images/room-blue.jpg" alt="Furnished student bedroom" /></div><span className="auth-story-note"><ShieldCheck size={18} /> School email confirmation helps keep the community student focused.</span></div><div className="auth-card">{children}</div></div>;
}

export function Login() {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.verified ? next : `/verify?next=${encodeURIComponent(next)}`} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await api('/auth/login', { method: 'POST', body: form });
      setUser(result.user);
      navigate(result.user.verified ? next : `/verify?next=${encodeURIComponent(next)}`);
    } catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  return <AuthFrame eyebrow="Welcome back" title={<>Your next place<br />starts here.</>} body="Pick up where you left off, whether you are searching for a room or sharing yours."><h2>Log in</h2><p>New here? <Link to={`/signup?next=${encodeURIComponent(next)}`}>Create an account <ArrowRight size={14} /></Link></p><Alert>{error}</Alert><form onSubmit={submit}><Input id="login-email" label="School email" type="email" autoComplete="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><Input id="login-password" label="Password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><Button type="submit" loading={busy} className="form-primary">Log in <ArrowRight size={18} /></Button></form></AuthFrame>;
}

export function Signup() {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', school: '', password: '' });
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to={user.verified ? next : `/verify?next=${encodeURIComponent(next)}`} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setFields({});
    try {
      const result = await api('/auth/signup', { method: 'POST', body: form });
      setUser(result.user);
      if (result.devCode) sessionStorage.setItem('sm-dev-code', result.devCode);
      navigate(`/verify?next=${encodeURIComponent(next)}`);
    } catch (caught) { setError(caught.message); setFields(caught.fields || {}); } finally { setBusy(false); }
  }
  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  return <AuthFrame eyebrow="Join the community" title={<>Good rooms.<br />Better connections.</>} body="Create your student account to save rooms, ask questions, and post your space."><h2>Create your account</h2><p>Already a member? <Link to={`/login?next=${encodeURIComponent(next)}`}>Log in <ArrowRight size={14} /></Link></p><Alert>{error}</Alert><form onSubmit={submit}><Input id="signup-name" label="Full name" autoComplete="name" required value={form.name} onChange={update('name')} error={fields.name} /><Input id="signup-school" label="College or university" required placeholder="Your school" value={form.school} onChange={update('school')} error={fields.school} /><Input id="signup-email" label="School email" type="email" autoComplete="email" required placeholder="you@school.edu" value={form.email} onChange={update('email')} error={fields.email} /><Input id="signup-password" label="Password" type="password" autoComplete="new-password" required minLength={10} hint="Use at least 10 characters." value={form.password} onChange={update('password')} error={fields.password} /><Button type="submit" loading={busy} className="form-primary">Create account <ArrowRight size={18} /></Button></form><p className="auth-footnote">Your school email is confirmed before you can post or message.</p></AuthFrame>;
}

export function Verify() {
  const { user, setUser } = useAuth();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState(() => sessionStorage.getItem('sm-dev-code') || '');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return <Navigate to="/signup" replace />;
  if (user.verified) return <Navigate to={next} replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { const result = await api('/auth/verify', { method: 'POST', body: { code } }); setUser(result.user); sessionStorage.removeItem('sm-dev-code'); navigate(next); }
    catch (caught) { setError(caught.message); } finally { setBusy(false); }
  }
  async function resend() {
    setError(''); setMessage('');
    try { const result = await api('/auth/resend', { method: 'POST' }); if (result.devCode) { setDevCode(result.devCode); sessionStorage.setItem('sm-dev-code', result.devCode); } setMessage('A new code has been sent.'); }
    catch (caught) { setError(caught.message); }
  }
  return <AuthFrame eyebrow="One quick check" title={<>Let’s make this<br />a student space.</>} body="Confirming your school email keeps posting and conversations tied to a campus address."><div className="auth-icon"><EnvelopeSimple size={28} /></div><h2>Check your school inbox</h2><p>We sent a six-digit code to <strong>{user.email}</strong>.</p>{devCode && <Alert tone="info">Local demo code: <strong>{devCode}</strong>. Email is not sent in demo mode.</Alert>}<Alert>{error}</Alert><Alert tone="success">{message}</Alert><form onSubmit={submit}><Input id="verify-code" label="Verification code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} /><Button type="submit" loading={busy} className="form-primary">Verify email <ArrowRight size={18} /></Button></form><button type="button" className="link-button" onClick={resend}>Send a new code</button></AuthFrame>;
}
