import { useState } from 'react';

import { RunSection, SourceCard } from '@/components/pdf-parts';
import { Body, Card, ErrorBanner, Field, Label, Screen, SwitchRow } from '@/components/ui';
import { outName, type ToolProps, usePdfSource, useToolRun } from '@/hooks/use-tool';
import { readBytes } from '@/lib/files';
import { t } from '@/lib/i18n';
import * as ops from '@/lib/pdf/ops';

export function ProtectTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [owner, setOwner] = useState('');
  const [printing, setPrinting] = useState(true);
  const [copying, setCopying] = useState(false);
  const [modifying, setModifying] = useState(false);
  const s = src.source;
  const mismatch = confirm.length > 0 && pw !== confirm;

  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <>
          <Card>
            <Field label={t('Password untuk membuka')} value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
            <Field label={t('Ulangi password')} value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
            {mismatch && <ErrorBanner message={t('Password tidak sama.')} />}
            <Body secondary>{t('Enkripsi AES-256. Password tidak bisa dipulihkan jika lupa.')}</Body>
          </Card>
          <Card>
            <Label>{t('Izin untuk pembaca')}</Label>
            <SwitchRow label={t('Boleh mencetak')} value={printing} onChange={setPrinting} />
            <SwitchRow label={t('Boleh menyalin teks')} value={copying} onChange={setCopying} />
            <SwitchRow label={t('Boleh mengubah')} value={modifying} onChange={setModifying} />
            <Field
              label={t('Password pemilik (opsional)')}
              value={owner}
              onChangeText={setOwner}
              secureTextEntry
              autoCapitalize="none"
              placeholder={t('Untuk melewati batasan di atas')}
            />
          </Card>
        </>
      )}
      <RunSection
        title={t('Kunci PDF')}
        disabled={!s || !pw || pw !== confirm}
        run={run}
        onPress={() =>
          run.run(async () => [
            {
              name: outName(s!, 'terkunci'),
              bytes: await ops.protect(await readBytes(s!.uri), {
                userPassword: pw,
                ownerPassword: owner || undefined,
                allowPrinting: printing,
                allowCopying: copying,
                allowModifying: modifying,
              }),
            },
          ])
        }
      />
    </Screen>
  );
}

export function UnlockTool({ initial }: ToolProps) {
  const src = usePdfSource(initial?.[0]);
  const run = useToolRun();
  const [pw, setPw] = useState('');
  const s = src.source;

  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          {!s.info.encrypted && <Body secondary>{t('PDF ini tidak terkunci.')}</Body>}
          <Field label={t('Password')} value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" textContentType="password" />
          <Body secondary>{t('Hanya untuk PDF yang password-nya kamu ketahui.')}</Body>
        </Card>
      )}
      <RunSection
        title={t('Buka kunci')}
        disabled={!s || !s.info.encrypted || !pw}
        run={run}
        onPress={() => run.run(async () => [{ name: outName(s!, 'terbuka'), bytes: await ops.unlock(await readBytes(s!.uri), pw) }])}
      />
    </Screen>
  );
}
