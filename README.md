# FURNIMUSIC — Deploy no VPS com Supabase Auth

## Arquitetura
```
Usuário → Login Google/GitHub (Supabase)
        → JWT token enviado ao server.js
        → server.js valida JWT e chama a IA (Claude/ChatGPT/Gemini)
        → Prompt retornado ao frontend
```

---

## 1. Criar projeto no Supabase (grátis)

1. Acesse https://supabase.com e crie um projeto
2. Vá em **Authentication → Providers** e ative:
   - **Google** — crie credenciais em https://console.cloud.google.com (OAuth 2.0)
   - **GitHub** — crie OAuth App em https://github.com/settings/developers
3. No Google/GitHub, coloque como Redirect URL:
   ```
   https://SEU_PROJECT_ID.supabase.co/auth/v1/callback
   ```
4. Anote as seguintes variáveis em **Project Settings → API**:
   - `Project URL` → SUPABASE_URL
   - `anon public` → SUPABASE_ANON_KEY
   - `JWT Secret` (em Settings → API → JWT Settings) → SUPABASE_JWT_SECRET

---

## 2. Configurar o frontend

Edite `/public/index.html` e substitua no topo do `<script>`:

```js
const SUPABASE_URL      = 'https://SEU_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';
```

---

## 3. Configurar o VPS

```bash
# Copiar para o servidor
scp -r furnimusic-server/ usuario@seu-servidor:/var/www/furnimusic
ssh usuario@seu-servidor
cd /var/www/furnimusic

# Instalar dependências
npm install

# Criar .env
cp .env.example .env
nano .env
```

Preencha o `.env`:
```
SUPABASE_JWT_SECRET=cole-o-jwt-secret-do-supabase-aqui

ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-proj-...
GEMINI_API_KEY=AIza...

PORT=3000
```

---

## 4. Rodar em produção com PM2

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

---

## 5. Nginx + SSL (domínio próprio)

```nginx
server {
    listen 80;
    server_name seudominio.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo certbot --nginx -d seudominio.com
```

---

## Fluxo completo de autenticação

1. Usuário clica "Continuar com Google" ou "Continuar com GitHub"
2. Supabase redireciona para OAuth do provider
3. Após login, Supabase emite um **JWT token** para o browser
4. O frontend envia esse token no header `Authorization: Bearer <token>` em cada request
5. O `server.js` verifica o JWT com `SUPABASE_JWT_SECRET` — se inválido, retorna 401
6. Se válido, chama a IA e retorna o prompt

**Sua API key nunca toca o frontend. Só usuários autenticados podem usar.**

---

## Comandos úteis PM2

```bash
pm2 status
pm2 logs furnimusic
pm2 restart furnimusic
```
