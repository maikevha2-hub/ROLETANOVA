import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import axios from "axios";
import { createServer as createViteServer } from "vite";
import { db, Prize, Spin, User } from "./src/db";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-roleta-key-999";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

// Authentication middleware
async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token = req.cookies.get ? req.cookies.get("access_token") : req.cookies["access_token"];
  
  if (!token) {
    const authHeader = req.headers["authorization"] || "";
    if (authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    res.status(401).json({ detail: "Não autenticado" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.type !== "access") {
      res.status(401).json({ detail: "Token inválido" });
      return;
    }

    const user = await db.getUserById(decoded.sub);
    if (!user) {
      res.status(401).json({ detail: "Usuário não encontrado" });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    };
    next();
  } catch (error) {
    res.status(401).json({ detail: "Token inválido ou expirado" });
  }
}

// CardápioWeb integration
async function validateOrderCardapioweb(orderId: string): Promise<{ valid: boolean; order?: any; error?: string }> {
  const settings = await db.getSettings();
  const rawApiUrl = (settings.cardapioweb_api_url || process.env.CARDAPIOWEB_API_URL || "https://integracao.cardapioweb.com").trim();
  const apiKey = (settings.cardapioweb_api_key || process.env.CARDAPIOWEB_API_KEY || "dk5zzBpzUj7BASZpHoBgLVh85fXiFFiN2BQfmTeeYEf4K5omcH5yrGY3Pdey").trim();

  // If require_cardapioweb_validation is explicitly set to false in settings, allow demo spins
  if (settings.require_cardapioweb_validation === false) {
    return {
      valid: true,
      order: { customer: { name: `Cliente #${orderId}` }, total: 0 }
    };
  }

  if (!apiKey) {
    return { valid: false, error: "Chave da API CardápioWeb ausente. Configure a chave de API nas Configurações do Administrador." };
  }

  const cleanOrderId = orderId.replace(/^#/, "").trim();
  let baseUrl = rawApiUrl.endsWith("/") ? rawApiUrl.slice(0, -1) : rawApiUrl;
  
  // Construct clean endpoint URL
  let requestUrl = "";
  if (baseUrl.includes("/api/partner/v1")) {
    requestUrl = `${baseUrl}/orders/${encodeURIComponent(cleanOrderId)}`;
  } else {
    requestUrl = `${baseUrl}/api/partner/v1/orders/${encodeURIComponent(cleanOrderId)}`;
  }

  console.log(`[CardápioWeb] Validando pedido #${cleanOrderId} em: ${requestUrl}`);

  try {
    const response = await axios.get(requestUrl, {
      headers: {
        "X-API-KEY": apiKey,
        "Accept": "application/json",
        "User-Agent": "RoletaDePremios/1.0"
      },
      timeout: 10000
    });

    if (response.status === 200 && response.data) {
      console.log(`[CardápioWeb] Pedido #${cleanOrderId} validado com sucesso! Cliente: ${response.data.customer?.name || 'N/A'}`);
      return { valid: true, order: response.data };
    } else {
      return { valid: false, error: `Pedido não encontrado no CardápioWeb (Status HTTP ${response.status})` };
    }
  } catch (error: any) {
    console.error(`[CardápioWeb] Erro na validação do pedido #${cleanOrderId}:`, error.response?.status, error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      return { valid: false, error: `O pedido #${cleanOrderId} não foi encontrado no CardápioWeb. Por favor, verifique o número do seu pedido.` };
    }
    if (error.response?.status === 401 || error.response?.status === 403) {
      return { valid: false, error: "Chave de API do CardápioWeb inválida. Atualize a chave (X-API-KEY) no Painel de Admin." };
    }
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return { valid: false, error: "O servidor do CardápioWeb demorou a responder. Tente novamente em alguns segundos." };
    }
    
    const serverErrMsg = error.response?.data?.message || error.response?.data?.error || error.message;
    return { valid: false, error: `Não foi possível validar o pedido no CardápioWeb: ${serverErrMsg || 'Erro de conexão'}` };
  }
}

// Select prize logic
async function selectPrize(): Promise<Prize> {
  const prizes = await db.getPrizes().then(list => list.filter(p => p.is_active));
  
  const noPrize = prizes.find(p => p.slug === "no_prize");
  const fallbackPrize: Prize = noPrize || {
    id: "no_prize_fallback",
    name: "Tente Outra Vez",
    slug: "no_prize",
    probability: 0.70,
    monthly_limit: 0,
    is_active: true,
    slice_index: 0,
    color: "#6C757D"
  };

  if (prizes.length === 0) {
    return fallbackPrize;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  
  // Calculate 2 months ago for PIX check
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  twoMonthsAgo.setDate(1);
  const twoMonthsAgoStr = twoMonthsAgo.toISOString();

  const noPrizeProb = noPrize ? noPrize.probability : 0.70;

  // First roll: check if it lands on "Tente Outra Vez"
  const roll = Math.random();
  if (roll < noPrizeProb) {
    return fallbackPrize;
  }

  // Second roll: select from the remaining prizes
  const otherPrizes = prizes.filter(p => p.slug !== "no_prize");
  if (otherPrizes.length === 0) {
    return fallbackPrize;
  }

  const totalOtherProb = otherPrizes.reduce((sum, p) => sum + p.probability, 0);
  if (totalOtherProb <= 0) {
    return fallbackPrize;
  }

  const roll2 = Math.random() * totalOtherProb;
  let cumulative = 0;

  for (const prize of otherPrizes) {
    cumulative += prize.probability;
    if (roll2 < cumulative) {
      // Check monthly limit
      if (prize.monthly_limit > 0) {
        const monthWins = await db.countSpins({
          prize_id: prize.id,
          is_winner: true,
          since: monthStart
        });
        if (monthWins >= prize.monthly_limit) {
          return fallbackPrize;
        }
      }

      // Special check for PIX: slug "pix_200"
      if (prize.slug === "pix_200") {
        // Check bimonthly limit
        const bimonthlyWins = await db.countSpins({
          prize_id: prize.id,
          is_winner: true,
          since: twoMonthsAgoStr
        });
        if (bimonthlyWins >= 1) {
          return fallbackPrize;
        }

        // Check 400 spins limit
        const totalSpins = await db.countSpins({});
        const pixWins = await db.countSpins({ prize_id: prize.id, is_winner: true });
        if (pixWins > 0 && totalSpins < (pixWins * 400)) {
          return fallbackPrize;
        }
      }

      return prize;
    }
  }

  return fallbackPrize;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize and Seed DB
  await db.init();

  app.use(express.json());
  app.use(cookieParser());

  // API Routes
  const apiRouter = express.Router();

  apiRouter.get("/", (req, res) => {
    res.json({ message: "Roleta de Prêmios API" });
  });

  // Auth: Login
  apiRouter.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ detail: "Email e senha são obrigatórios" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user) {
        res.status(401).json({ detail: "Email ou senha incorretos" });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        res.status(401).json({ detail: "Email ou senha incorretos" });
        return;
      }

      const token = jwt.sign(
        { sub: user.id, email: user.email, type: "access" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      res.cookie("access_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 24 * 60 * 60 * 1000,
        path: "/"
      });

      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        token: token
      });
    } catch (error) {
      res.status(500).json({ detail: "Erro interno no servidor" });
    }
  });

  // Auth: Me
  apiRouter.get("/auth/me", authMiddleware, (req: AuthenticatedRequest, res) => {
    res.json(req.user);
  });

  // Auth: Logout
  apiRouter.post("/auth/logout", (req, res) => {
    res.clearCookie("access_token", { path: "/" });
    res.json({ message: "Logout realizado" });
  });

  // Spin
  apiRouter.post("/spin", async (req, res) => {
    const { order_id } = req.body;
    const orderId = String(order_id || "").trim();

    if (!orderId) {
      res.status(400).json({ detail: "Número do pedido é obrigatório" });
      return;
    }

    try {
      // Check if order already spun
      const existingSpin = await db.getSpinByOrderId(orderId);
      if (existingSpin) {
        res.status(400).json({ detail: "Este pedido já foi utilizado para girar a roleta" });
        return;
      }

      // Validate order
      const validation = await validateOrderCardapioweb(orderId);
      if (!validation.valid) {
        res.status(400).json({ detail: validation.error || "Pedido inválido" });
        return;
      }

      // Select prize
      const prize = await selectPrize();

      // Calculate rotation angle
      const sliceAngle = 36;
      const baseRotations = 5;
      const targetSlice = prize.slice_index;
      const rotationAngle = (baseRotations * 360) + (360 - (targetSlice * sliceAngle) - (sliceAngle / 2));

      // Build Spin document
      const isWinner = prize.slug !== "no_prize";
      const spinDoc: Spin = {
        id: Math.random().toString(36).substring(2, 15),
        order_id: orderId,
        prize_id: prize.id,
        prize_name: prize.name,
        is_winner: isWinner,
        rotation_angle: rotationAngle,
        created_at: new Date().toISOString()
      };

      if (validation.order) {
        const orderData = validation.order;
        const customer = orderData.customer || {};
        spinDoc.customer_name = customer.name || "Cliente";
        spinDoc.order_total = orderData.total || 0;
      }

      await db.insertSpin(spinDoc);

      const message = isWinner
        ? `Parabéns! Você ganhou: ${prize.name}`
        : "Não foi dessa vez! Tente novamente no próximo pedido.";

      res.json({
        success: true,
        prize_name: prize.name,
        prize_id: prize.id,
        is_winner: isWinner,
        message,
        rotation_angle: rotationAngle,
        slice_index: targetSlice
      });
    } catch (error) {
      console.error("Spin error:", error);
      res.status(500).json({ detail: "Erro interno no servidor ao girar a roleta" });
    }
  });

  // Prizes (Admin)
  apiRouter.get("/prizes", authMiddleware, async (req, res) => {
    const prizes = await db.getPrizes();
    res.json(prizes);
  });

  // Public Prizes
  apiRouter.get("/prizes/public", async (req, res) => {
    const publicPrizes = await db.getPublicPrizes();
    res.json(publicPrizes);
  });

  // Update Prize (Admin)
  apiRouter.put("/prizes/:prize_id", authMiddleware, async (req, res) => {
    const { prize_id } = req.params;
    const { name, probability, monthly_limit, is_active, color } = req.body;

    const updateData: Partial<Prize> = {};
    if (name !== undefined) updateData.name = String(name);
    if (probability !== undefined) {
      const parsedProb = typeof probability === "number" ? probability : parseFloat(probability);
      if (!isNaN(parsedProb)) updateData.probability = parsedProb;
    }
    if (monthly_limit !== undefined) {
      const parsedLimit = typeof monthly_limit === "number" ? monthly_limit : parseInt(monthly_limit, 10);
      if (!isNaN(parsedLimit)) updateData.monthly_limit = parsedLimit;
    }
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);
    if (color !== undefined) updateData.color = String(color);

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ detail: "Nenhum campo para atualizar" });
      return;
    }

    try {
      const success = await db.updatePrize(prize_id, updateData);
      if (!success) {
        res.status(404).json({ detail: "Prêmio não encontrado" });
        return;
      }
      res.json({ message: "Prêmio atualizado com sucesso" });
    } catch (error) {
      res.status(500).json({ detail: "Erro interno ao atualizar prêmio" });
    }
  });

  // Create Prize (Admin)
  apiRouter.post("/prizes", authMiddleware, async (req, res) => {
    const { name, probability, monthly_limit, is_active, color } = req.body;
    if (!name) {
      res.status(400).json({ detail: "Nome do prêmio é obrigatório" });
      return;
    }

    try {
      const currentPrizes = await db.getPrizes();
      const newId = String(Date.now());
      const newSliceIndex = currentPrizes.length;
      const parsedProb = typeof probability === "number" ? probability : parseFloat(probability) || 0;
      const parsedLimit = typeof monthly_limit === "number" ? monthly_limit : parseInt(monthly_limit, 10) || 0;

      const newPrize: Prize = {
        id: newId,
        name: String(name),
        slug: `prize_${newId}`,
        probability: parsedProb,
        monthly_limit: parsedLimit,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        slice_index: newSliceIndex,
        color: color || "#2A9D8F"
      };

      await db.addPrize(newPrize);
      res.status(201).json(newPrize);
    } catch (error) {
      res.status(500).json({ detail: "Erro ao criar novo prêmio" });
    }
  });

  // Delete Prize (Admin)
  apiRouter.delete("/prizes/:prize_id", authMiddleware, async (req, res) => {
    const { prize_id } = req.params;
    try {
      const success = await db.deletePrize(prize_id);
      if (!success) {
        res.status(404).json({ detail: "Prêmio não encontrado" });
        return;
      }
      res.json({ message: "Prêmio excluído com sucesso" });
    } catch (error) {
      res.status(500).json({ detail: "Erro ao excluir prêmio" });
    }
  });

  // Winners (Admin)
  apiRouter.get("/winners", authMiddleware, async (req, res) => {
    const winners = await db.getWinners();
    res.json(winners);
  });

  // Stats (Admin)
  apiRouter.get("/stats", authMiddleware, async (req, res) => {
    const stats = await db.getStats();
    res.json(stats);
  });

  // Settings (Public & Admin)
  apiRouter.get("/settings", async (req, res) => {
    const settings = await db.getSettings();
    res.json(settings);
  });

  apiRouter.put("/settings", authMiddleware, async (req, res) => {
    const { store_name, store_url, cardapioweb_api_url, cardapioweb_api_key, require_cardapioweb_validation, whatsapp_number } = req.body;
    try {
      const updated = await db.updateSettings({
        store_name,
        store_url,
        cardapioweb_api_url,
        cardapioweb_api_key,
        require_cardapioweb_validation,
        whatsapp_number
      });
      console.log(`[Settings] Configurações salvas: store_name="${updated.store_name}", store_url="${updated.store_url}", whatsapp="${updated.whatsapp_number}"`);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ detail: "Erro ao salvar configurações" });
    }
  });

  // Register API router
  app.use("/api", apiRouter);

  // Vite middleware or static files serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
