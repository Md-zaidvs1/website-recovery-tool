import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Domain, RecoveredContact, SearchHistory } from '../../src/types';

const DATA_DIR = path.join(process.cwd(), '.data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

class JsonCollection<T extends { id: string; createdAt?: string; updatedAt?: string }> {
  private filePath: string;

  constructor(filename: string) {
    this.filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  private readAll(): T[] {
    try {
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      console.error(`Error reading ${this.filePath}:`, e);
      return [];
    }
  }

  private writeAll(items: T[]): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(items, null, 2), 'utf-8');
    } catch (e) {
      console.error(`Error writing ${this.filePath}:`, e);
    }
  }

  find(filter?: Partial<T> | ((item: T) => boolean)): T[] {
    const items = this.readAll() || [];
    const validItems = items.filter(item => item !== null && item !== undefined);
    if (!filter) return validItems;

    if (typeof filter === 'function') {
      return validItems.filter(filter);
    }

    return validItems.filter((item) => {
      for (const key in filter) {
        if (item[key] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  findOne(filter: Partial<T> | ((item: T) => boolean)): T | null {
    const items = this.find(filter);
    return items.length > 0 ? items[0] : null;
  }

  findById(id: string): T | null {
    return this.findOne({ id } as Partial<T>);
  }

  create(item: Omit<T, 'id' | 'createdAt' | 'updatedAt'> & Partial<{ id: string; createdAt: string; updatedAt: string }>): T {
    const items = this.readAll();
    const now = new Date().toISOString();
    const newItem = {
      ...item,
      id: item.id || Math.random().toString(36).substring(2, 11),
      createdAt: item.createdAt || now,
      updatedAt: item.updatedAt || now,
    } as unknown as T;

    items.push(newItem);
    this.writeAll(items);
    return newItem;
  }

  findByIdAndUpdate(id: string, update: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): T | null {
    const items = this.readAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const now = new Date().toISOString();
    const updatedItem = {
      ...items[index],
      ...update,
      updatedAt: now,
    } as T;

    items[index] = updatedItem;
    this.writeAll(items);
    return updatedItem;
  }

  deleteById(id: string): boolean {
    const items = this.readAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    this.writeAll(filtered);
    return true;
  }

  deleteMany(filter: Partial<T> | ((item: T) => boolean)): number {
    const items = this.readAll();
    let keep: T[] = [];
    let count = 0;

    if (typeof filter === 'function') {
      keep = items.filter((item) => {
        const match = filter(item);
        if (match) count++;
        return !match;
      });
    } else {
      keep = items.filter((item) => {
        let isMatch = true;
        for (const key in filter) {
          if (item[key] !== filter[key]) {
            isMatch = false;
            break;
          }
        }
        if (isMatch) count++;
        return !isMatch;
      });
    }

    this.writeAll(keep);
    return count;
  }

  countDocuments(filter?: Partial<T> | ((item: T) => boolean)): number {
    return this.find(filter).length;
  }
}

// Initialize collections
export const Users = new JsonCollection<User>('users.json');
export const Domains = new JsonCollection<Domain>('domains.json');
export const Contacts = new JsonCollection<RecoveredContact>('contacts.json');
export const History = new JsonCollection<SearchHistory>('history.json');

// Seed default users if empty
function seedData() {
  const adminEmail = 'admin@recovery.com';
  const adminName = 'Plant2tree Admin';
  const existingAdmin = Users.findOne((u) => u.email === adminEmail || u.name === adminName);

  if (!existingAdmin || Users.countDocuments() !== 1) {
    console.log('Enforcing single admin user (Plant2tree Admin)...');
    Users.deleteMany(() => true); // Clear all users
    
    const salt = bcrypt.genSaltSync(12);
    Users.create({
      name: 'Plant2tree Admin',
      email: 'admin@recovery.com',
      password: bcrypt.hashSync('admin@786', salt),
      role: 'admin',
      isActive: true,
    });
    console.log('Plant2tree Admin seeded successfully!');
  }
}

seedData();
