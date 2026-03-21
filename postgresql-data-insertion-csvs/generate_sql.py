import csv
import os

csv_dir = r"d:\Parth\Projects\PM-Maintenance-System\postgresql-data-insertion-csvs"
out_dir = r"d:\Parth\Projects\PM-Maintenance-System\pm-backend\src\main\resources\db\migration"

tables = [
    ("companies", 2),
    ("plants", 3),
    ("departments", 4),
    ("roles", 5),
    ("employees", 6),
    ("lines", 7),
    ("spare_parts", 8),
    ("equipment_type", 9),
    ("equipments", 10),
    ("equipment_element", 11),
    ("equipment_parts", 12),
    ("pm_std_tasks", 13),
    ("pm_task_schedules", 14),
    ("pm_schedule_execution", 15),
    ("pm_schedule_approval", 16)
]

for table, version in tables:
    csv_file = os.path.join(csv_dir, f"{table}.csv")
    out_script = os.path.join(out_dir, f"V{version}__insert_{table}.sql")
    
    if not os.path.exists(csv_file):
        print(f"Skipping {csv_file} - File not found")
        continue
        
    with open(csv_file, 'r', encoding='utf-8-sig') as f, open(out_script, 'w', encoding='utf-8') as out:
        reader = csv.reader(f)
        try:
            headers = next(reader)
        except StopIteration:
            continue
            
        for row in reader:
            # Skip completely empty rows
            if not any(x.strip() for x in row):
                continue
            
            values = []
            for val in row:
                val = val.strip()
                if val == '' or val.upper() == 'NULL':
                    values.append("NULL")
                else:
                    # Escape single quotes for SQL
                    val = val.replace("'", "''")
                    values.append(f"'{val}'")
            
            sql = f"INSERT INTO {table} ({', '.join(headers)}) VALUES ({', '.join(values)});\n"
            out.write(sql)
            
    print(f"Successfully generated: V{version}__insert_{table}.sql")

print("\nAll migration scripts generated successfully!")
