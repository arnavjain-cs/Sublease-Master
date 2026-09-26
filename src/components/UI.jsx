import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { CircleNotch, WarningCircle } from '@phosphor-icons/react';

export function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) {
  return <button {...props} className={`button button--${variant} button--${size} ${className}`} disabled={loading || props.disabled} aria-busy={loading || undefined}>
    {loading && <CircleNotch className="button-spinner" size={18} aria-hidden="true" />}
    {children}
  </button>;
}

export function ButtonLink({ to, children, variant = 'primary', size = 'md', className = '', ...props }) {
  return <Link to={to} className={`button button--${variant} button--${size} ${className}`} {...props}>{children}</Link>;
}

export const Input = forwardRef(function Input({ label, id, error, hint, className = '', ...props }, ref) {
  return <div className={`field ${className}`}>
    <label htmlFor={id}>{label}</label>
    <input id={id} ref={ref} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...props} />
    {hint && !error && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
    {error && <span className="field-error" id={`${id}-error`}><WarningCircle size={15} aria-hidden="true" />{error}</span>}
  </div>;
});

export function Select({ label, id, error, children, className = '', ...props }) {
  return <div className={`field ${className}`}>
    <label htmlFor={id}>{label}</label>
    <select id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props}>{children}</select>
    {error && <span className="field-error" id={`${id}-error`}><WarningCircle size={15} aria-hidden="true" />{error}</span>}
  </div>;
}

export function Textarea({ label, id, error, hint, className = '', ...props }) {
  return <div className={`field ${className}`}>
    <label htmlFor={id}>{label}</label>
    <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined} {...props} />
    {hint && !error && <span className="field-hint" id={`${id}-hint`}>{hint}</span>}
    {error && <span className="field-error" id={`${id}-error`}><WarningCircle size={15} aria-hidden="true" />{error}</span>}
  </div>;
}

export function Badge({ children, tone = 'neutral', className = '' }) {
  return <span className={`badge badge--${tone} ${className}`}>{children}</span>;
}

export function Alert({ children, tone = 'error' }) {
  if (!children) return null;
  return <div className={`alert alert--${tone}`} role={tone === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function PageLoader() {
  return <div className="page-loader" role="status" aria-label="Loading content">
    <div className="skeleton skeleton--title" /><div className="skeleton skeleton--line" />
    <div className="skeleton-grid"><div className="skeleton skeleton--card" /><div className="skeleton skeleton--card" /><div className="skeleton skeleton--card" /></div>
  </div>;
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return <div className="empty-state">
    {Icon && <span className="empty-state-icon"><Icon size={32} weight="duotone" aria-hidden="true" /></span>}
    <h2>{title}</h2><p>{body}</p>{action}
  </div>;
}
