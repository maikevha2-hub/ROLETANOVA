import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  role: string;
  created_at: string;
}

export interface Prize {
  id: string;
  name: string;
  slug: string;
  probability: number;
  monthly_limit: number;
  is_active: boolean;
  slice_index: number;
  color: string;
  bimonthly_limit?: number;
}

export interface Spin {
  id: string;
  order_id: string;
  prize_id: string;
  prize_name: string;
  is_winner: boolean;
  rotation_angle: number;
  created_at: string;
  customer_name?: string;
  order_total?: number;
}

export interface Settings {
  store_name: string;
  store_url: string;
  cardapioweb_api_url: string;
  cardapioweb_api_key: string;
  require_cardapioweb_validation?: boolean;
  whatsapp_number?: string;
}

interface DatabaseSchema {
  users: User[];
  prizes: Prize[];
  spins: Spin[];
  settings?: Settings;
}

const ROOT_DB_PATH = path.join(process.cwd(), "db.json");
const TMP_DB_PATH = path.sep === "/" ? "/tmp/db.json" : path.join(process.cwd(), "db_tmp.json");

let cachedDB: DatabaseSchema | null = null;

// Initialize Firebase Admin Firestore
let firestoreDb: Firestore | null = null;

try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const app = getApps().length === 0 ? initializeApp({ projectId: config.projectId }) : getApp();
    
    // Check if named databaseId is specified
    if (config.firestoreDatabaseId && config.firestoreDatabaseId !== "(default)") {
      firestoreDb = getFirestore(app, config.firestoreDatabaseId);
    } else {
      firestoreDb = getFirestore(app);
    }
    console.log(`[Firestore] Initialized Firestore successfully for project ${config.projectId}`);
  }
} catch (e) {
  console.error("[Firestore] Error initializing Firebase Admin:", e);
}

const DEFAULT_PRIZES: Prize[] = [
  { id: "1", name: "Tente Outra Vez", slug: "no_prize", probability: 0.70, monthly_limit: 0, is_active: true, slice_index: 0, color: "#6C757D" },
  { id: "2", name: "5% Desconto", slug: "desconto_5", probability: 0.08, monthly_limit: 0, is_active: true, slice_index: 1, color: "#9B59B6" },
  { id: "3", name: "Pix de R$20,00", slug: "pix_20", probability: 0.02, monthly_limit: 3, is_active: true, slice_index: 2, color: "#E63946" },
  { id: "4", name: "Vale R$50", slug: "vale_50", probability: 0.02, monthly_limit: 2, is_active: true, slice_index: 3, color: "#F4A261" },
  { id: "5", name: "Refrigerante", slug: "refrigerante", probability: 0.04, monthly_limit: 0, is_active: true, slice_index: 4, color: "#2A9D8F" },
  { id: "6", name: "Upgrade Batata P→G", slug: "upgrade", probability: 0.04, monthly_limit: 0, is_active: true, slice_index: 5, color: "#E9C46A" },
  { id: "7", name: "Batata Grátis", slug: "batata", probability: 0.04, monthly_limit: 0, is_active: true, slice_index: 6, color: "#457B9D" },
  { id: "8", name: "Hot Dog Grátis", slug: "hotdog", probability: 0.03, monthly_limit: 0, is_active: true, slice_index: 7, color: "#E76F51" },
  { id: "9", name: "Cheese Salada", slug: "cheese_salada", probability: 0.025, monthly_limit: 0, is_active: true, slice_index: 8, color: "#8B4513" },
  { id: "10", name: "R$200,00 no Pix", slug: "pix_200", probability: 0.005, monthly_limit: 1, is_active: true, slice_index: 9, color: "#EFBF04", bimonthly_limit: 1 }
];

const DEFAULT_SETTINGS: Settings = {
  store_name: process.env.STORE_NAME || "Touros Burguer",
  store_url: process.env.STORE_URL || "",
  cardapioweb_api_url: process.env.CARDAPIOWEB_API_URL || "https://integracao.cardapioweb.com",
  cardapioweb_api_key: process.env.CARDAPIOWEB_API_KEY || "dk5zzBpzUj7BASZpHoBgLVh85fXiFFiN2BQfmTeeYEf4K5omcH5yrGY3Pdey",
  require_cardapioweb_validation: true,
  whatsapp_number: process.env.WHATSAPP_NUMBER || ""
};

function readDBLocal(): DatabaseSchema {
  let rawData = "";
  if (fs.existsSync(ROOT_DB_PATH)) {
    try { rawData = fs.readFileSync(ROOT_DB_PATH, "utf-8"); } catch (e) {}
  }
  if (!rawData && fs.existsSync(TMP_DB_PATH)) {
    try { rawData = fs.readFileSync(TMP_DB_PATH, "utf-8"); } catch (e) {}
  }

  if (rawData) {
    try {
      const parsed: DatabaseSchema = JSON.parse(rawData);
      if (!parsed.settings) parsed.settings = DEFAULT_SETTINGS;
      if (!parsed.spins) parsed.spins = [];
      if (!parsed.prizes || parsed.prizes.length === 0) parsed.prizes = DEFAULT_PRIZES;
      if (!parsed.users) parsed.users = [];
      return parsed;
    } catch (error) {}
  }

  return {
    users: [],
    prizes: DEFAULT_PRIZES,
    spins: [],
    settings: DEFAULT_SETTINGS
  };
}

function writeDBLocal(data: DatabaseSchema) {
  cachedDB = data;
  const json = JSON.stringify(data, null, 2);

  try {
    fs.writeFileSync(ROOT_DB_PATH, json, "utf-8");
  } catch (error) {}

  try {
    fs.writeFileSync(TMP_DB_PATH, json, "utf-8");
  } catch (error) {}
}

export const db = {
  // Init and Seed
  init: async () => {
    let localData = readDBLocal();
    cachedDB = localData;

    // Load or Sync with Firestore if available
    if (firestoreDb) {
      try {
        console.log("[Firestore] Fetching current state from Cloud Firestore...");

        // Load Settings
        const settingsDoc = await firestoreDb.collection("settings").doc("app_settings").get();
        if (settingsDoc.exists) {
          cachedDB.settings = { ...DEFAULT_SETTINGS, ...settingsDoc.data() as Settings };
        } else {
          await firestoreDb.collection("settings").doc("app_settings").set(cachedDB.settings || DEFAULT_SETTINGS);
        }

        // Load Prizes
        const prizesSnap = await firestoreDb.collection("prizes").get();
        if (!prizesSnap.empty) {
          const cloudPrizes: Prize[] = [];
          prizesSnap.forEach(doc => cloudPrizes.push(doc.data() as Prize));
          cachedDB.prizes = cloudPrizes;
        } else {
          // Seed prizes to Firestore
          const batch = firestoreDb.batch();
          DEFAULT_PRIZES.forEach(p => {
            const ref = firestoreDb!.collection("prizes").doc(p.id);
            batch.set(ref, p);
          });
          await batch.commit();
        }

        // Load Users
        const usersSnap = await firestoreDb.collection("users").get();
        if (!usersSnap.empty) {
          const cloudUsers: User[] = [];
          usersSnap.forEach(doc => cloudUsers.push(doc.data() as User));
          cachedDB.users = cloudUsers;
        }

        // Load Spins
        const spinsSnap = await firestoreDb.collection("spins").get();
        if (!spinsSnap.empty) {
          const cloudSpins: Spin[] = [];
          spinsSnap.forEach(doc => cloudSpins.push(doc.data() as Spin));
          // Merge local spins and cloud spins, keeping unique by id or order_id
          const spinMap = new Map<string, Spin>();
          cloudSpins.forEach(s => spinMap.set(s.id, s));
          cachedDB.spins.forEach(s => {
            if (!spinMap.has(s.id)) {
              spinMap.set(s.id, s);
              // Save local spin to Firestore
              firestoreDb!.collection("spins").doc(s.id).set(s).catch(e => console.error("Error syncing spin to firestore:", e));
            }
          });
          cachedDB.spins = Array.from(spinMap.values());
        } else if (cachedDB.spins.length > 0) {
          // Sync local spins to cloud
          for (const s of cachedDB.spins) {
            await firestoreDb.collection("spins").doc(s.id).set(s);
          }
        }

        console.log(`[Firestore] Cloud sync complete! ${cachedDB.spins.length} spins, ${cachedDB.prizes.length} prizes loaded.`);
      } catch (err) {
        console.error("[Firestore] Cloud sync failed, falling back to local storage:", err);
      }
    }

    // Seed admin user
    const adminEmail = (process.env.ADMIN_EMAIL || "tourosburguer.chp@gmail.com").toLowerCase().trim();
    const adminPassword = process.env.ADMIN_PASSWORD || "mf130511";
    const existingAdmin = cachedDB.users.find(u => u.role === "admin" || u.id === "admin-id-1");

    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(adminPassword, salt);
      const newAdmin: User = {
        id: "admin-id-1",
        email: adminEmail,
        password_hash: hash,
        name: "Administrador",
        role: "admin",
        created_at: new Date().toISOString()
      };
      cachedDB.users.push(newAdmin);
      if (firestoreDb) {
        firestoreDb.collection("users").doc(newAdmin.id).set(newAdmin).catch(e => console.error(e));
      }
      console.log(`Seeded admin user: ${adminEmail}`);
    } else {
      let changed = false;
      if (existingAdmin.email !== adminEmail) {
        existingAdmin.email = adminEmail;
        changed = true;
      }
      const isCorrect = await bcrypt.compare(adminPassword, existingAdmin.password_hash);
      if (!isCorrect) {
        const salt = await bcrypt.genSalt(10);
        existingAdmin.password_hash = await bcrypt.hash(adminPassword, salt);
        changed = true;
      }
      if (changed && firestoreDb) {
        firestoreDb.collection("users").doc(existingAdmin.id).set(existingAdmin).catch(e => console.error(e));
      }
    }

    writeDBLocal(cachedDB);
  },

  // Users functions
  getUserByEmail: async (email: string): Promise<User | undefined> => {
    if (!cachedDB) await db.init();
    return cachedDB!.users.find(u => u.email === email.toLowerCase().trim());
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    if (!cachedDB) await db.init();
    return cachedDB!.users.find(u => u.id === id);
  },

  // Prizes functions
  getPrizes: async (): Promise<Prize[]> => {
    if (!cachedDB) await db.init();
    return cachedDB!.prizes;
  },

  getPublicPrizes: async (): Promise<Partial<Prize>[]> => {
    if (!cachedDB) await db.init();
    return cachedDB!.prizes
      .filter(p => p.is_active)
      .map(p => ({
        id: p.id,
        name: p.name,
        slice_index: p.slice_index,
        color: p.color
      }));
  },

  updatePrize: async (prizeId: string, update: Partial<Prize>): Promise<boolean> => {
    if (!cachedDB) await db.init();
    const index = cachedDB!.prizes.findIndex(p => p.id === prizeId);
    if (index === -1) return false;

    cachedDB!.prizes[index] = {
      ...cachedDB!.prizes[index],
      ...update
    };
    writeDBLocal(cachedDB!);

    if (firestoreDb) {
      firestoreDb.collection("prizes").doc(prizeId).set(cachedDB!.prizes[index], { merge: true }).catch(e => console.error(e));
    }

    return true;
  },

  addPrize: async (prize: Prize): Promise<Prize> => {
    if (!cachedDB) await db.init();
    cachedDB!.prizes.push(prize);
    writeDBLocal(cachedDB!);

    if (firestoreDb) {
      firestoreDb.collection("prizes").doc(prize.id).set(prize).catch(e => console.error(e));
    }

    return prize;
  },

  deletePrize: async (prizeId: string): Promise<boolean> => {
    if (!cachedDB) await db.init();
    const len = cachedDB!.prizes.length;
    cachedDB!.prizes = cachedDB!.prizes.filter(p => p.id !== prizeId);
    if (cachedDB!.prizes.length < len) {
      writeDBLocal(cachedDB!);

      if (firestoreDb) {
        firestoreDb.collection("prizes").doc(prizeId).delete().catch(e => console.error(e));
      }

      return true;
    }
    return false;
  },

  // Spins functions
  getWinners: async (limit = 100): Promise<Spin[]> => {
    if (!cachedDB) await db.init();
    return [...cachedDB!.spins]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);
  },

  getSpinByOrderId: async (orderId: string): Promise<Spin | undefined> => {
    if (!cachedDB) await db.init();
    const cleanId = String(orderId || "").trim().toLowerCase();
    
    // First check memory
    const memorySpin = cachedDB!.spins.find(s => String(s.order_id || "").trim().toLowerCase() === cleanId);
    if (memorySpin) return memorySpin;

    // Check Cloud Firestore if memory missed
    if (firestoreDb) {
      try {
        const snap = await firestoreDb.collection("spins").where("order_id", "==", String(orderId).trim()).get();
        if (!snap.empty) {
          const spin = snap.docs[0].data() as Spin;
          cachedDB!.spins.push(spin);
          return spin;
        }
      } catch (err) {
        console.error("Error querying spin from firestore:", err);
      }
    }

    return undefined;
  },

  insertSpin: async (spin: Spin): Promise<void> => {
    if (!cachedDB) await db.init();
    cachedDB!.spins.push(spin);
    writeDBLocal(cachedDB!);

    if (firestoreDb) {
      try {
        await firestoreDb.collection("spins").doc(spin.id).set(spin);
        console.log(`[Firestore] Spin saved permanently to Cloud Firestore: order ${spin.order_id}`);
      } catch (err) {
        console.error("[Firestore] Error saving spin to Cloud Firestore:", err);
      }
    }

    console.log(`[DB] Successfully saved spin for order ${spin.order_id} (Prize: ${spin.prize_name}, Winner: ${spin.is_winner})`);
  },

  countSpins: async (filter: { prize_id?: string; is_winner?: boolean; since?: string }): Promise<number> => {
    if (!cachedDB) await db.init();
    return cachedDB!.spins.filter(s => {
      if (filter.prize_id && s.prize_id !== filter.prize_id) return false;
      if (filter.is_winner !== undefined && s.is_winner !== filter.is_winner) return false;
      if (filter.since && new Date(s.created_at).getTime() < new Date(filter.since).getTime()) return false;
      return true;
    }).length;
  },

  getStats: async (): Promise<any> => {
    if (!cachedDB) await db.init();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalSpins = cachedDB!.spins.length;
    const totalWinners = cachedDB!.spins.filter(s => s.is_winner).length;
    const monthSpins = cachedDB!.spins.filter(s => new Date(s.created_at) >= monthStart).length;
    const monthWinners = cachedDB!.spins.filter(s => s.is_winner && new Date(s.created_at) >= monthStart).length;

    // Calculate monthly prize distribution
    const distributionMap: { [key: string]: number } = {};
    cachedDB!.spins
      .filter(s => new Date(s.created_at) >= monthStart)
      .forEach(s => {
        distributionMap[s.prize_name] = (distributionMap[s.prize_name] || 0) + 1;
      });

    const prizeDistribution = Object.entries(distributionMap)
      .map(([_id, count]) => ({ _id, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total_spins: totalSpins,
      total_winners: totalWinners,
      month_spins: monthSpins,
      month_winners: monthWinners,
      prize_distribution: prizeDistribution
    };
  },

  getSettings: async (): Promise<Settings> => {
    if (!cachedDB) await db.init();
    return cachedDB!.settings || DEFAULT_SETTINGS;
  },

  updateSettings: async (update: Partial<Settings>): Promise<Settings> => {
    if (!cachedDB) await db.init();
    cachedDB!.settings = {
      ...(cachedDB!.settings || DEFAULT_SETTINGS),
      ...update
    };
    writeDBLocal(cachedDB!);

    if (firestoreDb) {
      try {
        await firestoreDb.collection("settings").doc("app_settings").set(cachedDB!.settings, { merge: true });
        console.log(`[Firestore] Settings updated in Cloud Firestore: store_url=${cachedDB!.settings.store_url}`);
      } catch (err) {
        console.error("[Firestore] Error updating settings in Cloud Firestore:", err);
      }
    }

    return cachedDB!.settings;
  }
};

