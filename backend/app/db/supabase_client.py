"""
FinSight AI — Supabase Database Client Setup
Loads credentials securely from environment variables.
"""
import os
import logging
from pathlib import Path
from typing import Tuple, Optional
from dotenv import load_dotenv

from supabase import create_client, Client

# Configure logger
logger = logging.getLogger("finsight.db")

# Load environment variables from backend/.env if present
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

# Retrieve configuration
SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY", "")

_client_instance: Optional[Client] = None


def get_supabase_client() -> Optional[Client]:
    """
    Get or initialize singleton Supabase Client.
    Never prints or exposes secret keys.
    """
    global _client_instance
    if _client_instance is not None:
        return _client_instance

    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.warning("Supabase credentials not configured in environment variables.")
        return None

    try:
        _client_instance = create_client(SUPABASE_URL, SUPABASE_KEY)
        logger.info("Supabase client initialized successfully.")
        return _client_instance
    except Exception as e:
        logger.error(f"Failed to initialize Supabase client: {str(e)}")
        return None


def check_supabase_connection() -> Tuple[bool, str]:
    """
    Backend startup database health check.
    Verifies connectivity without exposing secrets.
    """
    client = get_supabase_client()
    if client is None:
        return False, "Supabase credentials missing or invalid configuration"

    try:
        # Simple health probe query
        # Query schema or auth health endpoint
        res = client.table("uploaded_files").select("id").limit(1).execute()
        return True, "Supabase PostgreSQL connected successfully"
    except Exception as e:
        err_msg = str(e)
        if "PGRST205" in err_msg or "Could not find the table" in err_msg:
            # Client connected, but schema tables need to be created
            return True, "Supabase connected (Schema table creation pending)"
        return False, f"Supabase connection test failed: {err_msg[:100]}"
