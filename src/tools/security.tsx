import { useState } from 'react';

import { RunSection, SourceCard } from '@/components/pdf-parts';
import { Body, Card, ErrorBanner, Field, Label, Screen, SwitchRow } from '@/components/ui';
import { outName, usePdfSource, useToolRun } from '@/hooks/use-tool';
import { readBytes } from '@/lib/files';
import * as ops from '@/lib/pdf/ops';

export function ProtectTool() {
  const src = usePdfSource();
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
            <Field label="Password untuk membuka" value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
            <Field label="Ulangi password" value={confirm} onChangeText={setConfirm} secureTextEntry autoCapitalize="none" textContentType="newPassword" />
            {mismatch && <ErrorBanner message="Password tidak sama." />}
            <Body secondary>Enkripsi AES-256. Password tidak bisa dipulihkan jika lupa.</Body>
          </Card>
          <Card>
            <Label>Izin untuk pembaca</Label>
            <SwitchRow label="Boleh mencetak" value={printing} onChange={setPrinting} />
            <SwitchRow label="Boleh menyalin teks" value={copying} onChange={setCopying} />
            <SwitchRow label="Boleh mengubah" value={modifying} onChange={setModifying} />
            <Field
              label="Password pemilik (opsional)"
              value={owner}
              onChangeText={setOwner}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Untuk melewati batasan di atas"
            />
          </Card>
        </>
      )}
      <RunSection
        title="Kunci PDF"
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

export function UnlockTool() {
  const src = usePdfSource();
  const run = useToolRun();
  const [pw, setPw] = useState('');
  const s = src.source;

  return (
    <Screen>
      <SourceCard source={s} onPick={src.pick} loading={src.loading} error={src.error} />
      {s && (
        <Card>
          {!s.info.encrypted && <Body secondary>PDF ini tidak terkunci.</Body>}
          <Field label="Password" value={pw} onChangeText={setPw} secureTextEntry autoCapitalize="none" textContentType="password" />
          <Body secondary>Hanya untuk PDF yang password-nya kamu ketahui.</Body>
        </Card>
      )}
      <RunSection
        title="Buka kunci"
        disabled={!s || !s.info.encrypted || !pw}
        run={run}
        onPress={() => run.run(async () => [{ name: outName(s!, 'terbuka'), bytes: await ops.unlock(await readBytes(s!.uri), pw) }])}
      />
    </Screen>
  );
}
