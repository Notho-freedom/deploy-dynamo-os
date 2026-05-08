import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Stepper } from '@/components/Stepper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Mail, Plus } from 'lucide-react';

export default function EmailSetup() {
  const { lang } = useI18n();
  const [step, setStep] = useState(0);
  const [domain, setDomain] = useState('');
  const [verified, setVerified] = useState(false);
  const [mxOk, setMxOk] = useState(false);
  const [mailboxes, setMailboxes] = useState<{ addr: string; alias?: string }[]>([]);
  const [newAddr, setNewAddr] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1200);
  };

  const verify = () => {
    setTimeout(() => { setVerified(true); setStep(2); }, 1200);
  };
  const checkMx = () => {
    setTimeout(() => { setMxOk(true); setStep(3); }, 1200);
  };

  const steps = [
    { label: lang === 'fr' ? 'Domaine' : 'Domain' },
    { label: lang === 'fr' ? 'Vérification TXT' : 'TXT verification' },
    { label: lang === 'fr' ? 'Enregistrements MX' : 'MX records' },
    { label: lang === 'fr' ? 'Boîtes mail' : 'Mailboxes' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">Email setup</p>
        <h1 className="font-editorial text-4xl tracking-tight">
          {lang === 'fr' ? <>Mail pro en <em className="italic text-primary">60 secondes</em>.</> : <>Pro email in <em className="italic text-primary">60 seconds</em>.</>}
        </h1>
      </div>

      <Stepper orientation="horizontal" current={step} steps={steps} />

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 border border-border p-6 min-h-[360px]">
          {step === 0 && (
            <div className="space-y-4 max-w-md">
              <p className="text-[13px] text-muted-foreground">{lang === 'fr' ? 'Quel domaine voulez-vous utiliser pour vos boîtes mail ?' : 'Which domain do you want to use for your mailboxes?'}</p>
              <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="kente-shop.com" className="font-mono" />
              <Button onClick={() => setStep(1)} disabled={!domain}>Suivant</Button>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground max-w-md">{lang === 'fr' ? 'Ajoutez ce TXT record sur votre DNS pour prouver que vous possédez ' : 'Add this TXT record to your DNS to prove ownership of '}<span className="font-mono text-foreground">{domain}</span></p>
              <DnsRow type="TXT" name="@" value={`zoho-verification=zb${Math.random().toString(36).slice(2, 12)}.zmverify.zoho.com`} onCopy={(v) => copy(v, 'txt')} copied={copied === 'txt'} />
              <Button onClick={verify}>{lang === 'fr' ? 'Vérifier' : 'Verify'}</Button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              {verified && <p className="text-[12px] text-success font-mono">✓ Domain verified</p>}
              <p className="text-[13px] text-muted-foreground max-w-md">{lang === 'fr' ? 'Ajoutez maintenant les enregistrements MX pour acheminer le mail.' : 'Now add the MX records to route email.'}</p>
              <div className="space-y-2">
                <DnsRow type="MX" name="@" value="10 mx.zoho.com." onCopy={(v) => copy(v, 'mx1')} copied={copied === 'mx1'} />
                <DnsRow type="MX" name="@" value="20 mx2.zoho.com." onCopy={(v) => copy(v, 'mx2')} copied={copied === 'mx2'} />
                <DnsRow type="MX" name="@" value="50 mx3.zoho.com." onCopy={(v) => copy(v, 'mx3')} copied={copied === 'mx3'} />
                <DnsRow type="TXT" name="@" value="v=spf1 include:zoho.com ~all" onCopy={(v) => copy(v, 'spf')} copied={copied === 'spf'} />
              </div>
              <Button onClick={checkMx}>{lang === 'fr' ? 'Vérifier les MX' : 'Verify MX'}</Button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              {mxOk && <p className="text-[12px] text-success font-mono">✓ MX records active</p>}
              <p className="text-[13px] text-muted-foreground">{lang === 'fr' ? 'Créez vos boîtes mail.' : 'Create your mailboxes.'}</p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center border border-border">
                  <Input value={newAddr} onChange={(e) => setNewAddr(e.target.value)} placeholder="hello" className="border-0 font-mono" />
                  <span className="px-3 font-mono text-[13px] text-muted-foreground">@{domain}</span>
                </div>
                <Button onClick={() => { if (newAddr) { setMailboxes([...mailboxes, { addr: `${newAddr}@${domain}` }]); setNewAddr(''); } }}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="border border-border divide-y divide-border">
                {mailboxes.length === 0 && <p className="p-4 text-[12px] text-muted-foreground">{lang === 'fr' ? 'Aucune boîte créée.' : 'No mailbox created yet.'}</p>}
                {mailboxes.map((m) => (
                  <div key={m.addr} className="px-4 py-3 flex items-center gap-3 text-[13px] font-mono">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {m.addr}
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-success">active</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lg:col-span-5 border border-border p-5">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">SMTP / IMAP</p>
          <dl className="text-[12px] font-mono space-y-2">
            <div className="flex justify-between"><dt className="text-muted-foreground">SMTP host</dt><dd>smtp.zoho.com</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">SMTP port</dt><dd>465 (SSL)</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">IMAP host</dt><dd>imap.zoho.com</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">IMAP port</dt><dd>993 (SSL)</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">Webmail</dt><dd className="text-primary">mail.zoho.com</dd></div>
          </dl>
          <div className="bogolan-stripe h-1 mt-6 opacity-30" />
          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">{lang === 'fr' ? 'NebulaOS provisionne automatiquement Zoho Mail Lite — gratuit jusqu\'à 5 boîtes / domaine.' : 'NebulaOS auto-provisions Zoho Mail Lite — free up to 5 mailboxes per domain.'}</p>
        </aside>
      </div>
    </div>
  );
}

function DnsRow({ type, name, value, onCopy, copied }: { type: string; name: string; value: string; onCopy: (v: string) => void; copied: boolean }) {
  return (
    <div className="grid grid-cols-[60px,80px,1fr,40px] items-center border border-border font-mono text-[12px]">
      <span className="px-3 py-2 border-r border-border text-muted-foreground">{type}</span>
      <span className="px-3 py-2 border-r border-border text-muted-foreground">{name}</span>
      <span className="px-3 py-2 truncate">{value}</span>
      <button onClick={() => onCopy(value)} className="px-3 py-2 text-muted-foreground hover:text-foreground">
        {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
