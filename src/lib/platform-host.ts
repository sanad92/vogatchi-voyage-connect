export const PLATFORM_ADMIN_HOSTS = ['admin.safarerp.com'];

export const isPlatformAdminHost = (host: string = typeof window !== 'undefined' ? window.location.hostname : '') =>
  PLATFORM_ADMIN_HOSTS.includes(host.toLowerCase());
