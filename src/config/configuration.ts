export default () => ({
  database: {
    url: process.env.DATABASE_URL,
  },
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
  },
  patreon: {
    clientId: process.env.PATREON_CLIENT_ID,
    clientSecret: process.env.PATREON_CLIENT_SECRET,
  },
  instagram: {
    username: process.env.INSTAGRAM_USERNAME,
    password: process.env.INSTAGRAM_PASSWORD,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'credenza-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
});