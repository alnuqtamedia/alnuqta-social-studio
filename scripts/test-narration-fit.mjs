import assert from 'node:assert/strict';
import {acceptsNarrationFit as accepts} from '../supabase/functions/_shared/narration-fit.mjs';
const text=n=>Array(n).fill('كلمة').join(' '),body={wordBudget:70,currentContent:{slides:[{voiceover:text(55)}]}};
assert.equal(accepts({slides:[{voiceover:text(55)}]},body),false);
assert.equal(accepts({slides:[{voiceover:text(70)}]},body),true);
assert.equal(accepts({slides:[{voiceover:text(90)}]},body),false);
assert.equal(accepts({slides:[]},body),false);
assert.equal(accepts({slides:[{voiceover:text(40)}]},{...body,wordBudget:40}),true);
console.log('Narration fit rejects unchanged or out-of-budget output before model fallback.');
