import { linkWhatsAppEdu } from "@edu/core";
import { cn } from "@edu/ui";
import { MessageCircle } from "lucide-react";

/** "Dúvidas? Entre em contato no WhatsApp", com a mensagem já escrita. */
export function ContatoWhatsApp({ className }: { className?: string }) {
  return (
    <a
      href={linkWhatsAppEdu("Olá! Tenho uma dúvida sobre o Edu+ para criadores.")}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("inline-flex items-center gap-2 text-sm text-suave transition-colors hover:text-marca-600", className)}
    >
      <MessageCircle className="size-4" aria-hidden="true" />
      <span>
        Dúvidas? Entre em contato no <span className="font-semibold text-tinta-2">WhatsApp</span>
      </span>
    </a>
  );
}
