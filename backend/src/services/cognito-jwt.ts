// Utility for Cognito JWT validation
import axios from 'axios';
import jwkToPem from 'jwk-to-pem';
import jwt, { JwtPayload } from 'jsonwebtoken';

const COGNITO_REGION = process.env.COGNITO_REGION!;
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!;
const COGNITO_JWKS_URL = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

let cachedJwks: any = null;
let cachedPems: { [key: string]: string } = {};

async function getPems() {
  if (Object.keys(cachedPems).length > 0) return cachedPems;
  if (!cachedJwks) {
    const { data } = await axios.get(COGNITO_JWKS_URL);
    cachedJwks = data;
  }
  const pems: { [key: string]: string } = {};
  for (const jwk of cachedJwks.keys) {
    pems[jwk.kid] = jwkToPem(jwk);
  }
  cachedPems = pems;
  return pems;
}

export async function verifyCognitoJwt(token: string): Promise<JwtPayload> {
  const pems = await getPems();
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
    throw new Error('Invalid JWT');
  }
  const pem = pems[decoded.header.kid];
  if (!pem) throw new Error('Invalid token: unknown kid');
  return new Promise((resolve, reject) => {
    jwt.verify(token, pem, { algorithms: ['RS256'] }, (err, payload) => {
      if (err) return reject(err);
      resolve(payload as JwtPayload);
    });
  });
}
