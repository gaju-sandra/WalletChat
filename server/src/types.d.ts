// Shapes shared across the server. A .d.ts file holds only types: Node never runs it.

// The signed-in person's row from our users table (the columns requireUser selects)
export type AuthUser = {
  id: number;
  name: string;
  phone: string;
};

// Tells TypeScript that requests carry `req.user`. requireUser (auth.ts) sets it before any protected
// route runs, so those routes can rely on it.
declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}
