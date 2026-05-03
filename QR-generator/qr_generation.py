import os
import io
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic_settings import BaseSettings
import qrcode

class Settings(BaseSettings):
    DB_HOST: str = os.getenv("DB_HOST", "db")
    DB_PORT: int = int(os.getenv("DB_PORT", 5432))
    DB_NAME: str = os.getenv("DB_NAME", "pm_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASS: str = os.getenv("DB_PASS", "root")

settings = Settings()

app = FastAPI(title="QR Generator Service")

def get_db_connection():
    try:
        conn = psycopg2.connect(
            host=settings.DB_HOST,
            port=settings.DB_PORT,
            database=settings.DB_NAME,
            user=settings.DB_USER,
            password=settings.DB_PASS
        )
        return conn
    except Exception as e:
        print(f"DATABASE CONNECTION ERROR: {e}")
        return None

@app.get("/", response_class=HTMLResponse)
async def get_index():
    with open("index.html", "r") as f:
        return f.read()

@app.get("/api/parts")
async def list_parts():
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT part_id, part_name FROM equipment_parts ORDER BY part_id ASC")
        parts = cursor.fetchall()
        return parts
    finally:
        conn.close()

@app.get("/api/generate/{part_id}")
async def generate_qr(part_id: int):
    conn = get_db_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")
    
    try:
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        # Fetch the specific JSON hierarchy for your Mobile App
        cursor.execute("""
            SELECT eq.equipment_id, ee.element_id, ep.part_id, ep.part_name
            FROM equipment_parts ep
            JOIN equipment_element ee ON ep.element_id = ee.element_id
            JOIN equipments eq ON ee.equipment_id = eq.equipment_id
            WHERE ep.part_id = %s
        """, (part_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Part not found")

        payload = {
            "equipmentId": row['equipment_id'],
            "equipmentElementId": row['element_id'],
            "equipmentPartId": row['part_id']
        }
        
        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(json.dumps(payload))
        qr.make(fit=True)

        img = qr.make_image(fill_color="black", back_color="white")
        
        # Save to buffer
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        
        return StreamingResponse(buf, media_type="image/png")

    finally:
        conn.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)