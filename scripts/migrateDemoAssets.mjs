import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

const root = path.resolve(import.meta.dirname, '..');
const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) throw new Error('SUPABASE_URL과 SUPABASE_PUBLISHABLE_KEY가 필요해요.');

const personas = [
  { id: 'd0000000-0000-4000-8000-000000000001', name: 'seojin' },
  { id: 'd0000000-0000-4000-8000-000000000002', name: 'edge' },
  { id: 'd0000000-0000-4000-8000-000000000003', name: 'empty' },
];

const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

function migratedFileKey(id, persona, oldKey) {
  const fileName = oldKey.slice(oldKey.lastIndexOf('/') + 1);
  return `demo:${id}/${persona}/${fileName}`;
}

function migrateJourneyValue(value, id, persona) {
  if (Array.isArray(value)) return value.map((item) => migrateJourneyValue(item, id, persona));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [name, migrateJourneyValue(item, id, persona)]),
    );
  }
  if (typeof value === 'string' && value.startsWith('public:/photos/')) {
    return migratedFileKey(id, persona, value);
  }
  return value;
}

for (const persona of personas) {
  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({
    email: `${persona.name}@demo.local`,
    password: 'demo1234',
  });
  if (signInError) throw signInError;
  if (signIn.user.id !== persona.id) throw new Error(`${persona.name} UUID가 예상과 달라요.`);

  const seed = JSON.parse(
    await readFile(path.join(root, 'src', 'data', 'seed', `${persona.name}.json`), 'utf8'),
  );
  const oldKeys = [...new Set(seed.photos.map(({ fileKey }) => fileKey).filter(Boolean))];
  for (const oldKey of oldKeys) {
    if (!oldKey.startsWith('public:/photos/')) continue;
    const fileName = oldKey.slice(oldKey.lastIndexOf('/') + 1);
    for (const size of ['full', 'thumb']) {
      const file = await readFile(path.join(root, 'public', 'photos', size, fileName));
      const objectPath = `${persona.id}/${persona.name}/${size}/${fileName}`;
      const { error } = await client.storage.from('demo-assets').upload(objectPath, file, {
        contentType: 'image/webp',
        upsert: true,
      });
      if (error) throw new Error(`${objectPath}: ${error.message}`);
    }

    const { error: updateError } = await client
      .from('photos')
      .update({ file_key: migratedFileKey(persona.id, persona.name, oldKey) })
      .eq('file_key', oldKey);
    if (updateError) throw updateError;
  }

  const fixture = JSON.parse(
    await readFile(
      path.join(root, 'src', 'data', 'fixtures', `${persona.name}.journey.json`),
      'utf8',
    ),
  );
  const { personaId: _personaId, generatedBy: _generatedBy, about: _about, ...journey } = fixture;
  const payload = migrateJourneyValue(journey, persona.id, persona.name);
  const { error: journeyError } = await client
    .from('journeys')
    .upsert({ owner_id: persona.id, payload, updated_at: new Date().toISOString() });
  if (journeyError) throw journeyError;

  if (persona.name === 'seojin') {
    const credits = await readFile(path.join(root, 'public', 'photos', 'credits.json'));
    const { error: creditsError } = await client.storage
      .from('demo-assets')
      .upload(`${persona.id}/${persona.name}/credits.json`, credits, {
        contentType: 'application/json',
        upsert: true,
      });
    if (creditsError) throw creditsError;
  }

  console.log(`${persona.name}: 이미지 ${oldKeys.length * 2}개, Journey 1건 이관`);
  await client.auth.signOut();
}
