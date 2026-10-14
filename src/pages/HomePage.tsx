import { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Gift, Sparkles, ChevronRight, UtensilsCrossed, Globe, ExternalLink, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PrizeWheel, { triggerConfetti } from "@/components/PrizeWheel";

const API = "/api";

interface SpinResult {
  success: boolean;
  prize_name: string;
  prize_id: string;
  is_winner: boolean;
  message: string;
  rotation_angle: number;
  slice_index: number;
}

export default function HomePage() {
  const [orderId, setOrderId] = useState("");
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [result, setResult] = useState<SpinResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [spinKey, setSpinKey] = useState(0);
  const [storeSettings, setStoreSettings] = useState<{ store_name?: string; store_url?: string; whatsapp_number?: string }>({
    store_name: "Touros Burguer",
    store_url: "",
    whatsapp_number: ""
  });

  const handleSendWhatsApp = () => {
    const storeName = storeSettings.store_name || "Touros Burguer";
    const cleanOrder = orderId.replace(/^#/, "").trim();
    const prize = result?.prize_name || "Prêmio";
    const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

    const text = `🎉 *CONFIRMAÇÃO DE PRÊMIO - ${storeName}*\n\n` +
      `🧾 *Pedido:* #${cleanOrder}\n` +
      `🎁 *Prêmio Conquistado:* ${prize}\n` +
      `📅 *Data do Giro:* ${dateStr}\n\n` +
      `*Apresente esta mensagem para resgatar seu prêmio!*`;

    const cleanPhone = (storeSettings.whatsapp_number || "").replace(/\D/g, "");
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(url, "_blank");
  };

  useEffect(() => {
    axios.get(`${API}/settings`)
      .then(res => {
        if (res.data) {
          setStoreSettings(res.data);
        }
      })
      .catch(() => {});
  }, []);

  const handleSpin = async () => {
    if (!orderId.trim()) {
      toast.error("Digite o número do pedido");
      return;
    }

    setLoading(true);
    setResult(null);
    setShowResult(false);

    try {
      const response = await axios.post(`${API}/spin`, {
        order_id: orderId.trim(),
      });

      const data = response.data;
      setResult(data);
      setSpinKey(prev => prev + 1);
      setRotationAngle(data.rotation_angle);
      setIsSpinning(true);
    } catch (error: any) {
      const message =
        error.response?.data?.detail || "Erro ao girar a roleta";
      toast.error(message);
      setLoading(false);
    }
  };

  const handleSpinComplete = () => {
    setIsSpinning(false);
    setLoading(false);
    setShowResult(true);

    if (result?.is_winner) {
      triggerConfetti();
    }
  };

  const handleCloseResult = () => {
    setShowResult(false);
    setOrderId("");
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] food-pattern overflow-hidden">
      {/* Header */}
      <header className="py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="https://customer-assets.emergentagent.com/job_spin-rewards-40/artifacts/x2gha05h_ChatGPT%20Image%2021%20de%20mar.%20de%202026%2C%2021_09_14.png"
            alt="Touros Burger & Pizza"
            className="w-12 h-12 rounded-full object-cover"
          />
          <span className="font-bold text-xl text-[#264653]" style={{ fontFamily: "'Fredoka', sans-serif" }}>
            Roleta da Sorte {storeSettings.store_name || "Touros Burguer"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {storeSettings.store_url && (
            <a
              href={storeSettings.store_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E63946] text-white text-xs font-bold hover:bg-[#D62828] transition-colors shadow-sm"
              data-testid="store-menu-link"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Ver Cardápio</span>
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>
          )}
          <a
            href="/admin/login"
            className="text-sm text-[#6C757D] hover:text-[#264653] transition-colors"
            data-testid="admin-link"
          >
            Área Admin
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex flex-col items-center">
        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#264653] mb-3"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            Gire e Ganhe!
          </h1>
          <p className="text-lg text-[#6C757D] max-w-md mx-auto">
            Use o número do seu pedido e tente a sorte na nossa roleta de prêmios
          </p>
        </div>

        {/* Wheel */}
        <div className="relative mb-10">
          <PrizeWheel
            key={spinKey}
            isSpinning={isSpinning}
            rotationAngle={rotationAngle}
            onSpinComplete={handleSpinComplete}
          />
        </div>

        {/* Order Input */}
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur rounded-3xl p-6 shadow-xl border border-white/50">
            <div className="flex items-center gap-2 mb-4">
              <UtensilsCrossed className="w-5 h-5 text-[#E63946]" />
              <span className="font-semibold text-[#264653]">
                Digite seu número de pedido
              </span>
            </div>

            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Ex: 7637462"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="flex-1 h-12 text-lg border-[#E5E5E5] focus:ring-[#E63946] focus:border-[#E63946]"
                disabled={isSpinning || loading}
                data-testid="order-input"
              />
              <Button
                onClick={handleSpin}
                disabled={isSpinning || loading || !orderId.trim()}
                className="h-12 px-6 bg-[#E63946] hover:bg-[#D62828] text-white font-bold rounded-full transition-all duration-200"
                data-testid="spin-button"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⟳</span>
                    Girando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Girar
                  </span>
                )}
              </Button>
            </div>

            <p className="text-sm text-[#6C757D] mt-3 text-center">
              Cada pedido dá direito a um giro na roleta
            </p>
          </div>
        </div>

        {/* Prize List */}
        <div className="mt-12 w-full max-w-2xl">
          <h2
            className="text-2xl font-bold text-[#264653] text-center mb-6"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            Prêmios Disponíveis
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { name: "5% Desconto", color: "#9B59B6", icon: "🏷️" },
              { name: "Pix de R$20,00", color: "#E63946", icon: "💸" },
              { name: "Vale R$50", color: "#F4A261", icon: "💰" },
              { name: "Refrigerante Lata", color: "#2A9D8F", icon: "🥤" },
              { name: "Upgrade Batata P→G", color: "#E9C46A", icon: "📈" },
              { name: "Batata P Grátis", color: "#457B9D", icon: "🍟" },
              { name: "Hot Dog Grátis", color: "#E76F51", icon: "🌭" },
              { name: "Cheese Salada", color: "#8B4513", icon: "🍔" },
              { name: "PIX R$200,00", color: "#D4AF37", icon: "💸" },
            ].map((prize, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition-shadow flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${prize.color}20` }}
                >
                  {prize.icon}
                </div>
                <span className="font-medium text-[#264653] text-sm">{prize.name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Result Dialog */}
      <Dialog open={showResult} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl border-none">
          <DialogHeader>
            <DialogTitle
              className="text-center text-2xl"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              {result?.is_winner ? (
                <span className="text-[#2A9D8F]">Parabéns!</span>
              ) : (
                <span className="text-[#6C757D]">Não foi dessa vez...</span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-6">
            {result?.is_winner ? (
              <>
                <div className="w-24 h-24 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center mb-4 winner-bounce">
                  <Gift className="w-12 h-12 text-[#2A9D8F]" />
                </div>
                <h3
                  className="text-xl font-bold text-[#264653] mb-2"
                  data-testid="prize-result"
                >
                  {result?.prize_name}
                </h3>
                <p className="text-[#6C757D] text-center">
                  Apresente este resultado no caixa para retirar seu prêmio!
                </p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-[#6C757D]/10 flex items-center justify-center mb-4">
                  <span className="text-5xl">😢</span>
                </div>
                <p className="text-[#6C757D] text-center">
                  Tente novamente no seu próximo pedido!
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 w-full">
            {result?.is_winner && (
              <Button
                onClick={handleSendWhatsApp}
                className="w-full h-12 bg-[#25D366] hover:bg-[#1EBE5B] text-white font-bold rounded-full shadow-sm transition-all"
                data-testid="whatsapp-confirm-btn"
              >
                <span className="flex items-center gap-2 justify-center">
                  <MessageCircle className="w-5 h-5" />
                  Enviar Confirmação no WhatsApp
                </span>
              </Button>
            )}
            {storeSettings.store_url && (
              <a
                href={storeSettings.store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full h-12 bg-[#2A9D8F] hover:bg-[#218378] text-white font-bold rounded-full">
                  <span className="flex items-center gap-2 justify-center">
                    <Globe className="w-5 h-5" />
                    Ir para o Cardápio / Fazer Pedido
                  </span>
                </Button>
              </a>
            )}
            <Button
              onClick={handleCloseResult}
              className={`w-full h-12 ${storeSettings.store_url ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-[#E63946] hover:bg-[#D62828] text-white'} font-bold rounded-full`}
              data-testid="close-result-btn"
            >
              <span className="flex items-center gap-2 justify-center">
                Fechar
                <ChevronRight className="w-5 h-5" />
              </span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-[#6C757D]">
        <p>© 2026 Roleta da Sorte - Todos os direitos reservados</p>
      </footer>
    </div>
  );
}
