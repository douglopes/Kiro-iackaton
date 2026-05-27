# 🏆 Kiro Hackathon - Sistema de Avaliação

App web para avaliação de projetos do Kiro Hackathon. Permite cadastrar projetos, registrar avaliadores e atribuir notas com critérios ponderados.

## Funcionalidades

- **Registro de avaliadores** (por nome)
- **Cadastro de projetos** (título, descrição, participante)
- **Avaliação com 5 critérios ponderados:**
  | Critério | Peso |
  |----------|------|
  | Impacto no negócio | 30% |
  | Uso efetivo do Kiro no desenvolvimento | 25% |
  | Viabilidade de implementação | 20% |
  | Inovação e criatividade | 15% |
  | Qualidade da apresentação | 10% |
- **Ranking geral** com média ponderada de todos os avaliadores

## Stack

- **Frontend:** HTML/CSS/JS (vanilla, mobile-first)
- **Backend:** Node.js + Express
- **Banco de dados:** PostgreSQL 16
- **Infra:** Docker + Docker Compose

---

## Rodar Localmente

```bash
docker-compose up --build
```

Acesse: http://localhost:3000

---

## Deploy na AWS (EC2 + Docker)

### Pré-requisitos

- Conta AWS ativa
- AWS CLI configurado (`aws configure`)
- Par de chaves SSH criado na AWS (ex: `kiro-hackathon-key.pem`)

### Passo 1 — Criar instância EC2

1. Acesse o console AWS → EC2 → **Launch Instance**
2. Configure:
   - **Nome:** `kiro-hackathon`
   - **AMI:** Amazon Linux 2023 (ou Ubuntu 22.04)
   - **Tipo:** `t3.micro` (free tier) ou `t3.small`
   - **Key Pair:** selecione sua chave SSH
   - **Security Group:** libere as portas:
     - `22` (SSH)
     - `80` (HTTP)
     - `3000` (App — ou redirecionar via 80)
3. Clique em **Launch**

### Passo 2 — Conectar na instância

```bash
chmod 400 kiro-hackathon-key.pem
ssh -i kiro-hackathon-key.pem ec2-user@<IP_PUBLICO>
```

### Passo 3 — Instalar Docker na EC2

**Amazon Linux 2023:**
```bash
sudo yum update -y
sudo yum install -y docker git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Re-login para grupo docker funcionar
exit
```

Reconecte via SSH.

### Passo 4 — Clonar e subir o projeto

```bash
git clone https://github.com/douglopes/Kiro-iackaton.git
cd Kiro-iackaton
docker-compose up -d --build
```

### Passo 5 — Acessar o app

Acesse no browser: `http://<IP_PUBLICO>:3000`

Para usar porta 80 (sem :3000), altere no `docker-compose.yml`:
```yaml
ports:
  - "80:3000"
```

### Passo 6 — (Opcional) Configurar domínio

1. No **Route 53** (ou seu DNS), crie um registro A apontando para o IP público da EC2
2. Para HTTPS, instale o **Nginx** como reverse proxy + **Certbot** (Let's Encrypt)

---

## Deploy Alternativo — AWS ECS (Fargate)

Para produção escalável sem gerenciar servidores:

1. **Criar repositório ECR:**
```bash
aws ecr create-repository --repository-name kiro-hackathon
```

2. **Push da imagem:**
```bash
aws ecr get-login-password | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com
docker build -t kiro-hackathon -f backend/Dockerfile .
docker tag kiro-hackathon:latest <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/kiro-hackathon:latest
docker push <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/kiro-hackathon:latest
```

3. **Criar cluster ECS + serviço Fargate** com task definition apontando para a imagem ECR
4. **RDS PostgreSQL** para o banco em produção (recomendado em vez de container)
5. **Application Load Balancer** na frente para HTTPS

---

## Variáveis de Ambiente

| Variável | Descrição | Default |
|----------|-----------|---------|
| `DB_HOST` | Host do PostgreSQL | `db` |
| `DB_PORT` | Porta do PostgreSQL | `5432` |
| `DB_NAME` | Nome do banco | `kiro_hackathon` |
| `DB_USER` | Usuário do banco | `postgres` |
| `DB_PASSWORD` | Senha do banco | `postgres123` |
| `PORT` | Porta do servidor | `3000` |

> ⚠️ **Em produção**, altere `DB_PASSWORD` para uma senha segura!

---

## Estrutura do Projeto

```
Kiro-iackaton/
├── docker-compose.yml
├── .dockerignore
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js
│       ├── database.js
│       └── routes.js
└── frontend/
    ├── index.html
    ├── styles.css
    └── app.js
```
