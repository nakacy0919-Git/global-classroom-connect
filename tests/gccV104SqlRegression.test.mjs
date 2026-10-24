import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../sql/gcc_v104_shared_code_rooms.sql',import.meta.url),'utf8');
const part=source.split('CREATE OR REPLACE FUNCTION public.gcc_v104_open_room_chart')[1];
test('V10.4 room lookup SQL does not shadow SQL room alias with PLpgSQL record',()=>{
  assert.ok(part, 'Expected V10.4 lookup function');
  assert.doesNotMatch(part,/DECLARE\s+v\s+record;g\s+record;r\s+record;/);
  assert.match(part,/v_room_rec record;/);
  assert.match(part,/FOR v_room_rec IN SELECT value AS room/);
  assert.match(part,/jsonb_array_elements_text\(v_room_rec\.room->'students'\)/);
  assert.match(part,/jsonb_array_elements\(v\.draft->'rooms'\) r\(room\)/);
});
