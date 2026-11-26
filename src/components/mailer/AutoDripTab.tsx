'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  X,
  Zap,
  Pause,
  Play,
  Square,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Shuffle,
  Clock,
  Cloud,
  Trash2,
  Music2,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { mergeEmailSources } from '@/lib/drip/email-parser';
import { spin, hasSpintax } from '@/lib/drip/spintax';
import { activeWindowHours } from '@/lib/drip/scheduler';

interface Attachment {
  name: string;
  link: string;
}

interface DripStatus {
  config: { serviceRole: boolean; cronSecret: boolean; googleOAuth: boolean };
  credentials: { configured: boolean; method?: string; senderEmail?: string };
  campaign: any | null;
  recent: any[];
}

interface Props {
  session: any;
  supabaseBeats: any[];
  driveFiles: any[];
}

const ACTIVE = ['running', 'paused', 'error'];

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const total = Math.round(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pl-PL', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function describeState(c: any, now: number): { label: string; tone: 'green' | 'amber' | 'red' | 'gray' | 'blue' } {
  if (!c) return { label: '', tone: 'gray' };
  if (c.status === 'paused') return { label: 'Wstrzymana – kliknij „Wznów”, aby kontynuować.', tone: 'amber' };
  if (c.status === 'error') return { label: `Zatrzymana z powodu błędu: ${c.last_error || 'nieznany błąd'}`, tone: 'red' };
  if (c.status === 'completed') return { label: 'Zakończona – wszystkie maile z kolejki zostały obsłużone.', tone: 'green' };
  if (c.status === 'cancelled') return { label: 'Anulowana.', tone: 'gray' };

  const next = new Date(c.next_send_at).getTime();
  const diff = next - now;
  switch (c.state_note) {
    case 'outside_hours':
      return { label: `Poza godzinami wysyłki – wznowi ${formatWhen(c.next_send_at)}`, tone: 'blue' };
    case 'daily_limit':
      return { label: `Dzienny limit osiągnięty – wznowi ${formatWhen(c.next_send_at)}`, tone: 'blue' };
    case 'quota':
      return { label: `Google zgłosił limit konta – wznowi ${formatWhen(c.next_send_at)}`, tone: 'amber' };
    case 'batch_pause':
      if (diff > 0) return { label: `Przerwa po serii – kolejny mail za ${formatDuration(diff)}`, tone: 'blue' };
      break;
    case 'retry':
      if (diff > 0) return { label: `Ponowna próba za ${formatDuration(diff)} (chwilowy błąd)`, tone: 'amber' };
      break;
  }
  if (diff > 0) return { label: `Wysyłanie – kolejny mail za ${formatDuration(diff)}`, tone: 'green' };
  return { label: 'Wysyłanie – czekam na kolejne wywołanie silnika w chmurze (do ~1 min)…', tone: 'green' };
}

const toneClasses: Record<string, string> = {
  green: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  amber: 'bg-amber-50 border-amber-200 text-amber-800',
  red: 'bg-red-50 border-red-200 text-red-700',
  gray: 'bg-gray-50 border-gray-200 text-gray-700',
  blue: 'bg-blue-50 border-blue-200 text-blue-800',
};

export default function AutoDripTab({ session, supabaseBeats, driveFiles }: Props) {
  const [status, setStatus] = useState<DripStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now());

  // Sender credentials
  const [credEmail, setCredEmail] = useState<string>(session?.user?.email || '');
  const [appPassword, setAppPassword] = useState('');
  const [savingCred, setSavingCred] = useState(false);
  const [editingCred, setEditingCred] = useState(false);

  // Recipients
  const [files, setFiles] = useState<{ name: string; text: string }[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [skipContacted, setSkipContacted] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Message
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<{ subject: string; message: string } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Pace
  const [rate, setRate] = useState(30);
  const [jitter, setJitter] = useState(40);
  const [dailyLimit, setDailyLimit] = useState(90);
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(21);
  const [batchSize, setBatchSize] = useState(10);
  const [batchPause, setBatchPause] = useState(15);

  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);

  const parsed = useMemo(() => mergeEmailSources(files.map((f) => f.text)), [files]);
  const campaign = status?.campaign;
  const isActive = Boolean(campaign && ACTIVE.includes(campaign.status));

  async function headers(): Promise<Record<string, string>> {
    let token = session?.access_token;
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.access_token) token = data.session.access_token;
    } catch {}
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  }

  async function api(path: string, init: RequestInit = {}) {
    const res = await fetch(path, { ...init, headers: { ...(await headers()), ...((init.headers as any) || {}) } });
    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { error: text.slice(0, 200) || `HTTP ${res.status}` };
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  async function loadStatus() {
    try {
      const data = await api('/api/drip/campaign');
      setStatus(data);
      setError('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingStatus(false);
    }
  }

  // Initial load + polling every 15s
  useEffect(() => {
    loadStatus();
    const poll = setInterval(loadStatus, 15000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Browser assist: while this tab is open, nudge the engine every 60s
  // (the cloud cron keeps working on its own when the computer is off).
  useEffect(() => {
    if (campaign?.status !== 'running') return;
    const tick = setInterval(async () => {
      try {
        await api('/api/drip/campaign', { method: 'POST', body: JSON.stringify({ action: 'tick' }) });
        await loadStatus();
      } catch {}
    }, 60000);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign?.status, campaign?.id]);

  async function addFiles(list: FileList | File[] | null) {
    if (!list) return;
    const arr = Array.from(list).filter((f) => /\.(txt|csv)$/i.test(f.name) || f.type.startsWith('text/'));
    if (arr.length === 0) {
      setError('Wgraj pliki tekstowe .txt lub .csv z adresami e-mail.');
      return;
    }
    const read = await Promise.all(
      arr.map(
        (f) =>
          new Promise<{ name: string; text: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: f.name, text: String(reader.result || '') });
            reader.onerror = () => resolve({ name: f.name, text: '' });
            reader.readAsText(f);
          })
      )
    );
    setFiles((prev) => [...prev, ...read.filter((r) => !prev.some((p) => p.name === r.name))]);
    setError('');
  }

  async function saveCredentials() {
    setSavingCred(true);
    setError('');
    try {
      await api('/api/drip/credentials', {
        method: 'POST',
        body: JSON.stringify({ method: 'smtp', senderEmail: credEmail, appPassword }),
      });
      setAppPassword('');
      setEditingCred(false);
      setNotice('Konto nadawcy zweryfikowane i zapisane. Silnik w chmurze może teraz wysyłać bez Twojego komputera.');
      await loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingCred(false);
    }
  }

  async function saveOAuthCredentials() {
    const refreshToken = session?.provider_refresh_token;
    if (!refreshToken) {
      setError('Brak refresh tokenu Google w tej sesji. Kliknij „Połącz ponownie konto Google” w zakładce Send Pack i spróbuj od razu po zalogowaniu – albo użyj Hasła aplikacji (zalecane).');
      return;
    }
    setSavingCred(true);
    setError('');
    try {
      await api('/api/drip/credentials', {
        method: 'POST',
        body: JSON.stringify({ method: 'oauth', senderEmail: session?.user?.email, refreshToken }),
      });
      setEditingCred(false);
      setNotice('Połączono konto Google (OAuth) dla silnika w chmurze.');
      await loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSavingCred(false);
    }
  }

  async function removeCredentials() {
    if (!confirm('Usunąć zapisane konto nadawcy? Aktywna kampania zatrzyma się przy następnym mailu.')) return;
    try {
      await api('/api/drip/credentials', { method: 'DELETE' });
      await loadStatus();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function toggleAttachment(att: Attachment) {
    setAttachments((prev) =>
      prev.some((a) => a.link === att.link) ? prev.filter((a) => a.link !== att.link) : [...prev, att]
    );
  }

  async function startCampaign() {
    setError('');
    setNotice('');
    if (!status?.credentials.configured) return setError('Najpierw zapisz konto nadawcy (krok 1).');
    if (parsed.emails.length === 0) return setError('Wgraj pliki .txt z adresami e-mail (krok 2).');
    if (!subject.trim() || !message.trim()) return setError('Uzupełnij temat i treść wiadomości (krok 3).');

    setStarting(true);
    try {
      const data = await api('/api/drip/campaign', {
        method: 'POST',
        body: JSON.stringify({
          action: 'create',
          name: name.trim() || subject.trim(),
          subject,
          message,
          attachments,
          emails: parsed.emails,
          skipContacted,
          settings: {
            ratePerHour: rate,
            jitterPct: jitter,
            dailyLimit,
            activeHoursStart: startHour,
            activeHoursEnd: endHour,
            batchSize,
            batchPauseMin: batchPause,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        }),
      });
      setNotice(
        `Kampania wystartowała: ${data.campaign.total_count} odbiorców w kolejce` +
          (data.skipped ? ` (pominięto ${data.skipped} wcześniej kontaktowanych)` : '') +
          '. Możesz spokojnie wyłączyć komputer – wysyłka działa w chmurze.'
      );
      setFiles([]);
      setPreview(null);
      await loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  async function campaignAction(action: 'pause' | 'resume' | 'cancel') {
    if (!campaign) return;
    if (action === 'cancel' && !confirm('Anulować kampanię? Niewysłane adresy możesz wcześniej pobrać przyciskiem „Pobierz niewysłane”.')) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/drip/campaign', { method: 'PATCH', body: JSON.stringify({ id: campaign.id, action }) });
      await loadStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function downloadRemaining() {
    try {
      const data = await api('/api/drip/campaign?export=remaining');
      const blob = new Blob([(data.emails || []).join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `niewyslane-${(campaign?.name || 'auto-drip').replace(/[^a-z0-9-_]+/gi, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const windowHours = activeWindowHours(startHour, endHour);
  const perDay = Math.max(1, Math.min(dailyLimit, rate * windowHours));
  const estimatedDays = parsed.emails.length > 0 ? Math.ceil(parsed.emails.length / perDay) : 0;
  const selectableDrive = (driveFiles || []).filter(
    (f: any) => f.mimeType !== 'application/vnd.google-apps.folder' && f.webViewLink
  );

  if (loadingStatus && !status) {
    return (
      <div className="bg-white border border-[#d2d2d7] rounded-xl p-10 flex items-center justify-center text-gray-500 text-sm">
        <Loader2 size={18} className="animate-spin mr-2" /> Ładowanie Auto-Drip…
      </div>
    );
  }

  const state = describeState(campaign, now);
  const progressPct = campaign?.total_count
    ? Math.min(100, ((campaign.sent_count + campaign.failed_count) / campaign.total_count) * 100)
    : 0;
  const todayKey = new Date().toLocaleDateString('sv-SE', { timeZone: campaign?.timezone || 'Europe/Warsaw' });
  const sentTodayShown = campaign && campaign.sent_today_date === todayKey ? campaign.sent_today : 0;

  return (
    <div className="space-y-6" data-testid="auto-drip-tab">
      {/* Header */}
      <div className="bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-black text-white rounded-lg shrink-0">
            <Cloud size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">Auto-Drip – masowa wysyłka w chmurze</h3>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Wgraj bazę (np. 3000 maili z wielu plików .txt), wybierz bity i kliknij Start. Silnik na serwerze wysyła
              maile w ludzkim tempie z losowymi przerwami, pilnuje dziennego limitu Gmaila i śledzi otwarcia –
              <strong> nawet gdy Twój komputer jest całkowicie wyłączony</strong>.
            </p>
          </div>
        </div>

        {status && !status.config.serviceRole && (
          <div className="mt-4 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-800 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle size={16} /> Serwer nie jest jeszcze skonfigurowany do pracy w tle
            </p>
            <p>
              Dodaj w Vercel → Settings → Environment Variables: <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>{' '}
              (Supabase → Project Settings → API) oraz <code className="font-mono">CRON_SECRET</code>, zrób Redeploy i uruchom
              skrypt <code className="font-mono">drip_update.sql</code> w Supabase.
            </p>
          </div>
        )}
        {status && status.config.serviceRole && !status.config.cronSecret && (
          <div className="mt-4 p-4 rounded-lg border border-amber-200 bg-amber-50 text-sm text-amber-800">
            <strong>Brak CRON_SECRET na serwerze.</strong> Bez niego budzik w chmurze nie może uruchamiać silnika, więc wysyłka
            działałaby tylko przy otwartej karcie. Dodaj <code className="font-mono">CRON_SECRET</code> w Vercel i wklej tę samą
            wartość do skryptu <code className="font-mono">drip_update.sql</code>.
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg text-sm font-medium border bg-red-50 text-red-700 border-red-200 flex items-start gap-2">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span className="break-words">{error}</span>
        </div>
      )}
      {notice && (
        <div className="p-4 rounded-lg text-sm font-medium border bg-green-50 text-green-700 border-green-200 flex items-start gap-2">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          <span>{notice}</span>
        </div>
      )}

      {/* Step 1: Sender */}
      <div className="bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-sm">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
          <KeyRound size={18} className="text-blue-600" /> 1. Konto nadawcy (dostęp, który nie wygasa)
        </h4>
        {status?.credentials.configured && !editingCred ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div className="text-sm text-emerald-800">
              <CheckCircle2 size={15} className="inline mr-1.5 -mt-0.5" />
              Połączono: <strong>{status.credentials.senderEmail}</strong>{' '}
              <span className="text-emerald-700">
                ({status.credentials.method === 'oauth' ? 'Google OAuth' : 'Hasło aplikacji Google'})
              </span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditingCred(true)} className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                Zmień
              </button>
              <button type="button" onClick={removeCredentials} className="px-3 py-1.5 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer flex items-center gap-1">
                <Trash2 size={12} /> Usuń
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 leading-relaxed">
              Zalecane: <strong>Hasło aplikacji Google</strong> – 16-znakowy kod, który nigdy nie wygasa. Wygenerujesz go na{' '}
              <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-blue-600 underline inline-flex items-center gap-0.5">
                myaccount.google.com/apppasswords <ExternalLink size={11} />
              </a>{' '}
              (wymaga włączonej weryfikacji dwuetapowej). Hasło jest szyfrowane AES-256 i nigdy nie wraca do przeglądarki.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                value={credEmail}
                onChange={(e) => setCredEmail(e.target.value)}
                placeholder="twojemail@gmail.com"
                className="w-full p-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:ring-2 focus:ring-black outline-none"
              />
              <input
                type="password"
                value={appPassword}
                onChange={(e) => setAppPassword(e.target.value)}
                placeholder="Hasło aplikacji (xxxx xxxx xxxx xxxx)"
                autoComplete="new-password"
                className="w-full p-2.5 border border-[#d2d2d7] rounded-lg text-sm font-mono focus:ring-2 focus:ring-black outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={savingCred || !credEmail || !appPassword}
                onClick={saveCredentials}
                className="px-4 py-2 text-sm font-medium bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {savingCred ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                Zapisz i zweryfikuj
              </button>
              {status?.config.googleOAuth && (
                <button
                  type="button"
                  disabled={savingCred}
                  onClick={saveOAuthCredentials}
                  className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  Użyj zalogowanego konta Google (OAuth)
                </button>
              )}
              {editingCred && (
                <button type="button" onClick={() => setEditingCred(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-black cursor-pointer">
                  Anuluj
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Active campaign dashboard */}
      {campaign && (isActive || campaign.status === 'completed' || campaign.status === 'cancelled') && (
        <div className="bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-sm" data-testid="drip-dashboard">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400 font-semibold">
                {isActive ? 'Aktywna kampania' : 'Ostatnia kampania'}
              </p>
              <h4 className="text-lg font-bold text-gray-900">{campaign.name}</h4>
            </div>
            <div className="flex flex-wrap gap-2">
              {campaign.status === 'running' && (
                <button type="button" disabled={busy} onClick={() => campaignAction('pause')} className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50">
                  <Pause size={13} /> Wstrzymaj
                </button>
              )}
              {(campaign.status === 'paused' || campaign.status === 'error') && (
                <button type="button" disabled={busy} onClick={() => campaignAction('resume')} className="px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50">
                  <Play size={13} /> Wznów
                </button>
              )}
              {isActive && (
                <button type="button" disabled={busy} onClick={() => campaignAction('cancel')} className="px-3 py-1.5 text-xs font-semibold bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1 cursor-pointer disabled:opacity-50">
                  <Square size={12} /> Anuluj
                </button>
              )}
              {campaign.sent_count + campaign.failed_count < campaign.total_count && (
                <button type="button" onClick={downloadRemaining} className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 hover:bg-gray-50 rounded-lg flex items-center gap-1 cursor-pointer">
                  <Download size={13} /> Pobierz niewysłane
                </button>
              )}
            </div>
          </div>

          <div className={`p-3 rounded-lg border text-sm font-medium mb-4 ${toneClasses[state.tone]}`}>{state.label}</div>

          <div className="mb-1 flex justify-between text-xs font-medium text-gray-600">
            <span>
              Wysłano <strong className="text-gray-900">{campaign.sent_count}</strong> / {campaign.total_count}
              {campaign.failed_count > 0 && <span className="text-red-600"> · {campaign.failed_count} odrzuconych</span>}
            </span>
            <span>{progressPct.toFixed(1)}%</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-4">
            <div className="h-full bg-black transition-all" style={{ width: `${progressPct}%` }} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-lg font-bold text-gray-900">{sentTodayShown} / {campaign.daily_limit}</p>
              <p className="text-[11px] text-gray-500">dzisiaj / limit</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-lg font-bold text-gray-900">{campaign.rate_per_hour}/h</p>
              <p className="text-[11px] text-gray-500">tempo (±{campaign.jitter_pct}%)</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-lg font-bold text-gray-900">
                {String(campaign.active_hours_start).padStart(2, '0')}:00–{String(campaign.active_hours_end).padStart(2, '0')}:00
              </p>
              <p className="text-[11px] text-gray-500">godziny wysyłki</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <p className="text-lg font-bold text-gray-900">{Math.max(0, campaign.total_count - campaign.sent_count - campaign.failed_count)}</p>
              <p className="text-[11px] text-gray-500">w kolejce</p>
            </div>
          </div>

          {status?.recent && status.recent.length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-gray-500 mb-2">Ostatnia aktywność</p>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                {status.recent.map((r: any, i: number) => (
                  <div key={`${r.email}-${i}`} className="px-3 py-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-mono truncate">{r.email}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-gray-400">{r.processed_at ? formatWhen(r.processed_at) : ''}</span>
                      {r.status === 'sent' ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold">wysłano</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold" title={r.error || ''}>błąd</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* New campaign form */}
      {!isActive && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            {/* Step 2: Recipients */}
            <div className="bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-sm">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Upload size={18} className="text-blue-600" /> 2. Baza odbiorców (pliki .txt)
              </h4>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  addFiles(e.dataTransfer.files);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-black bg-gray-50' : 'border-gray-300 hover:border-gray-400'}`}
              >
                <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm font-medium text-gray-800">Przeciągnij tutaj pliki .txt / .csv (możesz wiele naraz)</p>
                <p className="text-xs text-gray-500 mt-1">albo kliknij, aby wybrać. Adresy zostaną wyciągnięte, oczyszczone i scalone bez duplikatów.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.csv,text/plain,text/csv"
                  multiple
                  className="hidden"
                  data-testid="drip-file-input"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {files.map((f) => (
                      <span key={f.name} className="inline-flex items-center gap-1.5 text-xs bg-gray-100 border border-gray-200 rounded-full pl-2.5 pr-1.5 py-1">
                        <FileText size={12} className="text-gray-500" />
                        {f.name}
                        <button type="button" onClick={() => setFiles((prev) => prev.filter((p) => p.name !== f.name))} className="p-0.5 hover:bg-gray-200 rounded-full cursor-pointer" aria-label={`Usuń ${f.name}`}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center" data-testid="drip-parse-stats">
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-base font-bold">{files.length}</p>
                      <p className="text-[11px] text-gray-500">plików</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-base font-bold">{parsed.totalFound}</p>
                      <p className="text-[11px] text-gray-500">znalezionych</p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
                      <p className="text-base font-bold">{parsed.duplicates + parsed.invalid}</p>
                      <p className="text-[11px] text-gray-500">duplikaty / błędne</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                      <p className="text-base font-bold text-emerald-700" data-testid="drip-unique-count">{parsed.emails.length}</p>
                      <p className="text-[11px] text-emerald-700">unikalnych</p>
                    </div>
                  </div>
                </div>
              )}

              <label className="mt-4 flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                <input type="checkbox" checked={skipContacted} onChange={(e) => setSkipContacted(e.target.checked)} className="w-4 h-4 accent-black" />
                Pomiń adresy, do których już kiedyś wysyłałem (na podstawie Campaign Stats)
              </label>
            </div>

            {/* Step 3: Message */}
            <div className="bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-sm space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Shuffle size={18} className="text-blue-600" /> 3. Wiadomość (ze Spintax)
              </h4>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nazwa kampanii (widoczna tylko dla Ciebie)"
                className="w-full p-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:ring-2 focus:ring-black outline-none"
              />
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Temat, np. {Nowe|Świeże} bity dla Ciebie 🔥"
                className="w-full p-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:ring-2 focus:ring-black outline-none"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={7}
                placeholder={'{Siema|Cześć|Elo}!\n\n{Wysyłam|Podrzucam} Ci paczkę {nowych|świeżych} bitów – daj znać, co myślisz.'}
                className="w-full p-2.5 border border-[#d2d2d7] rounded-lg text-sm focus:ring-2 focus:ring-black outline-none resize-y"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-500">
                <span>
                  Wpisz warianty w klamrach: <code className="font-mono bg-gray-100 px-1 rounded">{'{Siema|Cześć|Elo}'}</code> – każdy mail losuje inną wersję.
                  {(hasSpintax(subject) || hasSpintax(message)) && <span className="text-emerald-600 font-medium"> Spintax aktywny ✓</span>}
                </span>
                <button
                  type="button"
                  onClick={() => setPreview({ subject: spin(subject), message: spin(message) })}
                  disabled={!subject && !message}
                  className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  Podgląd losowej wersji
                </button>
              </div>
              {preview && (
                <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm">
                  <p className="font-semibold text-gray-900 mb-2">{preview.subject || '(brak tematu)'}</p>
                  <p className="whitespace-pre-wrap text-gray-700">{preview.message}</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            {/* Step 4: Attachments */}
            <div className="bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-sm">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Music2 size={18} className="text-blue-600" /> 4. Bity do wysłania
                {attachments.length > 0 && <span className="ml-auto text-xs bg-black text-white px-2 py-0.5 rounded-full">{attachments.length}</span>}
              </h4>
              <div className="max-h-72 overflow-y-auto space-y-1">
                {supabaseBeats.length === 0 && selectableDrive.length === 0 && (
                  <p className="text-xs text-gray-500 py-4 text-center">
                    Brak bitów. Dodaj je w katalogu lub połącz Google Drive w zakładce Send Pack.
                  </p>
                )}
                {supabaseBeats.map((beat: any) => {
                  const link = beat.file_url || beat.audio_url || beat.url || '';
                  if (!link) return null;
                  const selected = attachments.some((a) => a.link === link);
                  return (
                    <button
                      type="button"
                      key={`beat-${beat.id}`}
                      onClick={() => toggleAttachment({ name: beat.title, link })}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left text-sm cursor-pointer border ${selected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-transparent hover:bg-gray-50'}`}
                    >
                      <Music2 size={14} className="shrink-0 text-gray-400" />
                      <span className="truncate flex-1">{beat.title}</span>
                      {selected && <CheckCircle2 size={16} className="text-blue-600" />}
                    </button>
                  );
                })}
                {selectableDrive.map((f: any) => {
                  const selected = attachments.some((a) => a.link === f.webViewLink);
                  return (
                    <button
                      type="button"
                      key={`drive-${f.id}`}
                      onClick={() => toggleAttachment({ name: f.name, link: f.webViewLink })}
                      className={`w-full flex items-center gap-2 p-2.5 rounded-lg text-left text-sm cursor-pointer border ${selected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-transparent hover:bg-gray-50'}`}
                    >
                      <HardDrive size={14} className="shrink-0 text-gray-400" />
                      <span className="truncate flex-1">{f.name}</span>
                      {selected && <CheckCircle2 size={16} className="text-blue-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 5: Pace */}
            <div className="bg-white border border-[#d2d2d7] rounded-xl p-6 shadow-sm space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-blue-600" /> 5. Tempo i przerwy
              </h4>
              <div>
                <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                  <span>Maili na godzinę</span>
                  <span className="text-gray-900 font-bold">{rate}/h</span>
                </div>
                <input type="range" min={10} max={60} step={5} value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full accent-black" aria-label="Maili na godzinę" />
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                  <span>Losowość odstępów (jitter)</span>
                  <span className="text-gray-900 font-bold">±{jitter}%</span>
                </div>
                <input type="range" min={0} max={80} step={5} value={jitter} onChange={(e) => setJitter(Number(e.target.value))} className="w-full accent-black" aria-label="Jitter" />
                <p className="text-[11px] text-gray-400 mt-1">
                  Odstęp między mailami: {Math.round((3600 / rate) * (1 - jitter / 100))}–{Math.round((3600 / rate) * (1 + jitter / 100))} s
                </p>
              </div>
              <div>
                <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                  <span>Dzienny limit bezpieczeństwa</span>
                </div>
                <div className="flex gap-2">
                  <input type="number" min={1} max={2000} value={dailyLimit} onChange={(e) => setDailyLimit(Math.max(1, Number(e.target.value) || 1))} className="w-24 p-2 border border-[#d2d2d7] rounded-lg text-sm" aria-label="Dzienny limit" />
                  <button type="button" onClick={() => setDailyLimit(90)} className={`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${dailyLimit === 90 ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}>
                    Gmail (90)
                  </button>
                  <button type="button" onClick={() => setDailyLimit(1500)} className={`px-2.5 py-1 text-xs rounded-lg border cursor-pointer ${dailyLimit === 1500 ? 'bg-black text-white border-black' : 'bg-white border-gray-300'}`}>
                    Workspace (1500)
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">
                  Wysyłaj od
                  <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))} className="mt-1 w-full p-2 border border-[#d2d2d7] rounded-lg text-sm bg-white">
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-gray-600">
                  do
                  <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))} className="mt-1 w-full p-2 border border-[#d2d2d7] rounded-lg text-sm bg-white">
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-medium text-gray-600">
                  Dłuższa przerwa co (maili)
                  <input type="number" min={0} max={500} value={batchSize} onChange={(e) => setBatchSize(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-full p-2 border border-[#d2d2d7] rounded-lg text-sm" />
                </label>
                <label className="text-xs font-medium text-gray-600">
                  Długość przerwy (min)
                  <input type="number" min={0} max={240} value={batchPause} onChange={(e) => setBatchPause(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-full p-2 border border-[#d2d2d7] rounded-lg text-sm" />
                </label>
              </div>

              {parsed.emails.length > 0 && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800" data-testid="drip-estimate">
                  ~<strong>{perDay}</strong> maili dziennie → <strong>{parsed.emails.length}</strong> odbiorców zajmie około{' '}
                  <strong>{estimatedDays} {estimatedDays === 1 ? 'dzień' : 'dni'}</strong>.
                </div>
              )}

              <button
                type="button"
                onClick={startCampaign}
                disabled={starting || !status?.config.serviceRole}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-semibold bg-black text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
              >
                {starting ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                {starting ? 'Zapisywanie kolejki…' : `Start wysyłki w chmurze${parsed.emails.length ? ` (${parsed.emails.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
