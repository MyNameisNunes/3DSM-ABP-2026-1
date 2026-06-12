// Fonte única de verdade das origens de lead.
// Usado pelo formulário, modal de edição, cards e relatórios — evita a
// duplicação que existia em LeadForm, LeadsPage, LeadCard e page.tsx.

import type { FC } from "react";
import {
  MercadoLivreIcon,
  WhatsAppIcon,
  InstagramIcon,
  FacebookIcon,
  LojaFisicaIcon,
  IndicacaoIcon,
  PhoneIcon,
  OtherIcon,
} from "../components/icons/originIcons";

export interface LeadOrigin {
  value: string;
  label: string;
  /** Cor da marca (texto/realce do badge). */
  color: string;
  /** Fundo suave do badge, derivado da cor da marca. */
  bg: string;
  Icon: FC<{ className?: string }>;
}

/** Origens selecionáveis, na ordem de exibição. */
export const LEAD_ORIGINS: LeadOrigin[] = [
  { value: "mercado_livre", label: "Mercado Livre", color: "#8a6d00", bg: "#FFF9DB", Icon: MercadoLivreIcon },
  { value: "whatsapp",      label: "WhatsApp",      color: "#128C4B", bg: "#E7F8EF", Icon: WhatsAppIcon },
  { value: "instagram",     label: "Instagram",     color: "#C13584", bg: "#FCEEF5", Icon: InstagramIcon },
  { value: "facebook",      label: "Facebook",      color: "#1877F2", bg: "#E9F2FE", Icon: FacebookIcon },
  { value: "loja_fisica",   label: "Loja Física",   color: "#b81414", bg: "#FDECEC", Icon: LojaFisicaIcon },
  { value: "indicacao",     label: "Indicação",     color: "#0F8A5F", bg: "#E7F8EF", Icon: IndicacaoIcon },
];

const ORIGIN_BY_VALUE: Record<string, LeadOrigin> = Object.fromEntries(
  LEAD_ORIGINS.map((o) => [o.value, o]),
);

// Origens antigas presentes em dados já cadastrados. Mantêm um badge legível
// (visita_loja é tratada como Loja Física).
const LEGACY_ORIGINS: Record<string, LeadOrigin> = {
  visita_loja: ORIGIN_BY_VALUE.loja_fisica,
  telefone:    { value: "telefone",   label: "Telefone",   color: "#475569", bg: "#f1f5f9", Icon: PhoneIcon },
  formulario:  { value: "formulario", label: "Formulário", color: "#475569", bg: "#f1f5f9", Icon: OtherIcon },
  outro:       { value: "outro",      label: "Outro",      color: "#475569", bg: "#f1f5f9", Icon: OtherIcon },
};

// Normaliza para o formato slug: minúsculas, sem acento, espaços → "_".
// Assim resolvemos tanto o slug salvo pelo formulário ("mercado_livre")
// quanto o rótulo vindo do CSV/back-end ("Mercado Livre", "Loja Física").
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .replace(/\s+/g, "_");
}

/** Resolve qualquer valor de origem (slug, rótulo ou legado) para um LeadOrigin. */
export function getOrigin(value: string): LeadOrigin {
  const key = normalize(value ?? "");
  return (
    ORIGIN_BY_VALUE[key] ??
    LEGACY_ORIGINS[key] ?? {
      value,
      label: value || "Outro",
      color: "#475569",
      bg: "#f1f5f9",
      Icon: OtherIcon,
    }
  );
}
