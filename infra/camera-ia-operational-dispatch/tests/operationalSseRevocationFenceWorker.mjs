/** SafeScan Brasil | B5-B2 isolated child — no network */
import {childScenario} from './operationalSseRevocationFence.test.mjs';
const kind=process.argv[2];
if(!['user','device'].includes(kind))process.exit(2);
try {process.stdout.write(JSON.stringify(await childScenario(kind))+'\n');}
catch(error){process.stderr.write(String(error?.message??error));process.exit(3);}
