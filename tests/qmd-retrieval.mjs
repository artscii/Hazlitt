import assert from 'node:assert/strict';
import {catalogSearch} from '../pilot/retrieval.mjs';
const calls=[];
const rows=Array.from({length:53},(_,i)=>({filepath:`qmd://atlas/${i}.md`,body:'Evidence'}));
const store={searchLex:async(q,o)=>{calls.push(o);return rows.slice(0,o.limit);},searchVector:async(q,o)=>{calls.push(o);return rows.slice(0,o.limit);}};
const results=await catalogSearch(store,'screening',53);
assert.equal(results.length,53);assert(results.some(r=>r.file.endsWith('/52.md')));assert(calls.every(o=>o.limit===53));assert.equal(results[0].score,2/61);
console.log('PASS catalogue-wide retrieval, deduplication, and reciprocal rank fusion.');
