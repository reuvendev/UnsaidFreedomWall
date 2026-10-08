// Run on a trusted machine with Firebase Admin credentials and TEAM_MEMBER_PASSWORD environment variable.
const { initializeApp, getApps, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const {randomBytes,scryptSync} = require('node:crypto');
const [username,role] = process.argv.slice(2);
const allowed = ['owner','admin','moderator','developer','writer','social','community','qa','designer'];
if (!username || !/^[a-z0-9_]{3,30}$/.test(username) || !allowed.includes(role) || !process.env.TEAM_MEMBER_PASSWORD || process.env.TEAM_MEMBER_PASSWORD.length < 12) {
  console.error('Usage: TEAM_MEMBER_PASSWORD=<12+ chars> node scripts/create-team-member.cjs username role'); process.exit(1);
}
if (!getApps().length) initializeApp({credential:process.env.FIREBASE_SERVICE_ACCOUNT_JSON ? cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)) : applicationDefault()});
(async()=>{
  const ref=getFirestore().collection('tambayanslu_team_members').doc(username);
  if ((await ref.get()).exists) throw new Error('Username already exists; refusing to overwrite it');
  const salt=randomBytes(16).toString('hex');
  const passwordHash='scrypt:'+salt+':'+scryptSync(process.env.TEAM_MEMBER_PASSWORD,Buffer.from(salt,'hex'),64).toString('hex');
  await ref.create({role,passwordHash,disabled:false,sessionVersion:0,createdAt:new Date().toISOString()});
  console.log('Created team account:', username, role);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
