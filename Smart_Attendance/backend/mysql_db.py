"""
ARDHNARISHWAR GLOBAL ATTENDANCE PLATFORM — MYSQL ADAPTER ENGINE
Enterprise Dual-Mode Database Layer with Native MySQL 8.0 Storage & Seamless Fallback.
Provides full MongoDB-compatible interface over MySQL relational tables.
"""

import json
import re
import uuid
from datetime import datetime, timezone
import pymysql
from pymysql.cursors import DictCursor
from bson import ObjectId


def _json_serial(obj):
    """JSON serializer for objects not serializable by default json code."""
    if isinstance(obj, (datetime,)):
        return obj.isoformat()
    if isinstance(obj, ObjectId):
        return str(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


def _match_document(doc: dict, query: dict) -> bool:
    """Evaluate a MongoDB-style query filter against a Python dictionary."""
    if not query:
        return True
    
    for key, condition in query.items():
        if key == "$or":
            if not isinstance(condition, list):
                return False
            if not any(_match_document(doc, sub_q) for sub_q in condition):
                return False
            continue
        
        if key == "$and":
            if not isinstance(condition, list):
                return False
            if not all(_match_document(doc, sub_q) for sub_q in condition):
                return False
            continue

        # Extract value using dot notation if present
        val = doc
        for part in key.split('.'):
            if isinstance(val, dict):
                val = val.get(part, None)
            else:
                val = None
                break

        # If condition is an operator dictionary
        if isinstance(condition, dict):
            for op, op_val in condition.items():
                if op == "$eq":
                    if val != op_val:
                        return False
                elif op == "$ne":
                    if val == op_val:
                        return False
                elif op == "$in":
                    if not isinstance(op_val, (list, tuple, set)):
                        return False
                    # Case-insensitive string match support if values are strings
                    matched = False
                    for target in op_val:
                        if val == target or (isinstance(val, str) and isinstance(target, str) and val.lower() == target.lower()):
                            matched = True
                            break
                    if not matched:
                        return False
                elif op == "$nin":
                    if isinstance(op_val, (list, tuple, set)) and val in op_val:
                        return False
                elif op == "$gt":
                    if val is None or val <= op_val:
                        return False
                elif op == "$gte":
                    if val is None or val < op_val:
                        return False
                elif op == "$lt":
                    if val is None or val >= op_val:
                        return False
                elif op == "$lte":
                    if val is None or val > op_val:
                        return False
                elif op == "$exists":
                    exists = val is not None
                    if exists != bool(op_val):
                        return False
                elif op == "$regex":
                    if not isinstance(val, str):
                        return False
                    options = condition.get("$options", "")
                    flags = re.IGNORECASE if "i" in options else 0
                    try:
                        if not re.search(op_val, val, flags):
                            return False
                    except Exception:
                        return False
        else:
            # Direct equality check
            if isinstance(condition, str) and isinstance(val, str):
                if val != condition:
                    return False
            elif val != condition:
                # Handle ObjectId comparison
                if isinstance(condition, (ObjectId, str)) and isinstance(val, (ObjectId, str)):
                    if str(val) != str(condition):
                        return False
                else:
                    return False

    return True


def _apply_projection(doc: dict, projection: dict) -> dict:
    """Apply MongoDB-style projection to a document."""
    if not projection or not doc:
        return doc
    
    # If exclusion projection (e.g. {"password": 0, "face_encoding": 0})
    is_exclusion = any(v == 0 or v is False for v in projection.values())
    if is_exclusion:
        res = dict(doc)
        for k, v in projection.items():
            if (v == 0 or v is False) and k in res:
                del res[k]
        return res
    
    # Inclusion projection
    res = {}
    if projection.get("_id", 1) != 0 and "_id" in doc:
        res["_id"] = doc["_id"]
    for k, v in projection.items():
        if (v == 1 or v is True) and k in doc:
            res[k] = doc[k]
    return res


class MySQLCursor:
    """Cursor wrapper for MySQLCollection results simulating PyMongo Cursor."""

    def __init__(self, items: list, projection: dict = None):
        self._items = items
        self._projection = projection
        self._sort_keys = []
        self._limit_val = None
        self._skip_val = 0

    def sort(self, key_or_list, direction=1):
        if isinstance(key_or_list, list):
            self._sort_keys = key_or_list
        elif isinstance(key_or_list, tuple):
            self._sort_keys = [key_or_list]
        else:
            self._sort_keys = [(key_or_list, direction)]
        return self

    def limit(self, n: int):
        self._limit_val = n
        return self

    def skip(self, n: int):
        self._skip_val = n
        return self

    def _get_processed_items(self) -> list:
        items = list(self._items)
        if self._sort_keys:
            for key, direction in reversed(self._sort_keys):
                rev = (direction == -1 or direction == pymysql.DESC if hasattr(pymysql, 'DESC') else direction == -1)
                items.sort(key=lambda x: (x.get(key) is None, x.get(key, "")), reverse=rev)
        
        if self._skip_val:
            items = items[self._skip_val:]
        if self._limit_val is not None and self._limit_val > 0:
            items = items[:self._limit_val]

        if self._projection:
            return [_apply_projection(item, self._projection) for item in items]
        return items

    def __iter__(self):
        return iter(self._get_processed_items())

    def __len__(self):
        return len(self._get_processed_items())

    def __getitem__(self, index):
        return self._get_processed_items()[index]


class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class UpdateResult:
    def __init__(self, matched_count=0, modified_count=0, upserted_id=None):
        self.matched_count = matched_count
        self.modified_count = modified_count
        self.upserted_id = upserted_id


class DeleteResult:
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


class MySQLCollection:
    """MongoDB Collection emulation layer backed by real MySQL 8.0 table."""

    def __init__(self, db_manager, table_name: str):
        self.db = db_manager
        self.table_name = table_name

    def _ensure_id(self, doc: dict) -> str:
        if "_id" not in doc:
            doc["_id"] = str(ObjectId())
        elif isinstance(doc["_id"], ObjectId):
            doc["_id"] = str(doc["_id"])
        return str(doc["_id"])

    def create_index(self, keys, **kwargs):
        """Create index placeholder for MySQL collection."""
        return True

    def insert_one(self, doc: dict):
        doc_copy = dict(doc)
        doc_id = self._ensure_id(doc_copy)
        doc["_id"] = doc_copy["_id"]

        comp_id = str(doc_copy.get("company_id") or "")
        emp_id = str(doc_copy.get("emp_id") or "")
        email = str(doc_copy.get("email") or "")
        status = str(doc_copy.get("status") or "")
        date_str = str(doc_copy.get("date") or "")
        payload = json.dumps(doc_copy, default=_json_serial)

        sql = f"""
        INSERT INTO `{self.table_name}` (`id`, `company_id`, `emp_id`, `email`, `status`, `date`, `data_json`)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE 
            `company_id`=VALUES(`company_id`),
            `emp_id`=VALUES(`emp_id`),
            `email`=VALUES(`email`),
            `status`=VALUES(`status`),
            `date`=VALUES(`date`),
            `data_json`=VALUES(`data_json`);
        """
        self.db.execute(sql, (doc_id, comp_id, emp_id, email, status, date_str, payload), commit=True)
        return InsertOneResult(doc_copy["_id"])

    def insert_many(self, docs: list):
        results = []
        for d in docs:
            r = self.insert_one(d)
            results.append(r.inserted_id)
        return results

    def find_one(self, query: dict = None, projection: dict = None, sort=None):
        cursor = self.find(query=query, projection=projection, sort=sort, limit=1)
        items = list(cursor)
        return items[0] if items else None

    def find(self, query: dict = None, projection: dict = None, sort=None, limit=0, skip=0):
        query = query or {}
        # Optimization: use indexed column in SQL where if simple equality
        where_clauses = []
        params = []
        
        if "company_id" in query and isinstance(query["company_id"], str):
            where_clauses.append("`company_id` = %s")
            params.append(query["company_id"])
        if "emp_id" in query and isinstance(query["emp_id"], str):
            where_clauses.append("`emp_id` = %s")
            params.append(query["emp_id"])
        if "date" in query and isinstance(query["date"], str):
            where_clauses.append("`date` = %s")
            params.append(query["date"])

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        sql = f"SELECT `data_json` FROM `{self.table_name}` {where_sql}"
        
        rows = self.db.query(sql, tuple(params))
        matched = []
        for r in rows:
            try:
                raw = r.get("data_json")
                if raw:
                    doc = json.loads(raw)
                    if _match_document(doc, query):
                        matched.append(doc)
            except Exception:
                continue

        cursor = MySQLCursor(matched, projection=projection)
        if sort:
            cursor.sort(sort)
        if skip:
            cursor.skip(skip)
        if limit:
            cursor.limit(limit)
        return cursor

    def update_one(self, query: dict, update: dict, upsert: bool = False):
        existing = self.find_one(query)
        if not existing:
            if upsert:
                new_doc = dict(query)
                # Apply update operators to new doc
                if "$set" in update:
                    new_doc.update(update["$set"])
                if "$setOnInsert" in update:
                    new_doc.update(update["$setOnInsert"])
                self.insert_one(new_doc)
                return UpdateResult(matched_count=0, modified_count=1, upserted_id=new_doc.get("_id"))
            return UpdateResult(matched_count=0, modified_count=0)

        updated_doc = dict(existing)
        if "$set" in update:
            for k, v in update["$set"].items():
                # Handle nested dot notation
                parts = k.split('.')
                curr = updated_doc
                for p in parts[:-1]:
                    if p not in curr or not isinstance(curr[p], dict):
                        curr[p] = {}
                    curr = curr[p]
                curr[parts[-1]] = v

        if "$inc" in update:
            for k, v in update["$inc"].items():
                parts = k.split('.')
                curr = updated_doc
                for p in parts[:-1]:
                    if p not in curr or not isinstance(curr[p], dict):
                        curr[p] = {}
                    curr = curr[p]
                curr[parts[-1]] = curr.get(parts[-1], 0) + v

        if "$unset" in update:
            for k in update["$unset"]:
                if k in updated_doc:
                    del updated_doc[k]

        doc_id = str(updated_doc.get("_id"))
        comp_id = str(updated_doc.get("company_id") or "")
        emp_id = str(updated_doc.get("emp_id") or "")
        email = str(updated_doc.get("email") or "")
        status = str(updated_doc.get("status") or "")
        date_str = str(updated_doc.get("date") or "")
        payload = json.dumps(updated_doc, default=_json_serial)

        sql = f"""
        UPDATE `{self.table_name}`
        SET `company_id`=%s, `emp_id`=%s, `email`=%s, `status`=%s, `date`=%s, `data_json`=%s
        WHERE `id`=%s;
        """
        self.db.execute(sql, (comp_id, emp_id, email, status, date_str, payload, doc_id), commit=True)
        return UpdateResult(matched_count=1, modified_count=1)

    def update_many(self, query: dict, update: dict, upsert: bool = False):
        matches = list(self.find(query))
        mod_count = 0
        if not matches and upsert:
            self.update_one(query, update, upsert=True)
            return UpdateResult(matched_count=0, modified_count=1)
        for doc in matches:
            res = self.update_one({"_id": doc["_id"]}, update)
            mod_count += res.modified_count
        return UpdateResult(matched_count=len(matches), modified_count=mod_count)

    def delete_one(self, query: dict):
        existing = self.find_one(query)
        if not existing:
            return DeleteResult(deleted_count=0)
        doc_id = str(existing["_id"])
        sql = f"DELETE FROM `{self.table_name}` WHERE `id`=%s;"
        self.db.execute(sql, (doc_id,), commit=True)
        return DeleteResult(deleted_count=1)

    def delete_many(self, query: dict):
        if not query:
            sql = f"TRUNCATE TABLE `{self.table_name}`;"
            self.db.execute(sql, commit=True)
            return DeleteResult(deleted_count=1)
        
        matches = list(self.find(query))
        if not matches:
            return DeleteResult(deleted_count=0)
        for doc in matches:
            self.delete_one({"_id": doc["_id"]})
        return DeleteResult(deleted_count=len(matches))

    def count_documents(self, query: dict = None):
        return len(list(self.find(query or {})))

    def distinct(self, key: str, query: dict = None):
        docs = list(self.find(query or {}))
        seen = set()
        out = []
        for d in docs:
            val = d.get(key)
            if val is not None and val not in seen:
                seen.add(val)
                out.append(val)
        return out


class MySQLDatabase:
    """Manages MySQL connection pool, database creation, table migrations, and collection access."""

    TABLES = [
        "companies", "users", "employees", "branches", "departments",
        "shifts", "attendance", "attendance_corrections", "leaves",
        "field_visits", "audit_logs", "policies", "notifications",
        "system_config", "permissions", "organization_approvers",
        "ip_change_requests"
    ]

    def __init__(self, host="localhost", port=3306, user="root", password="", database="smart_attendance"):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.database = database
        self._conn = None
        self._collections = {}

    def connect(self) -> bool:
        """Establish connection to MySQL server and ensure database & tables exist."""
        try:
            import socket
            with socket.create_connection((self.host, self.port), timeout=0.4):
                pass
        except Exception:
            self._conn = None
            return False

        try:
            # 1. Connect without database first to ensure database exists
            root_conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                cursorclass=DictCursor,
                connect_timeout=2
            )
            with root_conn.cursor() as cur:
                cur.execute(f"CREATE DATABASE IF NOT EXISTS `{self.database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            root_conn.close()

            # 2. Connect to the designated database
            self._conn = pymysql.connect(
                host=self.host,
                port=self.port,
                user=self.user,
                password=self.password,
                database=self.database,
                cursorclass=DictCursor,
                autocommit=True,
                charset='utf8mb4'
            )

            # 3. Create all required tables
            self._initialize_tables()
            print(f"[*] Successfully connected to Live MySQL Server at {self.host}:{self.port} (database: {self.database})")
            return True
        except Exception as e:
            print(f"[!] MySQL connection failed: {e}")
            self._conn = None
            return False

    def is_connected(self) -> bool:
        if not self._conn:
            return False
        try:
            self._conn.ping(reconnect=True)
            return True
        except Exception:
            return False

    def _initialize_tables(self):
        """Create relational schema tables for all collections."""
        with self._conn.cursor() as cur:
            for tbl in self.TABLES:
                cur.execute(f"""
                CREATE TABLE IF NOT EXISTS `{tbl}` (
                    `id` VARCHAR(64) NOT NULL PRIMARY KEY,
                    `company_id` VARCHAR(64) DEFAULT '',
                    `emp_id` VARCHAR(64) DEFAULT '',
                    `email` VARCHAR(255) DEFAULT '',
                    `status` VARCHAR(64) DEFAULT '',
                    `date` VARCHAR(32) DEFAULT '',
                    `data_json` LONGTEXT NOT NULL,
                    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    INDEX `idx_{tbl}_company` (`company_id`),
                    INDEX `idx_{tbl}_emp` (`emp_id`),
                    INDEX `idx_{tbl}_date` (`date`),
                    INDEX `idx_{tbl}_status` (`status`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                """)

    def execute(self, sql: str, params: tuple = None, commit: bool = False):
        if not self.is_connected():
            raise RuntimeError("MySQL server connection is not active.")
        with self._conn.cursor() as cur:
            cur.execute(sql, params or ())
            if commit:
                self._conn.commit()
            return cur.rowcount

    def query(self, sql: str, params: tuple = None) -> list:
        if not self.is_connected():
            raise RuntimeError("MySQL server connection is not active.")
        with self._conn.cursor() as cur:
            cur.execute(sql, params or ())
            return cur.fetchall()

    def get_collection(self, table_name: str) -> MySQLCollection:
        if table_name not in self._collections:
            self._collections[table_name] = MySQLCollection(self, table_name)
        return self._collections[table_name]

    def __getitem__(self, table_name: str) -> MySQLCollection:
        return self.get_collection(table_name)
