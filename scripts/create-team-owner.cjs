// Run once locally: node scripts/create-team-owner.cjs yourusername
// Requires TEAM_OWNER_PASSWORD and Firebase Admin credentials in environment.
const admin = require('firebase-admin');
const username = String(process.argv[2] || '').toLowerCase();
const password = process.env.TEAM_OWNER_PASSWORD;
if (!/^[a-z0-9_]{3,30}$/.test(username) || !password || password.length < 12) {
  console.error('Provide username (3-30 lowercase letters/numbers/_) and TEAM_OWNER_PASSWORD (12+ chars).');
  process.exit(1);
}
const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!admin.apps.length) admin.initializeApp({ credential: json ? admin.credential.cert(JSON.parse(json)) : admin.credential.applicationDefault() });
(async () => {
  const auth = admin.auth(); const db = admin.firestore();
  const email = `${username}@tambayanslu.com`;
  let user;
  try { user = await auth.getUserByEmail(email); }
  catch(e) { if (e.code !== 'auth/user-not-found') throw e; }
  if (!user) user = await auth.createUser({email,password,emailVerified:true,displayName:username});
  const ref = db.collection('teamMembers').doc(user.uid);
  const existing = await ref.get();
  if (existing.exists && existing.data().role !== 'owner') throw new Error('Existing non-owner account; refusing to elevate.');
  await ref.set({username,role:'owner',active:true,createdAt:existing.exists ? existing.data().createdAt : new Date().toISOString()});
  await db.collection('teamUsernames').doc(username).set({uid:user.uid,status:'active'});
  console.log(`Owner ready: ${username}`);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
