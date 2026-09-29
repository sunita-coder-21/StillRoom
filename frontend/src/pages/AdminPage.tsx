import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ClipboardCheck, ExternalLink, KeyRound, Pause, Play, RotateCcw, Settings2, ShieldAlert, WalletCards } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { CONFIG_CHANGE_EVENT, getContractAddress, getExplorerContractUrl } from '../config';
import { deployScreening, issueCredential, manageScreening } from '../lib/contract';
import { getIdentity, publicFingerprint } from '../lib/identity';
import { toHex } from '../lib/midnight';
import { useContractState } from '../hooks/useContractState';
import { BackupButton, Busy, CopyButton, Notice, SecretField } from '../components/Kit';

const DEFAULT_DAYS = '30';

export default function AdminPage() {
  const { session, isConnected, connect, isConnecting, walletStatus } = useWallet();
  const [organizer, setOrganizer] = useState(() => getIdentity());
  const [secret, setSecret] = useState(organizer.secret);
  const [threshold, setThreshold] = useState('72');
  const [limit, setLimit] = useState('120');
  const [days, setDays] = useState(DEFAULT_DAYS);
  const [action, setAction] = useState<'deploy' | 'pause' | 'resume' | 'rotate' | 'credential'>('deploy');
  const [commitment, setCommitment] = useState('');
  const [status, setStatus] = useState<'idle' | 'working' | 'submitted' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [txId, setTxId] = useState('');
  const [deployedAddress, setDeployedAddress] = useState(getContractAddress());
  const { ledgerState, isLoading, error, refetch } = useContractState(6000, deployedAddress);
  const secretValid = /^[a-f0-9]{64}$/i.test(secret);
  const pass = ledgerState?.access_pass_id ? toHex(ledgerState.access_pass_id) : '';
  const hasContract = Boolean(deployedAddress);
  const actionLabel = action === 'deploy' ? 'Deploy screening' : action === 'credential' ? 'Issue credential' : `${action[0].toUpperCase()}${action.slice(1)} admissions`;

  useEffect(() => { setOrganizer({ secret }); }, [secret]);
  useEffect(() => {
    setDeployedAddress(getContractAddress());
    const refresh = () => setDeployedAddress(getContractAddress());
    window.addEventListener(CONFIG_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(CONFIG_CHANGE_EVENT, refresh);
  }, []);

  const run = useCallback(async () => {
    if (!session || !secretValid || status === 'working') return;
    setStatus('working'); setTxId(''); setMessage(action === 'deploy' ? 'Preparing browser deployment…' : `Preparing ${action} transaction…`);
    try {
      const result = action === 'deploy'
        ? await deployScreening(session, { secret, threshold, limit, days })
        : action === 'credential'
          ? await issueCredential(session, { secret, commitment })
          : await manageScreening(session, { secret, action, threshold, limit, days });
      if (action === 'deploy' && result.address) { setDeployedAddress(result.address); }
      setTxId(result.txId); setStatus('submitted'); setMessage(`${actionLabel} submitted. Wait for the indexer before treating it as confirmed.`); setTimeout(() => void refetch(), 3000);
    } catch (cause: any) { setStatus('error'); setMessage(cause?.message || `${actionLabel} failed.`); }
  }, [action, actionLabel, commitment, days, limit, refetch, secret, secretValid, session, status, threshold]);

  const canRun = Boolean(session && secretValid && (action !== 'credential' || /^[a-f0-9]{64}$/i.test(commitment)) && status !== 'working');
  const networkAddress = useMemo(() => deployedAddress ? deployedAddress : 'No address configured', [deployedAddress]);

  return <div className="page"><header className="page-header"><div className="eyebrow">Operations / organizer console</div><h1 className="page-title">Shape the room.<br /><em>Protect the reason.</em></h1><p className="page-intro">Deploy a screening, issue a private credential commitment, or pause admissions from the connected wallet. Organizer secrets never enter a circuit argument.</p></header>
    {!isConnected && <Notice>Operations needs a connected Midnight wallet on the selected network. Browser deployment delegates balancing and proof generation to the wallet.</Notice>}{error && <Notice kind="error">{error}</Notice>}
    <div className="workspace-grid" style={{ marginTop: 15 }}><section className="panel"><div className="eyebrow">Organizer key</div><h2>Local authorization</h2><p>The public contract stores only a domain-separated hash of this key. Save a recovery copy offline before using the console.</p><SecretField id="organizer-secret" label="Organizer secret" value={secret} onChange={setSecret} disabled={status === 'working'} /><div className="data-row"><span className="label">Local fingerprint</span><strong className="mono">{publicFingerprint(secret).slice(0, 18)}…</strong></div><div className="actions"><BackupButton secret={secret} name="organizer" />{!isConnected && <button className="button primary" onClick={() => void connect()} disabled={isConnecting || walletStatus === 'not-found'}><WalletCards size={16} aria-hidden="true" />{isConnecting ? 'Opening wallet…' : 'Connect wallet'}</button>}</div><Notice><ShieldAlert size={17} aria-hidden="true" /> If this key is lost, the deployed organizer commitment cannot be recovered. Never send it in chat, a form submission or a screenshot.</Notice></section>
      <section className="panel"><div className="panel-heading"><div><div className="eyebrow">Room controls</div><h2>{hasContract ? 'Operate the active screening' : 'Deploy the first screening'}</h2></div>{hasContract && <span className={`status ${ledgerState?.gate_open === false ? 'closed' : ''}`}><span className="live-pip" />{ledgerState?.gate_open === false ? 'Paused' : 'Ready'}</span>}</div><div className="form-grid"><div className="field"><label htmlFor="admin-threshold">Minimum signal</label><input id="admin-threshold" className="mono" type="number" min="0" value={threshold} onChange={e => setThreshold(e.target.value)} /></div><div className="field"><label htmlFor="admin-limit">Capacity</label><input id="admin-limit" className="mono" type="number" min="1" value={limit} onChange={e => setLimit(e.target.value)} /></div><div className="field"><label htmlFor="admin-days">Open for days</label><input id="admin-days" className="mono" type="number" min="1" max="3650" value={days} onChange={e => setDays(e.target.value)} /></div><div className="field"><label htmlFor="admin-action">Action</label><select id="admin-action" value={action} onChange={e => setAction(e.target.value as typeof action)}><option value="deploy">Deploy new screening</option><option value="rotate">Rotate screening</option><option value="pause">Pause admissions</option><option value="resume">Resume admissions</option><option value="credential">Issue member credential</option></select></div></div>{action === 'credential' && <div className="field"><label htmlFor="credential">Credential commitment</label><div className="input-with-action"><input id="credential" className="mono" value={commitment} onChange={e => setCommitment(e.target.value)} placeholder="64 hexadecimal characters" /><CopyButton value={commitment} label="Copy commitment" /></div><small>Ask the member to copy the request from Member pass. The score stays with them.</small></div>}{hasContract && <div className="data-list"><div className="data-row"><span className="label">Active address</span><span className="copy-control"><a className="quiet-link mono" href={getExplorerContractUrl(deployedAddress)} target="_blank" rel="noreferrer">{networkAddress.slice(0, 13)}… <ExternalLink size={13} /></a><CopyButton value={deployedAddress} /></span></div>{ledgerState && <div className="data-row"><span className="label">Public activity</span><strong>{ledgerState.screening_entries?.toString()} / {ledgerState.entry_limit?.toString()} admissions</strong></div>}</div>}<div className="actions"><button className="button primary" onClick={() => void run()} disabled={!canRun}>{status === 'working' ? <Busy /> : action === 'pause' ? <><Pause size={16} aria-hidden="true" /> Pause admissions</> : action === 'resume' ? <><Play size={16} aria-hidden="true" /> Resume admissions</> : action === 'rotate' ? <><RotateCcw size={16} aria-hidden="true" /> Rotate screening</> : action === 'credential' ? <><ClipboardCheck size={16} aria-hidden="true" /> Issue credential</> : <><Settings2 size={16} aria-hidden="true" /> Deploy screening</>}</button></div>{message && <Notice kind={status === 'error' ? 'error' : status === 'submitted' ? 'success' : 'info'}>{message}{txId && <><div className="tx-line mono">{txId}</div><a className="quiet-link" href={getExplorerContractUrl(deployedAddress)} target="_blank" rel="noreferrer">Open contract <ExternalLink size={13} /></a></>}</Notice>}</section></div>
    <p className="form-footnote"><strong>Network state is public.</strong> The local organizer secret and member evidence are intentionally absent from the public dashboard.</p>
  </div>;
}
