// why: separate entry so the better-auth client stays in the lazy login/signup chunks, not the root chunk every page loads.
export { passkey, signIn, signUp } from './auth-client'
export { useSignOut } from './use-sign-out'
