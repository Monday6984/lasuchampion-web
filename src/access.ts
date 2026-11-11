import type { Access, FieldAccess, Where } from 'payload'

/**
 * Two kinds of people log in:
 *  - staff (the `users` collection): admins and reporters, who use /admin;
 *  - members (the `members` collection): readers with profiles, who use the public site.
 * Members never get staff rights, so every staff check looks at the collection, not just "logged in".
 */
type MaybeUser = { collection?: string; role?: string | null; id?: number | string } | null | undefined

const staff = (u: unknown) => (u as MaybeUser)?.collection === 'users'
const admin = (u: unknown) => staff(u) && (u as MaybeUser)?.role === 'admin'

export const isStaff: Access = ({ req }) => staff(req.user)
export const isAdmin: Access = ({ req }) => admin(req.user)
export const isAdminField: FieldAccess = ({ req }) => admin(req.user)
export const isStaffField: FieldAccess = ({ req }) => staff(req.user)

/** Kept for shared code: "logged in" means staff here. */
export const isLoggedIn = isStaff

/** Staff see everything (drafts and scheduled items included); everyone else only published documents. */
export const publishedOrStaff: Access = ({ req }) => {
  if (staff(req.user)) return true
  return { _status: { equals: 'published' } }
}
export const publishedOrLoggedIn = publishedOrStaff

/** Admins can change any story; reporters only their own. */
export const adminOrOwnStory: Access = ({ req }) => {
  if (!staff(req.user)) return false
  if (admin(req.user)) return true
  return { author: { equals: (req.user as MaybeUser)?.id } } as Where
}

export const anyone: Access = () => true
export const nobody: Access = () => false

export const isStaffUser = staff
export const isAdminUser = admin
