"""pt-BR shot list: same recordings and time maps as ../shots.py, Portuguese
texts. Shots stretch (a held last frame) when the Portuguese line is longer."""
import json, subprocess
base = json.load(open("../shots.json"))
TXT = [
 {},
 {"kicker": "01 · Cidadão", "title": "Relate do\nseu jeito", "sub": "Bot no Telegram. Sem app, sem cadastro, sem formulário.\nAqui no simulador do site, que roda o mesmo bot.",
  "chips": [[1.2, "Texto, áudio, foto ou localização", "info"], [9.5, "Erro de propósito: \"curitba\"", "warn"]]},
 {"kicker": "02 · Extração com IA", "title": "Pergunta só\no que falta", "sub": "O Claude Haiku preenche os campos;\no cadastro do Censo acha a rua.",
  "chips": [[2.6, "Rua corrigida: Av. Curitiba, 1200 · Centro", "ok"], [4.6, "\"faz uma semana\" → 18/11, 16:15", "ok"], [6.6, "Categoria: iluminação pública", "ok"], [8.6, "Busca da rua: 2–9 ms", "stat"]]},
 {"kicker": "03 · Roteamento", "title": "Registrado\ne encaminhado", "sub": "Um toque. A categoria define o órgão.",
  "chips": [[1.6, "Encaminhado ao Idepplan (iluminação)", "ok"], [2.6, "No mapa público na hora", "info"]]},
 {"kicker": "04 · Privacidade", "title": "Fotos anonimizadas\nantes de publicar", "sub": "Rostos e placas borrados por YOLO no Modal.\nA original é apagada.",
  "chips": [[1.4, "Foto anexada", "info"], [3.6, "Local: toque no mapa", "info"], [10.3, "⏩ 13 s de anonimização, acelerados", "warn"]]},
 {"kicker": "04 · Privacidade", "title": "Só a cópia borrada\nvai para o público", "sub": "A página pública da ocorrência.",
  "rings": [[1.2, 307, 120, 26, "rosto"], [1.8, 190, 186, 30, "placa"]],
  "chips": [[2.4, "Foto original apagada", "ok"]]},
 {"kicker": "05 · Apelo em vez de duplicata", "title": "Mesmo buraco, outro cidadão: apelo 1 → 2",
  "inset": {"css": [12, 248, 392, 320], "scale": 1.55, "cx": 1440, "cy": 760, "at": 2.0, "label": "Mapa no computador, atualizando sozinho"}},
 {"kicker": "06 · Segurança", "title": "Emergências e\nconcessionárias ficam fora", "sub": "Uma máquina de estados decide o fluxo;\na IA só preenche dados.",
  "chips": [[4.6, "Emergência → 193, nada guardado", "warn"], [12.6, "Vazamento → Sanepar (concessionária)", "warn"], [15.0, "Avaliação: 53 de 54 mensagens certas", "stat"], [16.4, "0 emergência perdida", "stat"]]},
 {"kicker": "07 · Mapa público", "title": "Mapa em tempo real, filtros e busca",
  "chips": [[2.2, "Filtro: buracos", "info"], [7.3, "Busca: \"curitiba\"", "info"]]},
 {"kicker": "07 · Responsivo", "title": "A mesma interface\nno celular", "sub": "Mapa, lista e filtros se ajustam à tela.",
  "chips": [[1.2, "Computador · tablet · celular", "info"]]},
 {"kicker": "08 · Prefeitura", "title": "Uma fila por órgão, ordenada por apelo",
  "chips": [[9.2, "Automação em números", "info"], [14.4, "Dados abertos: GeoJSON · CSV", "info"]]},
 {"kicker": "09 · Fechando o ciclo", "title": "O cidadão confirma o conserto"},
 {},
]
def dur(f): return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]))
S = [{**shot, **txt} for shot, txt in zip(base, TXT)]
for s in S:
    if s["kind"] in ("intro", "outro"): s["movie"] = "../" + s["movie"]
SPAN = {8: [8, 9]}  # n08 spans the desktop map and the phone shot
for i, s in enumerate(S):
    if not s.get("vo"): continue
    shots = SPAN.get(i, [i])
    avail = sum(S[j]["dur"] for j in shots) - 0.4 * (len(shots) - 1)
    extra = round(max(0, s.get("vo_at", 0.4) + dur(f"vo/{s['vo']}.mp3") + 0.5 - avail), 2)
    if extra:
        last = S[shots[-1]]; last["dur"] = round(last["dur"] + extra, 2)
        if "segs" in last: e = last["segs"][-1][1]; last["segs"] = last["segs"] + [[e, e, extra]]
S[9]["cap_vo"] = "n08"; S[9]["cap_at"] = round(S[8]["vo_at"] - (S[8]["dur"] - 0.4), 3)
json.dump(S, open("shots.json", "w"), indent=1, ensure_ascii=False)
print(len(S), round(sum(s["dur"] for s in S) - 0.4 * (len(S) - 1), 1))
