from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # JWT
    # WARNING: Override JWT_SECRET_KEY via environment variable in any non-local deployment.
    jwt_secret_key: str = "b-live-super-secret-jwt-key-for-hackathon-2024-change-in-prod"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24  # 24 hours

    # Database
    database_url: str = "sqlite+aiosqlite:///./blive.db"

    # App
    app_name: str = "B-Live API"
    app_version: str = "1.0.0"
    debug: bool = True


settings = Settings()
