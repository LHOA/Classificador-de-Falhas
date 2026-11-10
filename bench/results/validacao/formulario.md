# Validação humana cega — 30 notas

Para cada nota, escolha UMA letra por eixo (a que você julga correta).
Responda no formato `1: A/B/C` (nota: modo/mecanismo/detecção).

### NOTA 1 · ex00214 · tag válvula_de_controle_72 · impacto U
> Válvula de controle após parada programada apresentou vibração excessiva com aumento progressivo. A análise preliminar indica fadiga mecânica por ciclos elevados, resultando em necessidade de intervenção imediata.

  Modo de falha      A) FTF Falha funcionar   B) AIR Leitura anormal   C) LOP Perda potência   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 4.1 Curto-circuito   B) 5.1 Entupimento   C) 4.4 Tensão defeituosa   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 5 Monitor. contínuo   B) 2 Teste funcional   C) 6 Interf. produção   D) — Nenhuma destas (anote o código se souber)

### NOTA 2 · ex00383 · tag forno_industrial_85 · impacto D
> Forno industrial durante operação contínua entregou leituras inconsistentes nos instrumentos. A análise preliminar indica trinca evolutiva não detectada anteriormente, resultando em aumento do consumo de energia.

  Modo de falha      A) PLU Entupido   B) ELP Vaz.ext.processo   C) PDE Desvio parâmetro   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 5.4 Incrustação.   B) 1.6 Travamento   C) 1.1 Vazamento   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 4 Monitor. periódico   B) 2 Teste funcional   C) 7 Observ. casual   D) — Nenhuma destas (anote o código se souber)

### NOTA 3 · ex00443 · tag secador_rotativo_35 · impacto S
> Secador rotativo no momento de partida apresentou perda significativa de desempenho. A análise preliminar indica danos térmicos devido à sobrecarga, resultando em redução de eficiência operacional.

  Modo de falha      A) ERO Saída errática   B) NOI Ruído   C) LOP Perda potência   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 1.5 Afrouxamento   B) 4.3 Sem energia   C) 4.4 Tensão defeituosa   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 6 Interf. produção   B) 7 Observ. casual   C) 2 Teste funcional   D) — Nenhuma destas (anote o código se souber)

### NOTA 4 · ex01008 · tag tanque_de_armazenamento_27 · impacto U
> Tanque de armazenamento durante teste funcional parou repentinamente sem alarme prévio. A análise preliminar indica obstrução parcial interna, resultando em interrupção inesperada na produção.

  Modo de falha      A) PLU Entupido   B) FTS Falha partir   C) EXP Sobrepressão   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 3.4 Desajustado   B) 1.2 Vibração   C) 3.5 Falha software   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 8 Manut. corretiva   B) 9 Sob demanda   C) 7 Observ. casual   D) — Nenhuma destas (anote o código se souber)

### NOTA 5 · ex01636 · tag alarme_temperatura_mancal_09 · impacto U
> Alarme de temperatura alta ativado sem aquecimento real. A análise indica erro de configuração no setpoint, resultando em alarme espúrio.

  Modo de falha      A) NOI Ruído   B) OHE Superaquecimento   C) SHH Alarme alto espúrio   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 3.4 Desajustado   B) 6.2 Causas combinadas   C) 3.1 Falha controle   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 10 Outro   B) 5 Monitor. contínuo   C) 8 Manut. corretiva   D) — Nenhuma destas (anote o código se souber)

### NOTA 6 · ex01993 · tag quebra_peca_nova · impacto D
> Eixo novo quebrou prematuramente. A análise metalográfica inconclusiva sobre fadiga ou defeito de material.

  Modo de falha      A) EXP Sobrepressão   B) UNK Desconhecido   C) STD Def. estrutural   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 6.5 Desvio projeto   B) 2.16 Junta EX.   C) 6.4 Desconhecido   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 8 Manut. corretiva   B) 2 Teste funcional   C) 6 Interf. produção   D) — Nenhuma destas (anote o código se souber)

### NOTA 7 · ex01999 · tag termostato_descalibrado · impacto S
> Termostato atuando antes da temperatura. A análise indica perda de calibração, resultando em alarme de alta temperatura prematuro.

  Modo de falha      A) EXP Sobrepressão   B) SHH Alarme alto espúrio   C) FTI Falha função   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 3.0 Geral   B) 3.4 Desajustado   C) 2.10 Trinca   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 2 Teste funcional   B) 9 Sob demanda   C) 6 Interf. produção   D) — Nenhuma destas (anote o código se souber)

### NOTA 8 · ex02172 · tag piso_fabrica_buraco_02 · impacto U
> Buraco no piso industrial. A análise indica tráfego pesado e concreto de baixa resistência.

  Modo de falha      A) FTF Falha funcionar   B) STD Def. estrutural   C) EFA Falha eletrônica   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 2.15 Concreto   B) 2.1 Cavitação   C) 5.2 Contaminação   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 1 Manut. periódica   B) 3 Inspeção   C) 2 Teste funcional   D) — Nenhuma destas (anote o código se souber)

### NOTA 9 · ex02457 · tag mangueira_queimador_ressecada · impacto S
> Mangueira de óleo combustível vazando. Borracha ressecada e trincada pelo calor.

  Modo de falha      A) ELF Vazamento.   B) LOP Perda potência   C) PDE Desvio parâmetro   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 2.1 Cavitação   B) 2.17 Degradação natural   C) 4.4 Tensão defeituosa   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 7 Observ. casual   B) 3 Inspeção   C) 8 Manut. corretiva   D) — Nenhuma destas (anote o código se souber)

### NOTA 10 · ex02767 · tag vaso_pressao_corrosao · impacto D
> Ruptura do vaso. Perda de espessura por corrosão interna.

  Modo de falha      A) FTI Falha função   B) EXP Sobrepressão   C) PLU Entupido   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 1.3 Desalinhamento   B) 2.2 Corrosão interna   C) 2.5 Quebra/ruptura   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 10 Outro   B) 6 Interf. produção   C) 2 Teste funcional   D) — Nenhuma destas (anote o código se souber)

### NOTA 11 · ex02924 · tag modulo_saida_transistor · impacto S
> Saída em curto. Transistor de saída queimado.

  Modo de falha      A) 021 Erro módulo I/O   B) FTO Falha abrir   C) NOI Ruído   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 4.6 Conexão elétrica   B) 4.1 Curto-circuito   C) 2.16 Junta EX.   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 9 Sob demanda   B) 1 Manut. periódica   C) 5 Monitor. contínuo   D) — Nenhuma destas (anote o código se souber)

### NOTA 12 · ex02961 · tag cartao_eixo_erro · impacto D
> Servo parado. Erro de hardware no cartão.

  Modo de falha      A) NOO Sem saída   B) EFA Falha eletrônica   C) CSF Falha controle   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 1.5 Afrouxamento   B) 3.3 Sinal defeituoso   C) 3.5 Falha software   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 5 Monitor. contínuo   B) 10 Outro   C) 4 Monitor. periódico   D) — Nenhuma destas (anote o código se souber)

### NOTA 13 · ex02983 · tag placa_eletronica_solda_fria · impacto D
> Falha intermitente. Solda fria no componente.

  Modo de falha      A) FTS Falha partir   B) FTI Falha função   C) EFA Falha eletrônica   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 3.6 Falha de causa.   B) 6.2 Causas combinadas   C) 6.5 Desvio projeto   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 3 Inspeção   B) 5 Monitor. contínuo   C) 8 Manut. corretiva   D) — Nenhuma destas (anote o código se souber)

### NOTA 14 · ex03154 · tag sensor_nivel_espuma · impacto S
> Sensor de nível ultrassônico indicando nível baixo falso. Camada densa de espuma absorveu o sinal do sensor.

  Modo de falha      A) SER Probl. menores   B) PLU Entupido   C) AOL Saída anormal baixa   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 5.3 Influência externa   B) 5.5 Erosão marinha   C) 2.8 Estouro   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 3 Inspeção   B) 5 Monitor. contínuo   C) 8 Manut. corretiva   D) — Nenhuma destas (anote o código se souber)

### NOTA 15 · ex03271 · tag trava_emperrada · impacto D
> Trava elétrica não abre. Mecanismo emperrado por sujeira e falta de lubrificação.

  Modo de falha      A) EFA Falha eletrônica   B) FTL Falha travar   C) BRD Quebra/colapso   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 5.1 Entupimento   B) 2.17 Degradação natural   C) 5.6 Vão livre   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 2 Teste funcional   B) 9 Sob demanda   C) 3 Inspeção   D) — Nenhuma destas (anote o código se souber)

### NOTA 16 · ex03456 · tag mancal_rolamento_falta_graxa · impacto S
> Mancal quente. Graxeira quebrada impediu lubrificação.

  Modo de falha      A) ERO Saída errática   B) FTI Falha função   C) OHE Superaquecimento   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 1.6 Travamento   B) 1.11 Anular.   C) 3.5 Falha software   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 10 Outro   B) 5 Monitor. contínuo   C) 4 Monitor. periódico   D) — Nenhuma destas (anote o código se souber)

### NOTA 17 · ex03746 · tag valvula_diafragma_travada_vacuo · impacto S
> Válvula de diafragma não abre. O diafragma "colou" na sede devido ao vácuo na linha quando parada.

  Modo de falha      A) AIR Leitura anormal   B) BRD Quebra/colapso   C) FTO Falha abrir   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 5.8 Config. incorreta   B) 5.9 Fora pressão/temp   C) 6.5 Desvio projeto   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 1 Manut. periódica   B) 2 Teste funcional   C) 9 Sob demanda   D) — Nenhuma destas (anote o código se souber)

### NOTA 18 · ex03871 · tag flotacao_ar_bloqueado · impacto S
> Entrada de ar da célula bloqueada. Incrustação de reagentes no eixo oco.

  Modo de falha      A) LOO Saída baixa   B) FTI Falha função   C) BRD Quebra/colapso   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 5.2 Contaminação   B) 5.1 Entupimento   C) 2.3 Erosão   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 8 Manut. corretiva   B) 5 Monitor. contínuo   C) 6 Interf. produção   D) — Nenhuma destas (anote o código se souber)

### NOTA 19 · ex03995 · tag secador_rotativo_vibracao · impacto S
> Secador vibrando. Rolos de apoio desalinhados ou ovais.

  Modo de falha      A) NOO Sem saída   B) VIB Vibração   C) FTO Falha abrir   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 2.9 Corrosão externa   B) 1.6 Travamento   C) 2.4 Desgaste   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 2 Teste funcional   B) 5 Monitor. contínuo   C) 1 Manut. periódica   D) — Nenhuma destas (anote o código se souber)

### NOTA 20 · ex04314 · tag painel_contator_corretiva_03 · impacto U
> Ao trocar o contator queimado, viu-se que o trilho DIN estava solto. Falha de fixação encontrada na corretiva elétrica.

  Modo de falha      A) STD Def. estrutural   B) FTS Falha partir   C) EFA Falha eletrônica   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 1.3 Desalinhamento   B) 1.5 Afrouxamento   C) 5.1 Entupimento   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 6 Interf. produção   B) 8 Manut. corretiva   C) 10 Outro   D) — Nenhuma destas (anote o código se souber)

### NOTA 21 · ex05147 · tag BOTOEIRA-EX-EIXO · impacto S
> Eixo da botoeira Ex travado. Óxidos de corrosão no mecanismo de acionamento impedem o movimento.

  Modo de falha      A) FTF Falha funcionar   B) ERO Saída errática   C) FTO Falha abrir   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 1.12 Colapso carcaça   B) 2.16 Junta EX.   C) 2.11 Dano flange   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 6 Interf. produção   B) 9 Sob demanda   C) 8 Manut. corretiva   D) — Nenhuma destas (anote o código se souber)

### NOTA 22 · ex05165 · tag CONECTOR-SOLTO-VIBRA · impacto S
> Perda intermitente de sinal. Conector do cabo de rede soltou devido à vibração da máquina.

  Modo de falha      A) INL Vaz.interno   B) NOO Sem saída   C) PDE Desvio parâmetro   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 3.2 Sem sinal   B) 2.15 Concreto   C) 3.0 Geral   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 4 Monitor. periódico   B) 3 Inspeção   C) 5 Monitor. contínuo   D) — Nenhuma destas (anote o código se souber)

### NOTA 23 · ex05173 · tag MEDIDOR-VAZAO-RUIDO · impacto S
> Sinal de vazão com ruído elétrico. Falta de aterramento adequado na blindagem do cabo.

  Modo de falha      A) ELP Vaz.ext.processo   B) NOI Ruído   C) ERO Saída errática   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 3.2 Sem sinal   B) 2.9 Corrosão externa   C) 3.3 Sinal defeituoso   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 3 Inspeção   B) 7 Observ. casual   C) 5 Monitor. contínuo   D) — Nenhuma destas (anote o código se souber)

### NOTA 24 · ex05198 · tag OPERACAO-ERRO-MANUAL · impacto D
> Válvula fechada indevidamente. Erro operacional por falta de treinamento ou desatenção.

  Modo de falha      A) ELP Vaz.ext.processo   B) NOO Sem saída   C) AIR Leitura anormal   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 6.3 Outro   B) 1.4 Deformação   C) 6.2 Causas combinadas   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 6 Interf. produção   B) 5 Monitor. contínuo   C) 10 Outro   D) — Nenhuma destas (anote o código se souber)

### NOTA 25 · ex05293 · tag BOMBA-ROTOR-CL-05 · impacto S
> Rotor corroído. Bombeamento de água do mar com material 304.

  Modo de falha      A) STD Def. estrutural   B) FTF Falha funcionar   C) PDE Desvio parâmetro   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 2.14 Cloretos   B) 2.8 Estouro   C) 3.1 Falha controle   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 2 Teste funcional   B) 3 Inspeção   C) 1 Manut. periódica   D) — Nenhuma destas (anote o código se souber)

### NOTA 26 · ex05303 · tag SENSOR-PRESSAO-SEM-SINAL-05 · impacto D
> Pressão indica zero. Conector do sensor solto.

  Modo de falha      A) NOO Sem saída   B) FTF Falha funcionar   C) VIB Vibração   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 3.2 Sem sinal   B) 2.12 Parafusos degrad.   C) 3.1 Falha controle   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 8 Manut. corretiva   B) 2 Teste funcional   C) 5 Monitor. contínuo   D) — Nenhuma destas (anote o código se souber)

### NOTA 27 · ex05785 · tag TANQUE-DEFORMACAO-VACUO · impacto D
> Tanque deformou. Válvula de vácuo travada na descarga.

  Modo de falha      A) STC Def.estrut.contenção   B) ELP Vaz.ext.processo   C) PLU Entupido   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 1.12 Colapso carcaça   B) 6.2 Causas combinadas   C) 1.13 Arrancamento do.   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 9 Sob demanda   B) 1 Manut. periódica   C) 6 Interf. produção   D) — Nenhuma destas (anote o código se souber)

### NOTA 28 · ex05892 · tag SENSOR-CORROSAO-POCO · impacto U
> Sem dados de corrosão. Probe consumida ou falha.

  Modo de falha      A) WCL Comun.poço-linha   B) SER Probl. menores   C) FTI Falha função   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 2.17 Degradação natural   B) 2.10 Trinca   C) 5.6 Vão livre   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 5 Monitor. contínuo   B) 10 Outro   C) 2 Teste funcional   D) — Nenhuma destas (anote o código se souber)

### NOTA 29 · ex06399 · tag ATUADOR-ELETRICO-CAPACITOR · impacto D
> Válvula motorizada não parte. Capacitor de partida do motor monofásico estufado.

  Modo de falha      A) ELP Vaz.ext.processo   B) STD Def. estrutural   C) FTF Falha funcionar   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 6.3 Outro   B) 2.1 Cavitação   C) 2.17 Degradação natural   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 9 Sob demanda   B) 3 Inspeção   C) 7 Observ. casual   D) — Nenhuma destas (anote o código se souber)

### NOTA 30 · ex06647 · tag CARREGADEIRA-PNEU-CORTE · impacto D
> Pneu dianteiro com corte lateral profundo. Rocha afiada na praça de carregamento (falha de limpeza de pista).

  Modo de falha      A) STD Def. estrutural   B) OHE Superaquecimento   C) BRD Quebra/colapso   D) — Nenhuma destas (anote o código se souber)
  Mecanismo          A) 3.4 Desajustado   B) 5.3 Influência externa   C) 5.4 Incrustação.   D) — Nenhuma destas (anote o código se souber)
  Método de detecção A) 9 Sob demanda   B) 6 Interf. produção   C) 1 Manut. periódica   D) — Nenhuma destas (anote o código se souber)
