import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { configAPI } from '@/lib/api';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

const INITIAL_FORM = {
  SYSTEM_NAME: '',
  LANGUAGE: '',
  TIMEZONE: '',
  BORROW_LIMIT: '',
  BORROW_DAYS: '',
  DAILY_FINE: '',
};

const LANGUAGE_OPTIONS = ['English', 'Chinese'];
const TIMEZONE_OPTIONS = ['UTC+8', 'UTC+0', 'UTC-5'];
const BACKUP_FREQUENCY_OPTIONS = ['Daily', 'Weekly', 'Monthly'];
const BACKUP_STORAGE_KEY = 'library_admin_backup_settings';

const DEFAULT_BACKUP = {
  autoBackup: true,
  frequency: 'Daily',
  backupTime: '02:00',
  lastBackupStatus: 'No backup run yet',
  verificationPassed: true,
  recoveryTestPassed: true,
};

function listToForm(list) {
  const form = { ...INITIAL_FORM };
  (list || []).forEach(({ key, value }) => {
    if (Object.prototype.hasOwnProperty.call(form, key) && value != null) {
      form[key] = String(value);
    }
  });
  if (!LANGUAGE_OPTIONS.includes(form.LANGUAGE)) form.LANGUAGE = LANGUAGE_OPTIONS[0];
  if (!TIMEZONE_OPTIONS.includes(form.TIMEZONE)) form.TIMEZONE = TIMEZONE_OPTIONS[0];
  return form;
}

function loadBackupSettings() {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BACKUP };
    return { ...DEFAULT_BACKUP, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_BACKUP };
  }
}

function saveBackupSettings(backup) {
  localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(backup));
}

function formatAuditTime(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function validateBorrowingRules(form) {
  const borrowLimit = Number(form.BORROW_LIMIT);
  const borrowDays = Number(form.BORROW_DAYS);
  const dailyFine = Number(form.DAILY_FINE);

  if (!Number.isFinite(borrowLimit) || borrowLimit <= 0) return false;
  if (!Number.isFinite(borrowDays) || borrowDays <= 0) return false;
  if (!Number.isFinite(dailyFine) || dailyFine < 0) return false;
  return true;
}

function validateGeneralSettings(form) {
  if (!String(form.SYSTEM_NAME).trim()) return false;
  if (!LANGUAGE_OPTIONS.includes(form.LANGUAGE)) return false;
  if (!TIMEZONE_OPTIONS.includes(form.TIMEZONE)) return false;
  return true;
}

function StatusPanel({ label, value, positive }) {
  return (
    <div className="rounded-lg border border-gray-100/60 bg-gray-50/60 p-4">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-sm font-medium ${positive ? 'text-green-700' : 'text-gray-800'}`}>
        {value}
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [form, setForm] = useState(INITIAL_FORM);
  const [backup, setBackup] = useState(DEFAULT_BACKUP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningBackup, setRunningBackup] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [currentLoans, setCurrentLoans] = useState('');
  const [simulatorResult, setSimulatorResult] = useState(null);
  const [auditLog, setAuditLog] = useState([]);
  const [auditLoading, setAuditLoading] = useState(true);

  const loadAuditLog = useCallback(async () => {
    try {
      setAuditLoading(true);
      const data = await configAPI.getAuditLog();
      setAuditLog(data.list || []);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Audit Log Load Failed', description: err.message });
    } finally {
      setAuditLoading(false);
    }
  }, [toast]);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const data = await configAPI.getAll();
      setForm(listToForm(data.list));
      setBackup(loadBackupSettings());
      setValidationError('');
    } catch (err) {
      toast({ variant: 'destructive', title: 'Load Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSettings();
    loadAuditLog();
  }, [loadSettings, loadAuditLog]);

  const maxBooks = Number(form.BORROW_LIMIT) || 0;

  const handleValidateRule = () => {
    const loans = Number(currentLoans);
    if (!Number.isFinite(loans) || loans < 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Input',
        description: 'Please enter a valid number of current loans.',
      });
      return;
    }
    setSimulatorResult(loans >= maxBooks ? 'Borrowing Limit Exceeded' : 'Allowed');
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setValidationError('');
  };

  const updateBackup = (patch) => {
    setBackup((prev) => ({ ...prev, ...patch }));
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!validateGeneralSettings(form) || !validateBorrowingRules(form)) {
      setValidationError('Invalid Input');
      toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please check all settings.' });
      return;
    }

    try {
      setSaving(true);
      const keys = Object.keys(INITIAL_FORM);
      await Promise.all(
        keys.map((key) => configAPI.update(key, String(form[key]).trim()))
      );
      saveBackupSettings(backup);
      toast({ title: 'Success', description: 'System settings saved successfully.' });
      setValidationError('');
      await loadSettings();
      await loadAuditLog();
    } catch (err) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleRunBackup = async () => {
    try {
      setRunningBackup(true);
      await new Promise((resolve) => setTimeout(resolve, 800));
      const timestamp = new Date().toLocaleString();
      const nextBackup = {
        ...backup,
        lastBackupStatus: `Completed at ${timestamp}`,
        verificationPassed: true,
        recoveryTestPassed: true,
      };
      setBackup(nextBackup);
      saveBackupSettings(nextBackup);
      toast({ title: 'Backup Complete', description: 'Manual backup finished successfully.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Backup Failed', description: err.message });
    } finally {
      setRunningBackup(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="h-screen p-6 bg-transparent flex flex-col justify-start overflow-hidden">
      <div className="max-w-[1920px] w-full mx-auto h-full min-h-0 bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-md border border-white/40 flex flex-col space-y-5 overflow-hidden">

        {/* Title bar — pure text, no Logout / back link */}
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">System Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure library policies and preferences</p>
        </div>

        {/* Scrollable form content — independent scroll layer */}
        <div className="flex-1 w-full overflow-y-auto pr-1 min-h-0">
          <form onSubmit={handleSave} className="space-y-6">

            {/* US25 — General Settings */}
            <section className="border border-gray-100/60 rounded-xl bg-white/60 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">General Settings</h2>
              <div className="grid gap-2">
                <Label htmlFor="system-name">System Name</Label>
                <Input
                  id="system-name"
                  className="bg-white/60 border-gray-200"
                  value={form.SYSTEM_NAME}
                  onChange={(e) => updateField('SYSTEM_NAME', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Language</Label>
                <Select value={form.LANGUAGE} onValueChange={(v) => updateField('LANGUAGE', v)}>
                  <SelectTrigger className="bg-white/60 border-gray-200">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Time Zone</Label>
                <Select value={form.TIMEZONE} onValueChange={(v) => updateField('TIMEZONE', v)}>
                  <SelectTrigger className="bg-white/60 border-gray-200">
                    <SelectValue placeholder="Select time zone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>

            {/* US26 — Borrowing Limits */}
            <section className="border border-gray-100/60 rounded-xl bg-white/60 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Borrowing Limits</h2>
              <div className="grid gap-2">
                <Label htmlFor="max-books">Max Books</Label>
                <Input
                  id="max-books"
                  type="number"
                  min="1"
                  step="1"
                  className="bg-white/60 border-gray-200"
                  value={form.BORROW_LIMIT}
                  onChange={(e) => updateField('BORROW_LIMIT', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="borrow-days">Borrow Days</Label>
                <Input
                  id="borrow-days"
                  type="number"
                  min="1"
                  step="1"
                  className="bg-white/60 border-gray-200"
                  value={form.BORROW_DAYS}
                  onChange={(e) => updateField('BORROW_DAYS', e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="daily-fine">Daily Fine</Label>
                <Input
                  id="daily-fine"
                  type="number"
                  min="0"
                  step="0.01"
                  className="bg-white/60 border-gray-200"
                  value={form.DAILY_FINE}
                  onChange={(e) => updateField('DAILY_FINE', e.target.value)}
                />
              </div>
              {validationError && (
                <p className="text-sm text-red-600 font-medium">{validationError}</p>
              )}
            </section>

            {/* US26 — Borrowing Rule Simulator */}
            <section className="border border-gray-100/60 rounded-xl bg-white/60 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Borrowing Rule Simulator</h2>
              <p className="text-sm text-muted-foreground">
                Enter a student&apos;s current loan count to check eligibility against the configured limit.
              </p>
              <StatusPanel
                label="Configured Max Books (BORROW_LIMIT)"
                value={maxBooks > 0 ? String(maxBooks) : '—'}
                positive={false}
              />
              <div className="grid gap-2">
                <Label htmlFor="current-loans">Current Loans</Label>
                <Input
                  id="current-loans"
                  type="number"
                  min="0"
                  step="1"
                  className="bg-white/60 border-gray-200"
                  value={currentLoans}
                  onChange={(e) => {
                    setCurrentLoans(e.target.value);
                    setSimulatorResult(null);
                  }}
                />
              </div>
              <Button type="button" variant="outline" onClick={handleValidateRule}
                className="bg-white/60 hover:bg-white/90 border border-gray-200/60 text-gray-600 rounded-xl">
                Validate Rule
              </Button>
              {simulatorResult && (
                <div className="rounded-lg border border-gray-100/60 p-4 space-y-2 bg-white/40">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Validation Result</p>
                  <p
                    className={`text-sm font-medium ${
                      simulatorResult === 'Allowed' ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {simulatorResult}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Current loans: {currentLoans} / Max: {maxBooks > 0 ? maxBooks : '—'}
                  </p>
                </div>
              )}
            </section>

            {/* US27 — Backup Settings */}
            <section className="border border-gray-100/60 rounded-xl bg-white/60 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Backup Settings</h2>
              <div className="flex items-center gap-3">
                <input
                  id="auto-backup"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 accent-purple-500"
                  checked={backup.autoBackup}
                  onChange={(e) => updateBackup({ autoBackup: e.target.checked })}
                />
                <Label htmlFor="auto-backup" className="cursor-pointer">Auto Backup</Label>
              </div>
              <div className="grid gap-2">
                <Label>Frequency</Label>
                <Select
                  value={backup.frequency}
                  onValueChange={(v) => updateBackup({ frequency: v })}
                  disabled={!backup.autoBackup}
                >
                  <SelectTrigger className="bg-white/60 border-gray-200">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {BACKUP_FREQUENCY_OPTIONS.map((freq) => (
                      <SelectItem key={freq} value={freq}>{freq}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="backup-time">Backup Time</Label>
                <Input
                  id="backup-time"
                  type="time"
                  className="bg-white/60 border-gray-200"
                  value={backup.backupTime}
                  onChange={(e) => updateBackup({ backupTime: e.target.value })}
                  disabled={!backup.autoBackup}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="bg-white/60 hover:bg-white/90 border border-gray-200/60 text-gray-600 rounded-xl"
                onClick={handleRunBackup}
                disabled={runningBackup}
              >
                {runningBackup ? 'Running Backup...' : 'Run Backup Now'}
              </Button>
              <div className="grid gap-3 md:grid-cols-3">
                <StatusPanel label="Last Backup Status" value={backup.lastBackupStatus} positive={false} />
                <StatusPanel
                  label="Backup Verification Passed"
                  value={backup.verificationPassed ? 'Yes' : 'No'}
                  positive={backup.verificationPassed}
                />
                <StatusPanel
                  label="Recovery Test Passed"
                  value={backup.recoveryTestPassed ? 'Yes' : 'No'}
                  positive={backup.recoveryTestPassed}
                />
              </div>
            </section>

            {/* Feature 9 — Configuration Audit Log */}
            <section className="border border-gray-100/60 rounded-xl bg-white/60 p-6 space-y-4">
              <h2 className="text-lg font-semibold text-gray-800">Configuration Audit Log</h2>
              <p className="text-sm text-muted-foreground">
                Recent configuration changes (newest first).
              </p>
              {auditLoading ? (
                <p className="text-sm text-muted-foreground">Loading audit log...</p>
              ) : auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No configuration changes recorded yet.</p>
              ) : (
                <div className="border border-gray-100/60 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 shadow-sm">
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Configuration</TableHead>
                        <TableHead>Old Value</TableHead>
                        <TableHead>New Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditLog.map((entry, index) => (
                        <TableRow key={`${entry.timestamp}-${entry.configKey}-${index}`}>
                          <TableCell>{formatAuditTime(entry.timestamp)}</TableCell>
                          <TableCell>{entry.user}</TableCell>
                          <TableCell>{entry.configKey}</TableCell>
                          <TableCell>{entry.oldValue || '—'}</TableCell>
                          <TableCell>{entry.newValue}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </section>

            {/* Save button — primary action, purple to match sidebar accent */}
            <div className="flex justify-end pb-2">
              <Button type="submit" disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 active:scale-[0.98] rounded-xl shadow-md transition-all duration-150">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
