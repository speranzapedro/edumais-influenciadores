"use client";

import { Eye, EyeOff } from "lucide-react";
import { type ComponentProps, type FormEvent, type ReactNode, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Campo } from "./base";

/** Campo de senha com o olho para mostrar/ocultar o que foi digitado. */
export function CampoSenha(props: Omit<ComponentProps<"input">, "type"> & { rotulo: ReactNode; ajuda?: ReactNode }) {
  const [ver, setVer] = useState(false);
  return (
    <div className="relative">
      <Campo {...props} type={ver ? "text" : "password"} data-senha="" style={{ paddingRight: 48, ...props.style }} />
      <button
        type="button"
        onClick={() => setVer((v) => !v)}
        // Alinhado ao input (h-12), acima da ajuda quando houver.
        className={`absolute right-3 text-suave hover:text-tinta ${props.ajuda ? "top-[40px]" : "bottom-3"}`}
        aria-label={ver ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {ver ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

/**
 * `useActionState` sem o reset automático do React 19: com erro, o formulário mantém o que foi
 * digitado e só limpa as senhas (`CampoSenha`). Espalhe `form` no `<form>`.
 */
export function useFormulario<E extends { erro?: string } | null>(acao: (estado: E, form: FormData) => Promise<E>, inicial: E) {
  const [estado, despachar, pendente] = useActionState<E, FormData>(acao, inicial as Awaited<E>);
  const [, iniciar] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!estado?.erro || !ref.current) return;
    for (const el of ref.current.querySelectorAll<HTMLInputElement>("input[data-senha]")) el.value = "";
  }, [estado]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    iniciar(() => despachar(dados));
  };
  return { estado, pendente, form: { ref, onSubmit } };
}
