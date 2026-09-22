import assert from 'node:assert/strict';
import fs from 'node:fs';
import {projectDocument,eligible} from '../pilot/service.mjs';
const p={id:'x',name:'Test',countries:['Kenya'],publicationYear:2024,evidenceBasis:'Patient examinations',outcome:'Public results',editNotes:'SECRET',password:'SECRET'};
assert(!projectDocument(p).includes('SECRET'));assert(projectDocument(p).includes('Public results'));
assert(eligible(p,'Africa 2024',{}));assert(!eligible(p,'Asia',{}));assert(!eligible(p,'2025',{}));assert(!eligible(p,'screening',{country:'China'}));assert(!eligible(p,'screening',{basis:'Slide scans'}));assert(eligible(p,'screening',{basis:'Patient examinations'}));
console.log('PASS: public-field whitelist and shared geography/year/examination constraints.');
