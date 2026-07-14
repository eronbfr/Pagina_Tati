#!/usr/bin/env python3
"""
PTEC - Plugin de coleta de logs de roteadores Nokia via Jumpserver.

Conecta aos roteadores Nokia através de um jumpserver, executa uma lista de
comandos e gera um PDF com os outputs coletados.
"""

import argparse
import csv
import os
import re
import sys
import time
from datetime import datetime

import paramiko
import yaml
from fpdf import FPDF


def load_jumpserver_config(yml_path):
    """Carrega configurações do jumpserver a partir de um arquivo YAML."""
    with open(yml_path, "r", encoding="utf-8") as f:
        config = yaml.safe_load(f)

    jump_cfg = config["jumpserver"]
    # Permite usar variável de ambiente para a senha
    if not jump_cfg.get("password"):
        jump_cfg["password"] = os.environ.get("JUMP_PASSWORD", "")

    return jump_cfg


def load_routers(csv_path):
    """Carrega lista de roteadores a partir de um arquivo CSV."""
    routers = []
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            routers.append(row)
    return routers


def load_commands(txt_path):
    """Carrega lista de comandos a partir de um arquivo TXT."""
    commands = []
    with open(txt_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#"):
                commands.append(line)
    return commands


def connect_jumpserver(jump_cfg):
    """Estabelece conexão SSH com o jumpserver."""
    jump_client = paramiko.SSHClient()
    # AutoAddPolicy é aceitável neste contexto de automação de rede onde os
    # dispositivos não possuem host keys pré-distribuídas.
    jump_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())  # noqa: S507
    jump_client.connect(
        hostname=jump_cfg["host"],
        port=jump_cfg.get("port", 22),
        username=jump_cfg["username"],
        password=jump_cfg["password"],
        timeout=30,
    )
    return jump_client


def connect_router(jump_client, router):
    """Conecta a um roteador Nokia via jumpserver usando port forwarding."""
    jump_transport = jump_client.get_transport()
    dest_addr = (router["ip"], 22)
    local_addr = ("127.0.0.1", 0)

    channel = jump_transport.open_channel(
        "direct-tcpip", dest_addr, local_addr
    )

    router_client = paramiko.SSHClient()
    # AutoAddPolicy é aceitável neste contexto de automação de rede onde os
    # dispositivos não possuem host keys pré-distribuídas.
    router_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())  # noqa: S507
    router_client.connect(
        hostname=router["ip"],
        username=router["username"],
        password=router["password"],
        sock=channel,
        timeout=30,
    )
    return router_client


def execute_commands(router_client, commands, timeout=60):
    """
    Executa comandos no roteador Nokia via shell interativo.

    Roteadores Nokia SROS usam shell interativo, por isso utilizamos
    invoke_shell ao invés de exec_command.
    """
    results = {}
    shell = router_client.invoke_shell(width=200, height=1000)
    time.sleep(2)
    # Limpa o buffer inicial
    if shell.recv_ready():
        shell.recv(65535)

    # Desabilita paginação
    shell.send("environment no more\n")
    time.sleep(1)
    if shell.recv_ready():
        shell.recv(65535)

    for cmd in commands:
        shell.send(cmd + "\n")
        time.sleep(2)

        output = ""
        end_time = time.time() + timeout
        while time.time() < end_time:
            if shell.recv_ready():
                chunk = shell.recv(65535).decode("utf-8", errors="replace")
                output += chunk
                # Verifica se retornou ao prompt (padrão Nokia SROS)
                if re.search(r"[A-Z]:\S+#\s*$", output):
                    break
            else:
                time.sleep(0.5)

        # Remove a linha do comando e o prompt final
        lines = output.splitlines()
        if lines and cmd in lines[0]:
            lines = lines[1:]
        if lines and re.search(r"[A-Z]:\S+#\s*$", lines[-1]):
            lines = lines[:-1]

        results[cmd] = "\n".join(lines)

    shell.close()
    return results


def sanitize_text(text):
    """Remove caracteres não suportados pelo PDF (latin-1)."""
    return text.encode("latin-1", errors="replace").decode("latin-1")


def generate_pdf(all_results, output_path):
    """Gera um PDF com os outputs coletados de todos os roteadores."""
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Página de capa
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 60, "", ln=True)
    pdf.cell(0, 10, "PTEC - Coleta de Logs", ln=True, align="C")
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 10, f"Data: {datetime.now().strftime('%d/%m/%Y %H:%M')}", ln=True, align="C")
    pdf.cell(0, 10, f"Roteadores: {len(all_results)}", ln=True, align="C")

    for router_name, commands_output in all_results.items():
        # Página separadora por roteador
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, sanitize_text(f"Roteador: {router_name}"), ln=True)
        pdf.set_font("Helvetica", "", 8)
        pdf.cell(0, 6, f"Coletado em: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", ln=True)
        pdf.ln(5)

        for cmd, output in commands_output.items():
            # Cabeçalho do comando
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_fill_color(200, 200, 200)
            pdf.cell(0, 7, sanitize_text(f"# {cmd}"), ln=True, fill=True)
            pdf.set_font("Courier", "", 7)

            # Output do comando
            for line in output.splitlines():
                safe_line = sanitize_text(line)
                pdf.cell(0, 3.5, safe_line, ln=True)

            pdf.ln(3)

    pdf.output(output_path)
    return output_path


def main():
    """Função principal do script PTEC."""
    parser = argparse.ArgumentParser(
        description="PTEC - Coleta de logs de roteadores Nokia e gera PDF"
    )
    parser.add_argument(
        "--jumpserver", "-j",
        default="config/jumpserver.yml",
        help="Caminho do arquivo YAML com configuração do jumpserver",
    )
    parser.add_argument(
        "--routers", "-r",
        default="config/routers.csv",
        help="Caminho do arquivo CSV com lista de roteadores",
    )
    parser.add_argument(
        "--commands", "-c",
        default="config/commands.txt",
        help="Caminho do arquivo TXT com lista de comandos",
    )
    parser.add_argument(
        "--output", "-o",
        default="output",
        help="Diretório de saída para os PDFs gerados",
    )
    args = parser.parse_args()

    # Carrega configurações
    print("[*] Carregando configurações...")
    jump_cfg = load_jumpserver_config(args.jumpserver)
    routers = load_routers(args.routers)
    commands = load_commands(args.commands)

    print(f"[*] Jumpserver: {jump_cfg['host']}")
    print(f"[*] Roteadores: {len(routers)}")
    print(f"[*] Comandos: {len(commands)}")

    # Cria diretório de saída
    os.makedirs(args.output, exist_ok=True)

    # Conecta ao jumpserver
    print("[*] Conectando ao jumpserver...")
    jump_client = connect_jumpserver(jump_cfg)
    print("[+] Conectado ao jumpserver com sucesso!")

    all_results = {}

    for router in routers:
        router_name = router["hostname"]
        print(f"\n[*] Conectando ao roteador {router_name} ({router['ip']})...")

        try:
            router_client = connect_router(jump_client, router)
            print(f"[+] Conectado ao {router_name}")

            print(f"[*] Executando {len(commands)} comandos...")
            results = execute_commands(router_client, commands)
            all_results[router_name] = results

            print(f"[+] Coleta finalizada para {router_name}")
            router_client.close()

        except Exception as e:
            print(f"[-] Erro ao conectar/coletar do {router_name}: {e}")
            all_results[router_name] = {
                cmd: f"ERRO: Não foi possível coletar - {e}" for cmd in commands
            }

    # Gera PDF
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    pdf_filename = f"PTEC_coleta_{timestamp}.pdf"
    pdf_path = os.path.join(args.output, pdf_filename)

    print(f"\n[*] Gerando PDF: {pdf_path}")
    generate_pdf(all_results, pdf_path)
    print(f"[+] PDF gerado com sucesso: {pdf_path}")

    # Fecha conexão com jumpserver
    jump_client.close()
    print("[*] Conexões encerradas. Processo finalizado.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
