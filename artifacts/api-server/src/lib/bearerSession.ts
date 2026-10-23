/**
 * A request authenticated with a Bearer token (the mobile app) must not leave a session row behind: express-session saves
 * a session as soon as it is modified, so setting `userId` the ordinary way wrote a new row for every single request
 * (tens of thousands of rows for a few hundred logins). A non-enumerable property is invisible to the session's change
 * detection (it hashes the JSON form), yet `req.session.userId` reads exactly as before.
 */
export function attachBearerUser(session: object, userId: string): void {
  Object.defineProperty(session, "userId", { value: userId, enumerable: false, writable: true, configurable: true });
}
