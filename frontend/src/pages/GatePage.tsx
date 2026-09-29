import { useMemo, useState } from 'react';
import { Check, ClipboardCheck, LockKeyhole, ShieldCheck, Ticket, WalletCards } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { getExplorerTxUrl } from '../config';
import { checkIn, getCredentialCommitment } from '../lib/contract';
import { getIdentity, publicFingerprint } from '../lib/identity';
import { toHex } from '../lib/midnight';
import { useContractState } from '../hooks/useContractState';
import { BackupButton, Busy, CopyButton, Notice, SecretField } from '../components/Kit';

export default function GatePage() {
  const { session, isConnected, connect, isConnecting, walletStatus } = useWallet();
  const { ledgerState, isLoading, error, refetch } = useContractState(6000);
  const [identity] = useState(getIdentity);
  const [secret, setSecret] = useState(identity.secret);
  const [score, setScore] = useState('86');
  const [status, setStatus] = useState<'idle' | 'working' | 'submitted' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [txId, setTxId] = useState('');
  const threshold = ledgerState?.entry_threshold == null ? null : BigInt(ledgerState.entry_threshold);
  const capacity = ledgerState?.entry_limit == null ? null : BigInt(ledgerState.entry_limit);
  const used = ledgerState?.screening_entries == null ? null : BigInt(ledgerState.screening_entries);
  const validSecret = /^[a-f0-9]{64}$/i.test(secret);
  const numericScore = Number(score);
  const credentialCommitment = useMemo(() => {
    if (!ledgerState?.access_pass_id || !validSecret || !Number.isInteger(numericScore) || numericScore < 0) return '';
    try { return getCredentialCommitment(score, secret, ledgerState.access_pass_id); } catch { return ''; }
  }, [ledgerState?.access_pass_id, numericScore, score, secret, validSecret]);
  const canSubmit = Boolean(session && ledgerState?.gate_open && validSecret && Number.isInteger(numericScore) && numericScore >= 0 && threshold !== null && capacity !== null && numericScore >= Number(threshold) && status !== 'working');

  async function submit() {
    if (!session || !canSubmit) return;
    setStatus('working'); setMessage('Building a zero-knowledge admission proof in your wallet…'); setTxId('');
    try { const result = await checkIn(session, { secret, score }); setTxId(result.txId); setStatus('submitted'); setMessage('Admission transaction submitted. The chain can verify the result without seeing your score.'); setTimeout(() => void refetch(), 2500); }
    catch (cause: any) { setStatus('error'); setMessage(cause?.message || 'The proof could not be submitted. Check the member secret and credential status.'); }
  }

  return <div className="page"><header className="page-header"><div className="eyebrow">Member pass / private witness</div><h1 className="page-title">Bring the evidence.<br /><em>Leave the story behind.</em></h1><p className="page-intro">Stillroom checks your private eligibility against the room's public rule. Your score and secret are witnesses, not transaction arguments.</p></header>
    {!isConnected && <Notice>Connect a 1AM or Lace wallet on the selected network to submit. You can prepare the private proof before connecting.</Notice>}
    {error && <Notice kind="error">{error}</Notice>}
    <div className="workspace-grid" style={{ marginTop: 15 }}><section className="panel"><div className="panel-heading"><div><div className="eyebrow">Public room rule</div><h2>{ledgerState?.edition ? 'Now accepting members' : 'No active screening'}</h2></div>{ledgerState && <span className={`status ${ledgerState.gate_open ? '' : 'closed'}`}><span className="live-pip" />{ledgerState.gate_open ? 'Open' : 'Paused'}</span>}</div>{isLoading ? <div className="empty-state"><div className="empty-symbol">…</div><h3>Reading the room</h3><p>Fetching the current public state from the indexer.</p></div> : !ledgerState ? <div className="empty-state"><Ticket size={24} aria-hidden="true" /><h3>Waiting for an organizer</h3><p>There is no contract address on this network yet. Operations can deploy the first screening.</p></div> : <><div className="data-list"><div className="data-row"><span className="label">Minimum signal</span><strong>{threshold?.toString()} points</strong></div><div className="data-row"><span className="label">Room capacity</span><strong>{used?.toString()} / {capacity?.toString()}</strong></div><div className="data-row"><span className="label">Pass expires</span><strong>{new Date(Number(ledgerState.entry_deadline) * 1000).toLocaleDateString()}</strong></div><div className="data-row"><span className="label">Screening pass</span><strong className="mono">{toHex(ledgerState.access_pass_id).slice(0, 14)}…</strong></div></div><div className="callout"><ShieldCheck size={16} aria-hidden="true" /> The threshold, deadline and count are public. The credential that makes you eligible is checked inside the proof.</div></>}</section>
      <section className="panel"><div className="eyebrow">Your private side</div><h2>Generate your pass</h2><p>Use the secret issued or chosen for this screening. It stays in this browser tab and is not saved to localStorage.</p><SecretField id="member-secret" label="Member secret" value={secret} onChange={setSecret} disabled={status === 'working'} /><div className="form-grid"><div className="field"><label htmlFor="member-score">Private score</label><input id="member-score" className="mono" type="number" min="0" max="18446744073709551615" value={score} onChange={e => setScore(e.target.value)} disabled={status === 'working'} /><small>Only the comparison result is disclosed.</small></div><div className="field"><label>Local fingerprint</label><div className="input-like mono">{publicFingerprint(secret).slice(0, 18)}…</div><small>Helpful for your own records, not an identity.</small></div></div>{credentialCommitment && <div className="notice"><ClipboardCheck size={17} aria-hidden="true" /><div><strong>Credential request</strong><br /><span className="mono break">{credentialCommitment}</span><br /><small>Share this commitment with the organizer for issuance. It does not reveal the score or secret.</small></div><CopyButton value={credentialCommitment} label="Copy credential request" /></div>}{message && <Notice kind={status === 'error' ? 'error' : status === 'submitted' ? 'success' : 'info'}>{message}{txId && <><div className="tx-line mono">{txId}</div><a className="quiet-link" href={getExplorerTxUrl(txId)} target="_blank" rel="noreferrer">Open transaction <span aria-hidden="true">↗</span></a></>}</Notice>}{status === 'submitted' ? <div className="actions"><button className="button secondary" onClick={() => { setStatus('idle'); setMessage(''); }}><Check size={16} aria-hidden="true" /> Prepare another</button></div> : <div className="actions"><button className="button primary" onClick={() => void submit()} disabled={!canSubmit}>{status === 'working' ? <Busy /> : <><LockKeyhole size={16} aria-hidden="true" /> Generate admission proof</>}</button>{!isConnected && <button className="button" onClick={() => void connect()} disabled={isConnecting || walletStatus === 'not-found'}><WalletCards size={16} aria-hidden="true" />{isConnecting ? 'Opening wallet…' : 'Connect wallet'}</button>}</div>}<div className="actions"><BackupButton secret={secret} name="member" /></div></section></div>
    <p className="form-footnote"><strong>Using a demo credential?</strong> An organizer must issue the commitment from Operations before the proof can pass. This is intentional: eligibility is private, but authorization is still enforced.</p>
  </div>;
}
