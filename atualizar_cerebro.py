import pandas as pd
import os
# Importa seu script de treinamento anterior como se fosse uma biblioteca
# (Certifique-se de que o código de treinamento que te passei antes está salvo como 'treinar_local.py')
# Se não quiser importar, basta copiar e colar o código de treinamento aqui de novo.

print("--- INICIANDO ATUALIZAÇÃO DO MODELO ---")

arquivo_original = 'data.csv'
arquivo_novos = 'novos_dados_treino.csv'

if not os.path.exists(arquivo_novos):
    print("Nenhum feedback novo encontrado. O modelo já está atualizado.")
    exit()

# 1. Carregar os dados
print("Carregando dados originais...")
df_orig = pd.read_csv(arquivo_original)

print("Carregando novos feedbacks...")
df_novos = pd.read_csv(arquivo_novos)
print(f"Encontrados {len(df_novos)} novos exemplos aprendidos com o usuário.")

# 2. Juntar tudo
df_completo = pd.concat([df_orig, df_novos], ignore_index=True)

# 3. Salvar o novo "Dataset Mestre" (Backup do antigo e salva o novo)
df_orig.to_csv('data_backup_antes_update.csv', index=False)
df_completo.to_csv('data.csv', index=False) 
print("Base de dados principal (data.csv) atualizada com sucesso!")

# 4. Apagar o arquivo temporário de feedback (para não duplicar na próxima)
os.remove(arquivo_novos)
print("Limpando arquivo temporário de feedback...")

print("--- AGORA RODANDO O RE-TREINAMENTO ---")
# Aqui chamamos o script de treinamento que criamos no passo anterior
os.system("python treinar_local.py")

print("\n✅ CICLO COMPLETO! O modelo foi atualizado e aprendeu com os erros.")
print("Reinicie o site Streamlit para carregar a nova versão do cérebro.")
