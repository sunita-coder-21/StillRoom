import { useState, type ReactNode } from 'react';
import { Check, Copy, Download, Eye, EyeOff, Info, LoaderCircle } from 'lucide-react';

export function CopyButton({ value, label = 'Copy address' }: { value: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle');
  async function copy() {
    try { await navigator.clipboard.writeText(value); setState('copied'); }
    catch { setState('error'); }
  }
  return <span className="copy-control"><button type="button" className="icon-button" onClick={() => void copy()} aria-label={label} title={label} disabled={!value}>{state === 'copied' ? <Check size={16} /> : <Copy size={16} />}</button><span className={state === 'idle' ? 'sr-only' : 'copy-feedback'} role="status">{state === 'copied' ? 'Copied' : state === 'error' ? 'Copy unavailable; select the text.' : ''}</span></span>;
}

export function Notice({ children, kind = 'info' }: { children: ReactNode; kind?: 'info' | 'error' | 'success' }) {
  return <div className={`notice ${kind}`} role={kind === 'error' ? 'alert' : 'status'}><Info size={17} aria-hidden="true" /><div>{children}</div></div>;
}

export function Busy({ children = 'Preparing proof…' }: { children?: ReactNode }) {
  return <span className="inline"><LoaderCircle size={17} className="spin" aria-hidden="true" />{children}</span>;
}

export function SecretField({ id, label, value, onChange, disabled = false }: { id: string; label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <div className="field"><label htmlFor={id}>{label}</label><div className="input-with-action"><input id={id} type={visible ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} autoComplete="off" spellCheck={false} maxLength={64} aria-describedby={`${id}-hint`} /><button className="icon-button" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide secret' : 'Show secret'} aria-pressed={visible}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></div><small id={`${id}-hint`}>64 hexadecimal characters. Held in memory, never saved automatically.</small></div>;
}

export function BackupButton({ secret, name }: { secret: string; name: 'member' | 'organizer' }) {
  function download() {
    const blob = new Blob([`Stillroom ${name} recovery key\n\n${secret}\n\nSensitive: anyone with this key can act as you. Keep it offline.\n`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `stillroom-${name}-key.txt`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" className="button secondary" onClick={download} disabled={!/^[a-f0-9]{64}$/i.test(secret)}><Download size={16} aria-hidden="true" />Save recovery key</button>;
}

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return <div className="empty-state"><div className="empty-symbol" aria-hidden="true">↳</div><h3>{title}</h3><p>{children}</p></div>;
}
