import {randomBytes,pbkdf2Sync} from 'node:crypto';
import readline from 'node:readline/promises';
import fs from 'node:fs';
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const password=await rl.question('Set the admin password (input is visible): ');rl.close();if(!password)throw new Error('Password is required');
const salt=randomBytes(16).toString('hex'),hash=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
fs.writeFileSync('.env','ADMIN_PASSWORD_HASH='+salt+':'+hash+'\n',{mode:0o600});console.log('Saved password hash in .env. Restart the container to apply it.');
