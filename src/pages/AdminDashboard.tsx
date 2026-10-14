import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Gift,
  History,
  LogOut,
  TrendingUp,
  Trophy,
  Calendar,
  Loader2,
  Globe,
  Settings as SettingsIcon,
  Copy,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

const API = "/api";

interface PrizeDistributionItem {
  _id: string;
  count: number;
}

interface StatsData {
  total_spins: number;
  total_winners: number;
  month_spins: number;
  month_winners: number;
  prize_distribution: PrizeDistributionItem[];
}

interface PrizeItem {
  id: string;
  name: string;
  slug: string;
  color: string;
  probability: number;
  monthly_limit: number;
  is_active: boolean;
}

interface WinnerItem {
  id: string;
  order_id: string;
  customer_name?: string;
  prize_name: string;
  is_winner: boolean;
  created_at: string;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [prizes, setPrizes] = useState<PrizeItem[]>([]);
  const [winners, setWinners] = useState<WinnerItem[]>([]);
  const [settings, setSettings] = useState({
    store_name: "",
    store_url: "",
    cardapioweb_api_url: "https://integracao.cardapioweb.com",
    cardapioweb_api_key: "",
    require_cardapioweb_validation: true,
    whatsapp_number: ""
  });
  const [loading, setLoading] = useState(true);
  const [savingPrize, setSavingPrize] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [statsRes, prizesRes, winnersRes, settingsRes] = await Promise.all([
        axios.get(`${API}/stats`, { withCredentials: true, headers }),
        axios.get(`${API}/prizes`, { withCredentials: true, headers }),
        axios.get(`${API}/winners`, { withCredentials: true, headers }),
        axios.get(`${API}/settings`),
      ]);
      setStats(statsRes.data);
      setPrizes(prizesRes.data);
      setWinners(winnersRes.data);
      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }
    } catch (error) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const headers = getAuthHeaders();
      const res = await axios.put(`${API}/settings`, settings, { withCredentials: true, headers });
      setSettings(res.data);
      toast.success("Configurações do site salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar configurações do site");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCopyRoletaLink = () => {
    const roletaUrl = window.location.origin;
    navigator.clipboard.writeText(roletaUrl);
    setCopiedLink(true);
    toast.success("Link da roleta copiado!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const updatePrize = async (prizeId: string, field: string, value: any) => {
    setSavingPrize(prizeId);
    try {
      const headers = getAuthHeaders();
      await axios.put(
        `${API}/prizes/${prizeId}`,
        { [field]: value },
        { withCredentials: true, headers }
      );
      setPrizes((prev) =>
        prev.map((p) => (p.id === prizeId ? { ...p, [field]: value } : p))
      );
      toast.success("Prêmio atualizado");
    } catch (error) {
      toast.error("Erro ao atualizar prêmio");
    } finally {
      setSavingPrize(null);
    }
  };

  const handleAddPrize = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await axios.post(
        `${API}/prizes`,
        {
          name: "Novo Prêmio",
          probability: 0.05,
          monthly_limit: 0,
          is_active: true,
          color: "#2A9D8F"
        },
        { withCredentials: true, headers }
      );
      setPrizes(prev => [...prev, res.data]);
      toast.success("Novo prêmio adicionado com sucesso!");
    } catch (error) {
      toast.error("Erro ao adicionar prêmio");
    }
  };

  const handleDeletePrize = async (prizeId: string) => {
    if (!confirm("Tem certeza que deseja excluir este prêmio?")) return;
    try {
      const headers = getAuthHeaders();
      await axios.delete(`${API}/prizes/${prizeId}`, { withCredentials: true, headers });
      setPrizes(prev => prev.filter(p => p.id !== prizeId));
      toast.success("Prêmio excluído!");
    } catch (error) {
      toast.error("Erro ao excluir prêmio");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F0]">
        <Loader2 className="h-8 w-8 animate-spin text-[#E63946]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-lg z-50 hidden md:block">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <img 
              src="https://customer-assets.emergentagent.com/job_spin-rewards-40/artifacts/x2gha05h_ChatGPT%20Image%2021%20de%20mar.%20de%202026%2C%2021_09_14.png"
              alt="Touros Burger"
              className="w-10 h-10 rounded-full object-cover"
            />
            <span
              className="font-bold text-lg text-[#264653]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Touros Burguer
            </span>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === "dashboard"
                  ? "bg-[#E63946] text-white"
                  : "text-[#6C757D] hover:bg-[#FFF8F0]"
              }`}
              data-testid="nav-dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("prizes")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === "prizes"
                  ? "bg-[#E63946] text-white"
                  : "text-[#6C757D] hover:bg-[#FFF8F0]"
              }`}
              data-testid="nav-prizes"
            >
              <Gift className="w-5 h-5" />
              Prêmios
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === "history"
                  ? "bg-[#E63946] text-white"
                  : "text-[#6C757D] hover:bg-[#FFF8F0]"
              }`}
              data-testid="nav-history"
            >
              <History className="w-5 h-5" />
              Histórico
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                activeTab === "settings"
                  ? "bg-[#E63946] text-white"
                  : "text-[#6C757D] hover:bg-[#FFF8F0]"
              }`}
              data-testid="nav-settings"
            >
              <Globe className="w-5 h-5" />
              Endereço do Site
            </button>
          </nav>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="border-t border-[#E5E5E5] pt-4">
            <p className="text-sm text-[#6C757D] mb-2">{user ? user.email : ""}</p>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white shadow-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src="https://customer-assets.emergentagent.com/job_spin-rewards-40/artifacts/x2gha05h_ChatGPT%20Image%2021%20de%20mar.%20de%202026%2C%2021_09_14.png"
            alt="Touros Burger"
            className="w-8 h-8 rounded-full object-cover"
          />
          <span className="font-bold text-[#264653]">Touros Burguer</span>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-5 h-5" />
        </Button>
      </header>

      {/* Mobile Tabs */}
      <div className="md:hidden p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="dashboard" className="flex-1">
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="prizes" className="flex-1">
              Prêmios
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1">
              Histórico
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">
              Site / Config
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <main className="md:ml-64 p-6">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-6" data-testid="dashboard-content">
            <h1
              className="text-3xl font-bold text-[#264653]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Dashboard
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#6C757D]">Total de Giros</p>
                      <p className="text-3xl font-bold text-[#264653]">
                        {stats?.total_spins || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#E63946]/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-[#E63946]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#6C757D]">Total de Prêmios</p>
                      <p className="text-3xl font-bold text-[#264653]">
                        {stats?.total_winners || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#2A9D8F]/10 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-[#2A9D8F]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#6C757D]">Giros este Mês</p>
                      <p className="text-3xl font-bold text-[#264653]">
                        {stats?.month_spins || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#F4A261]/10 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-[#F4A261]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#6C757D]">Prêmios este Mês</p>
                      <p className="text-3xl font-bold text-[#264653]">
                        {stats?.month_winners || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#457B9D]/10 flex items-center justify-center">
                      <Gift className="w-6 h-6 text-[#457B9D]" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Prize Distribution */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-[#264653]">
                  Distribuição de Prêmios (Este Mês)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.prize_distribution?.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <span className="text-[#264653]">{item._id}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                  {(!stats?.prize_distribution ||
                    stats.prize_distribution.length === 0) && (
                    <p className="text-[#6C757D] text-center py-4">
                      Nenhum giro registrado este mês
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Prizes Tab */}
        {activeTab === "prizes" && (
          <div className="space-y-6" data-testid="prizes-content">
            <div className="flex justify-between items-center">
              <h1
                className="text-3xl font-bold text-[#264653]"
                style={{ fontFamily: "'Fredoka', sans-serif" }}
              >
                Gerenciar Prêmios
              </h1>
              <Button
                onClick={handleAddPrize}
                className="bg-[#2A9D8F] hover:bg-[#218378] text-white font-bold flex items-center gap-2 rounded-xl shadow"
              >
                <Plus className="w-4 h-4" />
                Adicionar Novo Prêmio
              </Button>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cor</TableHead>
                      <TableHead>Nome do Prêmio</TableHead>
                      <TableHead>Probabilidade (%)</TableHead>
                      <TableHead>Limite Mensal</TableHead>
                      <TableHead>Ativo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prizes.map((prize) => (
                      <TableRow key={prize.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={prize.color || "#2A9D8F"}
                              onChange={(e) => updatePrize(prize.id, "color", e.target.value)}
                              className="w-7 h-7 rounded border border-gray-300 cursor-pointer p-0 bg-transparent"
                              title="Alterar cor na roleta"
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={prize.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPrizes(prev => prev.map(p => p.id === prize.id ? { ...p, name: val } : p));
                            }}
                            onBlur={(e) => updatePrize(prize.id, "name", e.target.value)}
                            className="font-medium max-w-xs"
                            disabled={savingPrize === prize.id}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={isNaN(prize.probability) ? "" : Math.round(prize.probability * 100)}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              const newProb = isNaN(val) ? 0 : val / 100;
                              updatePrize(prize.id, "probability", newProb);
                            }}
                            className="w-20"
                            disabled={savingPrize === prize.id}
                            data-testid={`prize-prob-${prize.slug}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={prize.monthly_limit}
                            onChange={(e) =>
                              updatePrize(
                                prize.id,
                                "monthly_limit",
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-20"
                            disabled={savingPrize === prize.id}
                            data-testid={`prize-limit-${prize.slug}`}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={prize.is_active}
                            onCheckedChange={(checked) =>
                              updatePrize(prize.id, "is_active", checked)
                            }
                            disabled={savingPrize === prize.id}
                            data-testid={`prize-active-${prize.slug}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePrize(prize.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            title="Excluir Prêmio"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="bg-[#F4A261]/10 rounded-xl p-4">
              <p className="text-sm text-[#264653]">
                <strong>Dica:</strong> A soma das probabilidades dos prêmios
                ativos deve ser igual a 100%. Prêmios com limite mensal de 0 não
                têm limite. A cor escolhida será exibida na fatia da roleta do cliente.
              </p>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="space-y-6" data-testid="history-content">
            <h1
              className="text-3xl font-bold text-[#264653]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Histórico de Giros
            </h1>

            <Card className="border-none shadow-md overflow-hidden">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pedido</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Prêmio</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {winners.map((spin) => (
                      <TableRow key={spin.id}>
                        <TableCell className="font-mono">
                          #{spin.order_id}
                        </TableCell>
                        <TableCell>
                          {spin.customer_name || "Cliente"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={spin.is_winner ? "default" : "secondary"}
                            className={
                              spin.is_winner
                                ? "bg-[#2A9D8F]"
                                : "bg-[#6C757D]"
                            }
                          >
                            {spin.prize_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#6C757D]">
                          {formatDate(spin.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              const storeName = settings.store_name || "Touros Burguer";
                              const cleanOrder = String(spin.order_id || "").replace(/^#/, "").trim();
                              const dateFormatted = formatDate(spin.created_at);
                              const customer = spin.customer_name || "Cliente";

                              const text = `🎉 *CONFIRMAÇÃO DE PRÊMIO - ${storeName}*\n\n` +
                                `👤 *Cliente:* ${customer}\n` +
                                `🧾 *Pedido:* #${cleanOrder}\n` +
                                `🎁 *Prêmio:* ${spin.prize_name}\n` +
                                `📅 *Data:* ${dateFormatted}\n\n` +
                                `*Apresente esta confirmação para resgatar seu prêmio!*`;

                              const cleanPhone = (settings.whatsapp_number || "").replace(/\D/g, "");
                              const url = cleanPhone
                                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
                                : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

                              window.open(url, "_blank");
                            }}
                            className="bg-[#25D366] hover:bg-[#1EBE5B] text-white flex items-center gap-1.5 text-xs font-semibold rounded-lg ml-auto"
                            title="Enviar confirmação via WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            Enviar WhatsApp
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {winners.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-8 text-[#6C757D]"
                        >
                          Nenhum giro registrado ainda
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6" data-testid="settings-content">
            <h1
              className="text-3xl font-bold text-[#264653]"
              style={{ fontFamily: "'Fredoka', sans-serif" }}
            >
              Endereço do Site e Integrações
            </h1>

            {/* Card 1: Links e Endereço do Site/Cardápio */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-[#264653] flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#E63946]" />
                  Endereço do seu Cardápio / Site do Restaurante
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#264653] mb-1">
                    Nome do Estabelecimento / Restaurante
                  </label>
                  <Input
                    value={settings.store_name}
                    onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                    placeholder="Ex: Touros Burguer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#264653] mb-1">
                    URL / Endereço do seu Cardápio ou Site da Loja
                  </label>
                  <Input
                    value={settings.store_url}
                    onChange={(e) => setSettings({ ...settings, store_url: e.target.value })}
                    placeholder="Ex: https://tourosburguer.cardapioweb.com ou https://meusite.com.br"
                  />
                  <p className="text-xs text-[#6C757D] mt-1">
                    Quando preenchido, a roleta exibe o botão <strong>"Voltar para o Cardápio / Fazer Pedido"</strong> para seus clientes!
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#264653] mb-1 flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-[#25D366]" />
                    WhatsApp da Loja para Receber Confirmação de Prêmios
                  </label>
                  <Input
                    value={settings.whatsapp_number}
                    onChange={(e) => setSettings({ ...settings, whatsapp_number: e.target.value })}
                    placeholder="Ex: 5511999998888 (com DDD)"
                  />
                  <p className="text-xs text-[#6C757D] mt-1">
                    Digite com DDD (ex: 5511999998888). Se preenchido, ao clicar em "Enviar Confirmação via WhatsApp", a mensagem é direcionada para este número da loja!
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-sm font-medium text-[#264653] mb-1">
                    Link Direto desta Roleta de Prêmios (para divulgar aos clientes)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={window.location.origin}
                      className="bg-gray-50 text-gray-600 font-mono text-sm"
                    />
                    <Button onClick={handleCopyRoletaLink} variant="outline" className="flex gap-1 items-center">
                      {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      {copiedLink ? "Copiado!" : "Copiar"}
                    </Button>
                    <a href="/" target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" title="Abrir Roleta">
                        <ExternalLink className="w-4 h-4 text-[#264653]" />
                      </Button>
                    </a>
                  </div>
                  <p className="text-xs text-[#6C757D] mt-1">
                    Copie este endereço e coloque no banner do seu CardápioWeb, na sua Bio do Instagram ou envie por WhatsApp!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: API CardápioWeb */}
            <Card className="border-none shadow-md">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-[#264653] flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-[#2A9D8F]" />
                  Integração da API CardápioWeb
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#264653] mb-1">
                    URL da API do CardápioWeb
                  </label>
                  <Input
                    value={settings.cardapioweb_api_url}
                    onChange={(e) => setSettings({ ...settings, cardapioweb_api_url: e.target.value })}
                    placeholder="https://integracao.cardapioweb.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#264653] mb-1">
                    Chave de API do CardápioWeb (X-API-KEY)
                  </label>
                  <Input
                    type="password"
                    value={settings.cardapioweb_api_key}
                    onChange={(e) => setSettings({ ...settings, cardapioweb_api_key: e.target.value })}
                    placeholder="Cole aqui a chave da sua API no CardápioWeb"
                  />
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <label htmlFor="require-validation" className="text-sm font-semibold text-[#264653] block">
                      Validação Obrigatória de Pedidos
                    </label>
                    <p className="text-xs text-[#6C757D]">
                      Quando ativado, a roleta só permite girar se o número do pedido realmente existir no CardápioWeb e não tiver sido utilizado.
                    </p>
                  </div>
                  <Switch
                    id="require-validation"
                    checked={settings.require_cardapioweb_validation ?? true}
                    onCheckedChange={(checked) => setSettings({ ...settings, require_cardapioweb_validation: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="bg-[#2A9D8F] hover:bg-[#218378] text-white font-bold px-8 py-3 rounded-xl shadow-md"
              >
                {savingSettings ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Configurações"
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
