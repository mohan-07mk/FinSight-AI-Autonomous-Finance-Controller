"""
FinSight AI — Base Repository Pattern
Handles communication with Supabase and seamlessly falls back to thread-safe local store.
"""
from typing import Dict, List, Any, Optional
import logging
from app.db.supabase_client import get_supabase_client

logger = logging.getLogger("finsight.repository")


class BaseRepository:
    """Base repository class wrapping Supabase table interactions."""

    def __init__(self, table_name: str):
        self.table_name = table_name

    @property
    def client(self):
        return get_supabase_client()

    def is_available(self) -> bool:
        return self.client is not None

    def insert_record(self, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Insert a single record into Supabase."""
        if not self.is_available():
            return None
        try:
            res = self.client.table(self.table_name).insert(data).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return data
        except Exception as e:
            logger.warning(f"Supabase insert error on {self.table_name}: {e}")
            return None

    def bulk_insert_records(self, records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Insert multiple records into Supabase."""
        if not self.is_available() or not records:
            return []
        try:
            res = self.client.table(self.table_name).upsert(records).execute()
            return res.data or records
        except Exception as e:
            logger.warning(f"Supabase bulk insert error on {self.table_name}: {e}")
            return []

    def fetch_all(self) -> List[Dict[str, Any]]:
        """Fetch all records from Supabase."""
        if not self.is_available():
            return []
        try:
            res = self.client.table(self.table_name).select("*").execute()
            return res.data or []
        except Exception as e:
            logger.warning(f"Supabase fetch_all error on {self.table_name}: {e}")
            return []

    def fetch_by_id(self, key_col: str, value: Any) -> Optional[Dict[str, Any]]:
        """Fetch a record by key column value."""
        if not self.is_available():
            return None
        try:
            res = self.client.table(self.table_name).select("*").eq(key_col, value).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as e:
            logger.warning(f"Supabase fetch_by_id error on {self.table_name}: {e}")
            return None

    def update_record(self, key_col: str, key_val: Any, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a record in Supabase."""
        if not self.is_available():
            return None
        try:
            res = self.client.table(self.table_name).update(updates).eq(key_col, key_val).execute()
            if res.data and len(res.data) > 0:
                return res.data[0]
            return updates
        except Exception as e:
            logger.warning(f"Supabase update error on {self.table_name}: {e}")
            return None
