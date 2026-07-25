import fs from 'fs/promises';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data.json');

export async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      settings: parsed.settings || null,
      tables: parsed.tables || [],
      categories: parsed.categories || [],
      menuItems: parsed.menuItems || [],
      users: parsed.users || [{ id: "1", username: "admin", password: "123", role: "admin" }],
      bills: parsed.bills || [],
      drawer: parsed.drawer || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0 },
      expenses: parsed.expenses || [],
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return { 
        settings: null, 
        tables: [], 
        categories: [], 
        menuItems: [],
        users: [{ id: "1", username: "admin", password: "123", role: "admin" }],
        bills: [],
        drawer: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0 },
        expenses: []
      };
    }
    throw error;
  }
}

export async function writeData(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}
