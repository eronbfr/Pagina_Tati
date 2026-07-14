# PTEC

Plugin que coleta logs de roteadores Nokia (SROS) via jumpserver e gera PDF para fechamento PTEC.

## Funcionalidades

- Conecta a roteadores Nokia via SSH através de um jumpserver
- Lê lista de comandos de um arquivo TXT
- Lê lista de roteadores alvo de um arquivo CSV
- Lê configurações do jumpserver de um arquivo YAML
- Gera PDF com todos os outputs coletados

## Estrutura do Projeto

```
PTEC/
├── ptec_collector.py       # Script principal
├── requirements.txt        # Dependências Python
├── config/
│   ├── jumpserver.yml      # Configuração do jumpserver
│   ├── routers.csv         # Lista de roteadores alvo
│   └── commands.txt        # Comandos a serem executados
└── output/                 # PDFs gerados
```

## Instalação

```bash
pip install -r requirements.txt
```

## Configuração

### 1. Jumpserver (`config/jumpserver.yml`)

Configure o endereço e credenciais do jumpserver:

```yaml
jumpserver:
  host: "10.0.0.1"
  port: 22
  username: "usuario"
  password: "senha"
```

Alternativamente, defina a variável de ambiente `JUMP_PASSWORD` e deixe o campo password vazio.

### 2. Roteadores (`config/routers.csv`)

Liste os roteadores no formato CSV:

```csv
hostname,ip,username,password
ROUTER-01,192.168.1.1,admin,admin123
ROUTER-02,192.168.1.2,admin,admin123
```

### 3. Comandos (`config/commands.txt`)

Liste os comandos a serem executados (um por linha):

```
show router interface
show port
show system information
```

Linhas começando com `#` são ignoradas.

## Uso

```bash
# Uso com configurações padrão (lê de config/)
python ptec_collector.py

# Especificando caminhos personalizados
python ptec_collector.py \
  --jumpserver config/jumpserver.yml \
  --routers config/routers.csv \
  --commands config/commands.txt \
  --output output/
```

## Argumentos

| Argumento | Curto | Padrão | Descrição |
|-----------|-------|--------|-----------|
| `--jumpserver` | `-j` | `config/jumpserver.yml` | Arquivo YAML do jumpserver |
| `--routers` | `-r` | `config/routers.csv` | Arquivo CSV dos roteadores |
| `--commands` | `-c` | `config/commands.txt` | Arquivo TXT dos comandos |
| `--output` | `-o` | `output/` | Diretório de saída dos PDFs |

## Output

O PDF gerado contém:
- Página de capa com data e quantidade de roteadores
- Uma seção por roteador com todos os outputs dos comandos
- Formatação monoespaçada para preservar o layout dos outputs
