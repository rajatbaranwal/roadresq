// Where a signed-in user lands by default
export const homePathFor = (user) =>
  !user ? '/' : user.role === 'mechanic' ? '/dashboard/mechanic' : '/dashboard';
