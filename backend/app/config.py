from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    admin_user: str = "brian"
    admin_pass: str = "anchor"
    lyra_token: str = ""
    jwt_secret: str = "change-me"
    jwt_alg: str = "HS256"
    database_url: str = "sqlite:///./anchor.db"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"


settings = Settings()
