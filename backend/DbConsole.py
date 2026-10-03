import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import create_engine, MetaData, Table, inspect, select, insert, update, delete, DateTime, Date
from sqlalchemy.orm import sessionmaker
import databases

import json
from decimal import Decimal
from datetime import date, datetime

# Database Setup
DATABASE_URL = "sqlite:///./crm.db"
database = databases.Database(DATABASE_URL)
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
metadata = MetaData()
metadata.reflect(bind=engine)

app = FastAPI(title="Simple DB Console")

class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        if isinstance(obj, (date, datetime)):
            return obj.isoformat()
        return super().default(obj)

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/api/tables")
async def get_tables():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return {"tables": tables}

@app.get("/api/tables/{table_name}/schema")
async def get_table_schema(table_name: str):
    if table_name not in metadata.tables:
        raise HTTPException(status_code=404, detail="Table not found")
    table = metadata.tables[table_name]
    columns = []
    for col in table.columns:
        columns.append({
            "name": col.name,
            "type": str(col.type),
            "primary_key": col.primary_key,
            "nullable": col.nullable
        })
    return {"columns": columns}

@app.get("/api/tables/{table_name}/data")
async def get_table_data(table_name: str, limit: int = 100, offset: int = 0):
    if table_name not in metadata.tables:
        raise HTTPException(status_code=404, detail="Table not found")
    table = metadata.tables[table_name]
    query = select(table).limit(limit).offset(offset)
    rows = await database.fetch_all(query)
    
    # Convert records to dict, handle non-serializable objects manually if needed
    data = []
    for r in rows:
        r_dict = dict(r)
        data.append(r_dict)
    
    return json.loads(json.dumps(data, cls=CustomJSONEncoder))

@app.post("/api/tables/{table_name}/data")
async def insert_data(table_name: str, request: Request):
    if table_name not in metadata.tables:
        raise HTTPException(status_code=404, detail="Table not found")
    table = metadata.tables[table_name]
    payload = await request.json()
    
    # Remove empty values to let defaults apply
    payload = {k: v for k, v in payload.items() if v != "" and v is not None}
    
    for key, val in list(payload.items()):
        if key in table.columns:
            col_type = table.columns[key].type
            if isinstance(col_type, DateTime) and isinstance(val, str):
                try:
                    payload[key] = datetime.fromisoformat(val.replace("Z", "+00:00"))
                except ValueError:
                    pass
            elif isinstance(col_type, Date) and isinstance(val, str):
                try:
                    # sometimes inputs can be full timestamps, split to get just date
                    payload[key] = date.fromisoformat(val.split("T")[0])
                except ValueError:
                    pass
    
    try:
        query = insert(table).values(**payload)
        new_id = await database.execute(query)
        return {"status": "success", "inserted_id": new_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/tables/{table_name}/data/{pk_val}")
async def update_data(table_name: str, pk_val: str, request: Request):
    if table_name not in metadata.tables:
        raise HTTPException(status_code=404, detail="Table not found")
    table = metadata.tables[table_name]
    
    # Find PK column
    pk_col = next((c for c in table.columns if c.primary_key), None)
    if pk_col is None:
        raise HTTPException(status_code=400, detail="Table has no primary key")
        
    payload = await request.json()
    payload = {k: v for k, v in payload.items() if v != "" and v is not None}
    
    for key, val in list(payload.items()):
        if key in table.columns:
            col_type = table.columns[key].type
            if isinstance(col_type, DateTime) and isinstance(val, str):
                try:
                    payload[key] = datetime.fromisoformat(val.replace("Z", "+00:00"))
                except ValueError:
                    pass
            elif isinstance(col_type, Date) and isinstance(val, str):
                try:
                    payload[key] = date.fromisoformat(val.split("T")[0])
                except ValueError:
                    pass
    
    try:
        query = update(table).where(pk_col == pk_val).values(**payload)
        await database.execute(query)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/tables/{table_name}/data/{pk_val}")
async def delete_data(table_name: str, pk_val: str):
    if table_name not in metadata.tables:
        raise HTTPException(status_code=404, detail="Table not found")
    table = metadata.tables[table_name]
    
    pk_col = next((c for c in table.columns if c.primary_key), None)
    if pk_col is None:
        raise HTTPException(status_code=400, detail="Table has no primary key")
        
    try:
        query = delete(table).where(pk_col == pk_val)
        await database.execute(query)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/")
async def serve_ui():
    html_content = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DB Console</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; background-color: #f5f5f5; color: #333; margin: 0; }
            h1 { font-size: 24px; margin-bottom: 20px; }
            .container { display: flex; gap: 20px; height: 90vh; }
            .sidebar { width: 250px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-y: auto; }
            .content { flex: 1; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow-y: auto; }
            ul { list-style-type: none; padding: 0; }
            li { padding: 8px; cursor: pointer; border-bottom: 1px solid #eee; }
            li:hover { background-color: #f0f0f0; }
            li.active { font-weight: bold; color: #0066cc; background-color: #e6f2ff; border-radius: 4px; border: none; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; position: sticky; top: 0; }
            button { cursor: pointer; padding: 6px 12px; margin-right: 5px; border: none; border-radius: 4px; background: #0066cc; color: white; }
            button.danger { background: #dc3545; }
            button.secondary { background: #6c757d; }
            input, select { width: 100%; padding: 6px; box-sizing: border-box; }
            .form-group { margin-bottom: 15px; }
            .form-group label { display: block; margin-bottom: 5px; font-weight: bold; }
            .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
            .modal-content { background-color: #fefefe; margin: 5% auto; padding: 20px; border: 1px solid #888; width: 50%; border-radius: 8px; }
            .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
            .action-buttons { margin-bottom: 15px; }
        </style>
    </head>
    <body>
        <h1>Simple DB Console</h1>
        <div class="container">
            <div class="sidebar">
                <h3>Tables</h3>
                <ul id="table-list"></ul>
            </div>
            <div class="content">
                <div class="action-buttons" id="action-buttons" style="display:none;">
                    <h2 id="current-table-name" style="display:inline-block; margin-right: 20px; margin-top:0;"></h2>
                    <button onclick="openAddModal()">+ Add New Row</button>
                    <button class="secondary" onclick="loadTableData(currentTable)">Refresh</button>
                </div>
                <div id="table-container">Select a table to view data.</div>
            </div>
        </div>

        <div id="editModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal()">&times;</span>
                <h2 id="modal-title">Edit Row</h2>
                <form id="edit-form"></form>
                <div style="margin-top: 15px;">
                    <button onclick="saveRow()">Save</button>
                    <button class="secondary" onclick="closeModal()">Cancel</button>
                </div>
            </div>
        </div>

        <script>
            let currentTable = null;
            let currentSchema = null;
            let currentPk = null;
            let editMode = false; // true = edit, false = add

            async function fetchTables() {
                const res = await fetch('/api/tables');
                const data = await res.json();
                const list = document.getElementById('table-list');
                list.innerHTML = '';
                data.tables.forEach(table => {
                    const li = document.createElement('li');
                    li.textContent = table;
                    li.onclick = () => {
                        document.querySelectorAll('.sidebar li').forEach(el => el.classList.remove('active'));
                        li.classList.add('active');
                        loadTableData(table);
                    };
                    list.appendChild(li);
                });
            }

            async function loadTableData(table) {
                currentTable = table;
                document.getElementById('current-table-name').textContent = table;
                document.getElementById('action-buttons').style.display = 'block';
                
                const schemaRes = await fetch(`/api/tables/${table}/schema`);
                currentSchema = await schemaRes.json();
                
                const dataRes = await fetch(`/api/tables/${table}/data`);
                const data = await dataRes.json();
                
                renderTable(data);
            }

            function renderTable(data) {
                const container = document.getElementById('table-container');
                if (data.length === 0) {
                    container.innerHTML = '<p>No data found.</p>';
                    return;
                }
                
                let html = '<table><thead><tr>';
                currentSchema.columns.forEach(col => {
                    html += `<th>${col.name}</th>`;
                });
                html += '<th>Actions</th></tr></thead><tbody>';
                
                data.forEach(row => {
                    html += '<tr>';
                    currentSchema.columns.forEach(col => {
                        html += `<td>${row[col.name] !== null ? row[col.name] : '<em>null</em>'}</td>`;
                    });
                    
                    const pkCol = currentSchema.columns.find(c => c.primary_key);
                    const pkVal = pkCol ? row[pkCol.name] : null;
                    
                    html += `<td>
                        <button onclick='openEditModal(${JSON.stringify(row).replace(/'/g, "&apos;")})'>Edit</button>
                        <button class="danger" onclick="deleteRow('${pkVal}')">Delete</button>
                    </td>`;
                    html += '</tr>';
                });
                
                html += '</tbody></table>';
                container.innerHTML = html;
            }

            function openAddModal() {
                editMode = false;
                currentPk = null;
                document.getElementById('modal-title').textContent = `Add to ${currentTable}`;
                
                const form = document.getElementById('edit-form');
                form.innerHTML = '';
                currentSchema.columns.forEach(col => {
                    if (col.primary_key) return; // Skip PK for add
                    form.innerHTML += `
                        <div class="form-group">
                            <label>${col.name} <small>(${col.type})</small></label>
                            <input type="text" id="input-${col.name}" name="${col.name}">
                        </div>
                    `;
                });
                document.getElementById('editModal').style.display = 'block';
            }

            function openEditModal(row) {
                editMode = true;
                const pkCol = currentSchema.columns.find(c => c.primary_key);
                currentPk = row[pkCol.name];
                
                document.getElementById('modal-title').textContent = `Edit Row (PK: ${currentPk})`;
                const form = document.getElementById('edit-form');
                form.innerHTML = '';
                currentSchema.columns.forEach(col => {
                    const val = row[col.name] !== null ? row[col.name] : '';
                    form.innerHTML += `
                        <div class="form-group">
                            <label>${col.name} <small>(${col.type})</small></label>
                            <input type="text" id="input-${col.name}" name="${col.name}" value="${val}" ${col.primary_key ? 'readonly' : ''}>
                        </div>
                    `;
                });
                document.getElementById('editModal').style.display = 'block';
            }

            function closeModal() {
                document.getElementById('editModal').style.display = 'none';
            }

            async function saveRow() {
                const form = document.getElementById('edit-form');
                const inputs = form.querySelectorAll('input');
                const payload = {};
                
                inputs.forEach(input => {
                    if (!input.readOnly) {
                        payload[input.name] = input.value;
                    }
                });
                
                const url = editMode 
                    ? `/api/tables/${currentTable}/data/${currentPk}` 
                    : `/api/tables/${currentTable}/data`;
                    
                const method = editMode ? 'PUT' : 'POST';
                
                try {
                    const res = await fetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (res.ok) {
                        closeModal();
                        loadTableData(currentTable);
                    } else {
                        const err = await res.json();
                        alert('Error: ' + JSON.stringify(err));
                    }
                } catch (e) {
                    alert('Error saving row');
                }
            }

            async function deleteRow(pkVal) {
                if (!pkVal || pkVal === 'null') {
                    alert("Cannot delete row without primary key");
                    return;
                }
                if (confirm(`Are you sure you want to delete row with PK ${pkVal}?`)) {
                    try {
                        const res = await fetch(`/api/tables/${currentTable}/data/${pkVal}`, { method: 'DELETE' });
                        if (res.ok) {
                            loadTableData(currentTable);
                        } else {
                            const err = await res.json();
                            alert('Error: ' + JSON.stringify(err));
                        }
                    } catch (e) {
                        alert('Error deleting row');
                    }
                }
            }

            fetchTables();
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8001)
