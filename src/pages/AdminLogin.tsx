import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Lock, Mail, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatApiErrorDetail(detail: any): string {
  if (detail == null) return "Algo deu errado. Tente novamente.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Login realizado com sucesso!");
      navigate("/admin");
    } catch (error: any) {
      const message = formatApiErrorDetail(error.response?.data?.detail);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `linear-gradient(rgba(255, 248, 240, 0.9), rgba(255, 248, 240, 0.9)), url('https://images.unsplash.com/photo-1703575571607-97a53ab2ed56?crop=entropy&cs=srgb&fm=jpg&q=85')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl bg-white/95 backdrop-blur">
        <CardHeader className="text-center pb-2 flex flex-col items-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_spin-rewards-40/artifacts/x2gha05h_ChatGPT%20Image%2021%20de%20mar.%20de%202026%2C%2021_09_14.png"
            alt="Touros Burger & Pizza"
            className="w-20 h-20 rounded-full object-cover mb-4"
          />
          <CardTitle
            className="text-2xl text-[#264653]"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            Touros Burguer - Admin
          </CardTitle>
          <p className="text-[#6C757D] text-sm mt-1">
            Faça login para gerenciar a roleta
          </p>
        </CardHeader>

        <CardContent className="pt-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#264653]">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tourosburguer.chp@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 border-[#E5E5E5] focus:ring-[#E63946] focus:border-[#E63946]"
                  required
                  data-testid="admin-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#264653]">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6C757D]" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12 border-[#E5E5E5] focus:ring-[#E63946] focus:border-[#E63946]"
                  required
                  data-testid="admin-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#E63946] hover:bg-[#D62828] text-white font-bold rounded-full mt-6"
              data-testid="admin-login-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="animate-spin">⟳</span>
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2 justify-center">
                  <LogIn className="w-5 h-5" />
                  Entrar
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-sm text-[#6C757D] hover:text-[#E63946] transition-colors"
            >
              ← Voltar para a roleta
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
