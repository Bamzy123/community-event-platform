export function parseNumericId(param: string | string[] | undefined): number | null {
  if (!param) return null;
  const str = Array.isArray(param) ? param[0] : param;
  if (!str) return null;
  const num = Number(str);
  return isNaN(num) || num <= 0 ? null : num;
}

export function formatUserDto(user: {
  id: number;
  name: string;
  email: string;
  role: string;
  venues?: Array<{ venue: { id: number; name: string; address?: string | null } }>;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    managedVenues: user.venues ? user.venues.map((v) => v.venue) : []
  };
}
