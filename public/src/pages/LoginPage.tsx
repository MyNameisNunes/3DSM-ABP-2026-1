import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import Button from "../components/UI/Button";
import Input from "../components/UI/Input";
import { getApiErrorMessage, useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTo = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/";

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email, senha);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-200 text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.08),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.06),_transparent_25%)]" />
      <div className="absolute left-[-10rem] top-12 h-72 w-72 rounded-full bg-slate-400/20 blur-3xl" />
      <div className="absolute right-[-10rem] bottom-24 h-72 w-72 rounded-full bg-slate-500/20 blur-3xl" />

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center p-6">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/40 md:grid-cols-[1.15fr_0.85fr]">
          <div className="hidden flex-col justify-between gap-8 border-r border-slate-200 bg-slate-950/95 p-10 text-white md:flex">
            <div className="space-y-6">
              <span className="inline-flex rounded-full bg-sky-500/15 px-3 py-1 text-xs uppercase tracking-[0.3em] text-sky-200">
                1000 Valle Multimarcas
              </span>
              <h1 className="max-w-md text-4xl font-semibold leading-tight">
                Acesse seu painel com segurança e velocidade.
              </h1>
              <p className="max-w-lg text-sm text-slate-300">
                Entre com seu e-mail e senha para acessar as ferramentas de gestão de leads e vendas.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="rounded-3xl border border-slate-700/70 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-200">Camada extra de proteção com autenticação e sessão segura.</p>
              </div>
              <div className="rounded-3xl border border-slate-700/70 bg-sky-500/10 p-4">
                <p className="text-sm text-slate-100">Design simples, experiência fluida e cores inspiradas no painel.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-8 sm:p-10">
            <div className="w-full max-w-md space-y-8">
              <div className="space-y-3">
                <span className="text-sm uppercase tracking-[0.3em] text-sky-500">Acesso Interno</span>
                <div>
                  <h2 className="text-3xl font-semibold text-slate-900">Entrar</h2>
                  <p className="mt-2 text-sm text-slate-600">Use suas credenciais para acessar o painel.</p>
                </div>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="voce@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
                <Input
                  label="Senha"
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  autoComplete="current-password"
                  required
                />

                {errorMessage ? (
                  <div className="rounded-2xl border border-[#b81414]/50 bg-[#b81414]/15 px-4 py-3 text-sm text-[#690b0b] shadow-sm shadow-[#b81414]/20">
                    {errorMessage}
                  </div>
                ) : null}

                <Button type="submit" isLoading={isSubmitting} className="w-full bg-[#b81414] text-white hover:bg-[#9f1313]">
                  Entrar no dashboard
                </Button>
              </form>

              <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                <Link to="/forgot-password" className="text-sky-600 hover:text-sky-700">
                  Esqueci minha senha
                </Link>
                <p>
                  Não tem conta?{' '}
                  <Link to="/register" className="font-semibold text-slate-900 hover:text-slate-700">
                    Cadastre-se
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

