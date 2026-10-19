/** SafeScan Brasil | B5-B | OFFLINE worker, invoked only from test process.
 * Never starts a listener, camera, database or network connection.
 */
if(process.env.SAFESCAN_B5B_DIAGNOSTIC_CHILD!=='1')throw Error('diagnostic_worker_direct_execution_denied');
import {runScenario} from './operationalSseRevocationRace.test.mjs';
const kind=process.argv[2];
if(kind!=='user'&&kind!=='device')throw Error('invalid_kind');
console.log(JSON.stringify(await runScenario(kind)));
