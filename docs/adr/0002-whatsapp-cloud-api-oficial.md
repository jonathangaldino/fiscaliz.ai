# WhatsApp pela Cloud API oficial da Meta

> **Substituído pelo [ADR 0009](./0009-telegram-no-lugar-do-whatsapp.md)**: a Meta baniu a conta em novembro de 2026, e o canal passou a ser o Telegram.

O canal com o cidadão usa a WhatsApp Cloud API oficial, e não bibliotecas não-oficiais (Baileys, Evolution API), apesar de estas serem mais rápidas de configurar. As não-oficiais violam os termos do WhatsApp, arriscam banimento do número durante a avaliação e esbarram na exclusão da trilha 07 do Hack Brasil ("burla de limites de plataformas").

## Consequences

Mensagem iniciada pelo bot fora da janela de 24 h exige modelo aprovado pela Meta. A verificação (V2) depende disso: o modelo é submetido cedo e, sem aprovação, a verificação consulta apenas cidadãos dentro da janela de 24 h.
