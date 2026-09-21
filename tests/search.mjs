import assert from 'node:assert/strict';
import '../dist/search.js';
const p={name:'Kenya slide scans',publicationYear:'2024',date:'Reviewed 2026',source:'https://example.org/2023'};
assert(AtlasSearch.matches(p,'2024'));
assert(AtlasSearch.matches(p,'Kenya year:2024'));
assert(AtlasSearch.matches(p,'2020–2025'));
assert(!AtlasSearch.matches(p,'2026'));
assert(!AtlasSearch.matches(p,'2023'));
assert(!AtlasSearch.matches({...p,publicationYear:''},'2024'));
assert(!AtlasSearch.matches(p,'2025-2020'));
assert(AtlasSearch.matches(p,''));
console.log('Publication-year search passed.');
// Exact results survive expansion; semantic additions require every concept and hard constraint.
const records=[
 {id:'a',name:'Phone examination',countries:['Kenya'],publicationYear:'2024',outcome:'Smartphone patient examinations: sensitivity 91%.',originalTitle:'Évaluation clinique'},
 {id:'b',name:'Slide study',countries:['Kenya'],publicationYear:'2023',outcome:'Digital cytology with sensitivity 94%.',evidenceBasis:'Slide scans'},
 {id:'c',name:'Screening',countries:['China'],publicationYear:'2024',outcome:'Smartphone sensitivity 99%.'},
 {id:'d',name:'Old review',countries:['Kenya'],publicationYear:'',date:'Reviewed 2024',outcome:'Smartphone sensitivity 81%.'},
];
const index=AtlasSearch.createIndex(records);
assert.deepEqual([...index.search('Kenya missed cases 2024').ids],['a']);
assert.deepEqual([...index.search('Kenya slide scans').ids],['b']);
assert(index.search('evaluation').exact.has('a'));
assert.deepEqual([...index.search('').ids],records.map(p=>p.id));
assert.equal(index.search('totallyunfindable').ids.size,0);
assert.deepEqual([...index.search('phones 2024').ids],['a','c']);
assert.deepEqual([...index.search('Kenya 2025',[{term:'kenya',synonyms:['China']}]).ids],[]);
assert.deepEqual([...index.search('Kenya camera 2024',[{term:'camera',synonyms:['smartphone']},{term:'kenya',synonyms:['China']}]).ids],['a']);
assert.deepEqual([...index.search('Kenya camera 2024',[{term:'camera',synonyms:['<script>','invented outcome',3]}]).ids],[]);
assert.deepEqual([...index.search('Kenya camera 2024',[{term:'unrelated',synonyms:['smartphone']}]).ids],[]);
const first=index.search('Kenya');assert.strictEqual(index.search('Kenya'),first);
const large=AtlasSearch.createIndex(Array.from({length:1000},(_,i)=>({...records[i%4],id:'p'+i})));
const began=performance.now();for(let i=0;i<1000;i++)large.search(i%2?'Kenya missed cases 2024':'slide scans');
console.log('Cached lookup benchmark, 1,000 queries / 1,000 records:',Math.round(performance.now()-began)+'ms');
