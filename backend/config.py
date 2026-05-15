"""
config.py — All environment variables loaded once at startup.

Why pydantic-settings?
  - It reads from .env automatically (no manual load_dotenv needed)
  - It validates types at startup — if SUPABASE_URL is missing, the app
    crashes immediately with a clear error instead of failing silently later
  - One place for all config, no os.environ scattered across files
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # reCAPTCHA Enterprise
    recaptcha_site_key: str = ""
    recaptcha_api_key: str = ""

    # AI Keys
    groq_api_key: str = ""
    groq_api_key_2: str = ""
    gemini_api_key: str = ""
    mistral_api_key: str = ""
    
    # Payments
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""

    # App
    app_env: str = "development"
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"]

    # Free tier limits
    free_tests_per_day: int = 3
    free_chatbot_msgs_per_test: int = 10
    free_roadmap_per_day: int = 1
    premium_roadmap_per_day: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra='ignore',  # This prevents crashing if there are extra variables in .env
    )


# Single global instance — import this everywhere, don't reinstantiate
settings = Settings()
