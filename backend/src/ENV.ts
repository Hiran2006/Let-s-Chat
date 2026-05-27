const ENV: {
  PORT: string;
  JWT_ACCESS_SECRET_KEY: string;
  JWT_REFRESH_SECRET_KEY: string;
} = {
  PORT: process.env.PORT || ("3000" as string),
  JWT_ACCESS_SECRET_KEY:
    process.env.JWT_ACCESS_SECRET_KEY || ("default_secret_key" as string),
  JWT_REFRESH_SECRET_KEY:
    process.env.JWT_REFRESH_SECRET_KEY ||
    ("default_refresh_secret_key" as string),
};

export default ENV;
