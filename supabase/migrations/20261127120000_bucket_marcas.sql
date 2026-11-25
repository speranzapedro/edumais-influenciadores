-- Marcas dos criadores (white-label, fase 4): logo de cada produto e foto do criador.
--
-- Bucket público (as imagens aparecem no app do fã e na página do criador), só PNG, JPEG e WEBP, até
-- 2 MB. SVG fica de fora (pode carregar script). O envio é feito pelo navegador com URL assinada que o
-- servidor gera em criadores/<criador>/<arquivo>; depois do envio o servidor confere os bytes iniciais
-- do arquivo e apaga o que não for imagem de verdade. Só acrescenta: o código no ar não é afetado.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('marcas', 'marcas', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
